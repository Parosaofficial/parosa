// Parosa — Kitchen Display (migration 0018).
//
// The kitchen screen has its own sign-in (Restaurant ID + the restaurant's
// registered mobile + a one-time code) and reads open orders through
// token-checked database functions. Cooks move an
// order New → Cooking → Ready, tick items one by one, and can recall an order
// they marked served by mistake. The database stamps cooking/ready/served
// times, so Overview, the waiter's phone and the guest all see the same thing.

import { supabase } from "./supabase";
import type { StaffSession } from "./types";

export type KitchenStatus = "new" | "cooking" | "ready" | "served";

export type KitchenItem = { id: string; name: string; qty: number; done: boolean; category_id: string | null; is_veg: boolean | null };

export type KitchenOrder = {
  id: string;
  order_no: string | null;
  status: KitchenStatus;
  note: string | null;
  table_number: string | null;
  table_name: string | null;
  staff_name: string | null;      // taken on the POS by…
  waiter_name: string | null;     // the table's waiter (first name)
  created_at: string;
  cooking_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  items: KitchenItem[];
};

/** A kitchen station: the menu categories it cooks. */
export type Station = { name: string; categories: string[] };

export type KitchenBoard = { orders: KitchenOrder[]; recent: KitchenOrder[]; stations: Station[]; amber_min: number; red_min: number };

/* ---------------- kitchen sign-in (separate from staff) ---------------- */

/** This tablet's kitchen sign-in: Restaurant ID + registered mobile + OTP → a device token. */
export type KitchenSession = { restaurant_id: string; slug: string; restaurant_name: string; token: string };

const KEY = "parosa-kitchen";
export function loadKitchenSession(): KitchenSession | null {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as KitchenSession) : null; } catch { return null; }
}
export function saveKitchenSession(s: KitchenSession) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
export function clearKitchenSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export type OtpRequest =
  | { ok: true; restaurant_name: string; phone_end: string; via: "whatsapp" | "dashboard" }
  | { ok: false; error: "nomatch" | "toomany" | "offline" };

/** Step 1 — sends the code (WhatsApp when connected, else it shows on the owner's Kitchen display page). */
export async function requestKitchenOtp(restaurantId: string, phone: string): Promise<OtpRequest> {
  try {
    const r = await fetch("/api/kitchen/otp", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: restaurantId, phone }),
    });
    return (await r.json()) as OtpRequest;
  } catch { return { ok: false, error: "offline" }; }
}

export type OtpVerify = { ok: true; session: KitchenSession } | { ok: false; error: "nomatch" | "expired" | "wrong" | "offline"; left?: number };

/** Step 2 — the 6-digit code → this tablet is signed in. */
export async function verifyKitchenOtp(restaurantId: string, phone: string, code: string): Promise<OtpVerify> {
  const { data, error } = await supabase.rpc("kitchen_verify_otp", { p_slug: restaurantId, p_phone: phone, p_code: code });
  if (error || !data) return { ok: false, error: "offline" };
  const d = data as { ok: boolean; error?: "nomatch" | "expired" | "wrong"; left?: number; token?: string; restaurant_id?: string; restaurant_name?: string; slug?: string };
  if (!d.ok || !d.token) return { ok: false, error: d.error ?? "wrong", left: d.left };
  return { ok: true, session: { token: d.token, restaurant_id: d.restaurant_id!, restaurant_name: d.restaurant_name!, slug: d.slug! } };
}

export async function kitchenSignOut(s: KitchenSession) {
  await supabase.rpc("kitchen_sign_out", { p_restaurant: s.restaurant_id, p_token: s.token });
  clearKitchenSession();
}

/* ---------------- the kitchen screen ---------------- */

const args = (s: KitchenSession) => ({ p_restaurant: s.restaurant_id, p_token: s.token });

