// Parosa — tables (with types) and live table sessions (migration 0015).
//
// A guest scan opens or joins the table's session; it closes when the owner
// confirms payment, frees the table, or after a few quiet hours. The location
// check and the auto-close run inside the database (table_session_join /
// table_sessions_sweep), so a browser can't skip them.

import { supabase } from "./supabase";

export type TableShape = "two" | "four" | "sofa";

export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  code: string;          // in the QR link: /<slug>/menu/<code>
  name: string;          // T1, F1…
  kind: string;          // 2-seater, 4-seater, Family sofa, or a custom label
  seats: number;
  shape: TableShape;
  area: string | null;
  active: boolean;
  sort: number;
  // Seat Reserve floor plan (0016)
  on_floor?: boolean;
  floor_slot?: number;   // order inside its hall (area)
  bookable?: boolean;
  book_price?: number;
};

export type TableSession = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_code: string;
  code: string;          // S-7K2Q
  status: "open" | "closed";
  phones: number;
  waiter_id: string | null;
  opened_at: string;
  last_activity_at: string;
  closed_at: string | null;
  close_reason: "paid" | "freed" | "timeout" | null;
  payment_method: string | null;
  // 0016: the guest's requests + a booking charge when the table was reserved
  waiter_call_at?: string | null;
  bill_asked_at?: string | null;
  booking_charge?: number;
  reservation_id?: string | null;
};

/** The built-in table types; owners can also type their own label. */
export const TABLE_KINDS: { kind: string; seats: number; shape: TableShape }[] = [
  { kind: "2-seater", seats: 2, shape: "two" },
  { kind: "4-seater", seats: 4, shape: "four" },
  { kind: "Family sofa", seats: 8, shape: "sofa" },
];

/** What a table is called on standees and the dashboard: "Table 3" for a plain number, else its name (F1, Rooftop 2). */
export const tableLabel = (t: { name: string }) => (/^\d+$/.test(t.name.trim()) ? `Table ${t.name.trim()}` : t.name.trim());

/** Shape for a custom type: sofa for 6+ seats, otherwise by size. */
export const shapeFor = (seats: number): TableShape => (seats >= 6 ? "sofa" : seats <= 2 ? "two" : "four");

/* ---------------- owner: tables ---------------- */

export async function listTables(restaurantId: string): Promise<RestaurantTable[]> {
  const { data, error } = await supabase.from("restaurant_tables").select("*")
    .eq("restaurant_id", restaurantId).order("sort").order("created_at");
  if (error) throw error;
  return (data ?? []) as RestaurantTable[];
}

export async function addTable(restaurantId: string, t: { code: string; name: string; kind: string; seats: number; shape: TableShape; area: string | null; sort: number; on_floor?: boolean; floor_slot?: number }) {
  const { data, error } = await supabase.from("restaurant_tables")
    .insert({ restaurant_id: restaurantId, ...t }).select().single();
  if (error) throw error;
  return data as RestaurantTable;
}