/** null = signed out (the owner removed this screen) or the database isn't updated yet. */
export async function kitchenBoard(s: KitchenSession): Promise<KitchenBoard | null> {
  const { data, error } = await supabase.rpc("kitchen_orders", args(s));
  if (error || !data) return null;
  const b = data as KitchenBoard;
  return { orders: b.orders ?? [], recent: b.recent ?? [], stations: b.stations ?? [], amber_min: b.amber_min || 10, red_min: b.red_min || 20 };
}

export async function kitchenSetStatus(s: KitchenSession, orderId: string, status: KitchenStatus) {
  const { data, error } = await supabase.rpc("kitchen_set_status", { ...args(s), p_order: orderId, p_status: status });
  if (error || data === false) throw error ?? new Error("not allowed");
}

export async function kitchenItemDone(s: KitchenSession, itemId: string, done: boolean) {
  const { data, error } = await supabase.rpc("kitchen_item_done", { ...args(s), p_item: itemId, p_done: done });
  if (error || data === false) throw error ?? new Error("not allowed");
}

/* ---------------- waiter's phone: food ready ---------------- */

export type ReadyFood = { order_id: string; order_no: string | null; ready_at: string; table_name: string | null; mine: boolean };

const staffArgs = (s: StaffSession) => ({ p_restaurant: s.restaurant_id, p_code: s.code, p_staff: s.staff_id });

export async function staffReady(s: StaffSession): Promise<ReadyFood[]> {
  const { data, error } = await supabase.rpc("staff_ready", staffArgs(s));
  if (error || !Array.isArray(data)) return [];
  return data as ReadyFood[];
}

/** The waiter picked up a ready order. */
export async function staffServed(s: StaffSession, orderId: string) {
  const { data, error } = await supabase.rpc("staff_served", { ...staffArgs(s), p_order: orderId });
  if (error || data === false) throw error ?? new Error("not allowed");
}

/* ---------------- owner: stations + timer colours ---------------- */

export async function saveKitchenSettings(restaurantId: string, p: { kitchen_stations?: Station[]; kds_amber_min?: number; kds_red_min?: number }) {
  const { error } = await supabase.from("restaurants").update(p).eq("id", restaurantId);
  if (error) throw error;
}

/* ---------------- owner: kitchen sign-in codes + signed-in screens ---------------- */

export type KitchenOtp = { id: string; code: string; created_at: string; expires_at: string; sent_whatsapp: boolean };
export type KitchenDevice = { id: string; name: string; created_at: string; last_seen: string };

/** The newest unused kitchen sign-in code (shown to the owner until WhatsApp is connected). null when none. */
export async function pendingKitchenOtp(restaurantId: string): Promise<KitchenOtp | null> {
  const { data, error } = await supabase.from("kitchen_otps")
    .select("id, code, created_at, expires_at, sent_whatsapp")
    .eq("restaurant_id", restaurantId).eq("used", false).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1);
  if (error || !data?.length) return null;
  return data[0] as KitchenOtp;
}

export async function kitchenDevices(restaurantId: string): Promise<KitchenDevice[] | null> {
  const { data, error } = await supabase.from("kitchen_devices").select("id, name, created_at, last_seen")
    .eq("restaurant_id", restaurantId).order("created_at");
  if (error) return null;   // null = database not updated yet
  return data as KitchenDevice[];
}

export async function removeKitchenDevice(id: string) {
  const { error } = await supabase.from("kitchen_devices").delete().eq("id", id);
  if (error) throw error;
}

/** What a station screen shows of an order: only its own categories (all items when no station is chosen). */
export function forStation(o: KitchenOrder, station: Station | null): KitchenItem[] {
  if (!station) return o.items;
  return o.items.filter((i) => i.category_id && station.categories.includes(i.category_id));
}

/** Where the order came from, for the ticket header. */
export function orderSource(o: KitchenOrder): string {
  if (o.items.some((i) => i.name.startsWith("Custom: "))) return "Custom";
  if (o.staff_name) return `POS · ${o.staff_name.split(" ")[0]}`;
  return "QR";
}

export const tableTitle = (o: KitchenOrder) => o.table_name ?? (o.table_number ? `Table ${o.table_number}` : "Counter");