export async function updateTable(id: string, patch: Partial<Pick<RestaurantTable, "name" | "kind" | "seats" | "shape" | "area" | "active" | "sort" | "on_floor" | "floor_slot" | "bookable" | "book_price">>) {
  const { error } = await supabase.from("restaurant_tables").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTable(id: string) {
  const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Next QR code: one more than the highest number this restaurant ever used.
 * `hi` (restaurants.table_code_hi, 0016) remembers deleted tables, so an old
 * printed QR never ends up pointing at a different table.
 */
export function nextCode(tables: RestaurantTable[], hi = 0): string {
  const max = tables.reduce((m, t) => Math.max(m, Number.parseInt(t.code, 10) || 0), hi);
  return String(max + 1);
}

/* ---------------- owner: sessions ---------------- */

/** Close quiet sessions first, then return the open ones. */
export async function listOpenSessions(restaurantId: string): Promise<TableSession[]> {
  await supabase.rpc("table_sessions_sweep", { p_restaurant: restaurantId });
  const { data, error } = await supabase.from("table_sessions").select("*")
    .eq("restaurant_id", restaurantId).eq("status", "open").order("opened_at");
  if (error) throw error;
  return (data ?? []) as TableSession[];
}

export async function assignWaiter(sessionId: string, staffId: string | null) {
  const { error } = await supabase.from("table_sessions").update({ waiter_id: staffId }).eq("id", sessionId);
  if (error) throw error;
}

/** Payment received: marks every order paid (stamp cards get their tick) and frees the table. */
export async function closeSession(sessionId: string, method: "UPI" | "Cash") {
  const { error } = await supabase.rpc("table_session_close", { p_session: sessionId, p_method: method });
  if (error) throw error;
}

/** Free the table without payment (guests left, wrong scan). Unpaid orders stay unpaid. */
export async function freeSession(sessionId: string) {
  const { error } = await supabase.rpc("table_session_free", { p_session: sessionId });
  if (error) throw error;
}

/** A waiter went to the table that called. */
export async function clearWaiterCall(sessionId: string) {
  const { error } = await supabase.from("table_sessions").update({ waiter_call_at: null }).eq("id", sessionId);
  if (error) throw error;
}

/* ---------------- guest ---------------- */

export type JoinResult =
  | { status: "ok" | "joined" | "new"; session_id: string; code: string; table_name: string; kind: string; phones: number }
  | { status: "far"; distance_m: number; table_name: string }
  | { status: "need_location"; table_name: string }
  | { status: "off"; table_name: string }   // the owner turned this table off — same link, no orders for now
  | { status: "unknown" }                   // a QR for a table that was deleted
  | { status: "no_table" };

/** Open or join the table's session. Pass the phone's location when the restaurant asks for it. */
export async function joinSession(restaurantId: string, table: string, at: { lat: number; lng: number } | null, prev: string | null): Promise<JoinResult | null> {
  const { data, error } = await supabase.rpc("table_session_join", {
    p_restaurant: restaurantId, p_table: table, p_lat: at?.lat ?? null, p_lng: at?.lng ?? null, p_session: prev,
  });
  if (error) return null; // migration 0015 not applied yet → menu works without sessions
  return data as JoinResult;
}

export type SessionStatus = { status: "open" | "closed"; close_reason: string | null; bill_asked?: boolean };
export async function sessionStatus(sessionId: string): Promise<SessionStatus | null> {
  const { data, error } = await supabase.rpc("table_session_status", { p_session: sessionId });
  if (error || !data) return null;
  return data as SessionStatus;
}

/** Ring the staff from the guest's phone: a waiter, or the bill. */
export async function requestHelp(sessionId: string, kind: "waiter" | "bill") {
  const { error } = await supabase.rpc("table_session_request", { p_session: sessionId, p_kind: kind });
  if (error) throw error;
}

export type SessionBill = {
  code: string;
  status: "open" | "closed";
  booking_charge: number;
  bill_asked: boolean;
  orders: { order_no: string | null; total: number; status: string; items: { name: string; qty: number; price: number }[] }[];
};
/** The whole table's bill so far — the same on every phone at the table. */
export async function sessionBill(sessionId: string): Promise<SessionBill | null> {
  const { data, error } = await supabase.rpc("table_session_bill", { p_session: sessionId });
  if (error || !data) return null;
  return data as SessionBill;
}

/** The phone's own session per restaurant + table, so reopening the menu doesn't re-check location. */
const KEY = "parosa-table-session";
export function rememberedSession(slug: string, table: string): string | null {
  try { return (JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>)[`${slug}/${table}`] ?? null; } catch { return null; }
}
export function rememberSession(slug: string, table: string, id: string | null) {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
    if (id) m[`${slug}/${table}`] = id; else delete m[`${slug}/${table}`];
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch { /* private mode */ }
}

/** Ask the phone for its location (high accuracy, fresh). */
export function currentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
