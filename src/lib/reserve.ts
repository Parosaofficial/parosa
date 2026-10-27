// Parosa — Seat Reserve (migration 0016).
//
// Owners place their tables on a floor plan and give each a booking price.
// Customers open the permanent link /<slug>/book, see which tables are
// occupied right now (live table sessions) or already booked for their time,
// and book one. No money is taken up front: the booking charge is added to the
// table bill when the owner seats the guests.

import { supabase } from "./supabase";
import type { TableShape } from "./tables";

export type Reservation = {
  id: string;
  restaurant_id: string;
  table_id: string;
  code: string;          // B-4K7Q
  guest_name: string;
  phone: string;
  people: number;
  note: string | null;
  starts_at: string;
  ends_at: string;
  price: number;
  status: "booked" | "seated" | "cancelled" | "noshow";
  created_at: string;
};

export type Entry = "top" | "bottom" | "left" | "right";
export type Hall = { name: string; entry: Entry };

export type FloorTable = {
  id: string; name: string; kind: string; seats: number; shape: TableShape; area: string | null;
  slot: number; price: number; bookable: boolean;
  occupied: boolean;     // guests at the table right now
  booked: boolean;       // someone booked it for the chosen time
};

export type FloorInfo = {
  reserve_on: boolean; hold_min: number; days: number; from: string; to: string;
  halls: Hall[];
  tables: FloorTable[];
};

export type ReserveSettings = { reserve_on: boolean; reserve_hold_min: number; reserve_days: number; reserve_from: string; reserve_to: string; floor_halls: Hall[] };

export const DEFAULT_HALL = "Main hall";

/**
 * Halls in order with their tables. A table whose area isn't a saved hall
 * goes into a hall named after its area (or the first hall when it has none),
 * so nothing ever disappears from the floor.
 */
export function groupHalls<T extends { area: string | null }>(saved: Hall[] | null | undefined, tables: T[], slotOf: (t: T) => number): { hall: Hall; tables: T[] }[] {
  const halls: Hall[] = (saved ?? []).length ? [...saved!] : [{ name: DEFAULT_HALL, entry: "bottom" }];
  const out = halls.map((hall) => ({ hall, tables: [] as T[] }));
  for (const t of tables) {
    const name = (t.area ?? "").trim();
    let g = out.find((x) => x.hall.name === name);
    if (!g && name) { g = { hall: { name, entry: "bottom" }, tables: [] }; out.push(g); }
    (g ?? out[0]).tables.push(t);
  }
  out.forEach((g) => g.tables.sort((a, b) => slotOf(a) - slotOf(b)));
  return out;
}

export const bookUrl = (origin: string, slug: string) => `${origin}/${slug}/book`;

/* ---------------- owner ---------------- */

export async function saveReserveSettings(restaurantId: string, s: Partial<ReserveSettings>) {
  const { error } = await supabase.from("restaurants").update(s).eq("id", restaurantId);
  if (error) throw error;
}

/** Bookings from `from` onwards (no-shows are marked first). */
export async function listReservations(restaurantId: string, from: Date, to: Date): Promise<Reservation[]> {
  await supabase.rpc("reservations_sweep", { p_restaurant: restaurantId });
  const { data, error } = await supabase.from("reservations").select("*")
    .eq("restaurant_id", restaurantId)
    .gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString())
    .order("starts_at");
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

export async function setReservationStatus(id: string, status: Reservation["status"]) {
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  if (error) throw error;
}

/** The guests arrived: opens the table's session with the booking charge on its bill. */
export async function seatReservation(id: string) {
  const { error } = await supabase.rpc("reservation_seat", { p_reservation: id });
  if (error) throw error;
}

/* ---------------- customer ---------------- */

export async function floorAt(restaurantId: string, at: Date | null): Promise<FloorInfo | null> {
  const { data, error } = await supabase.rpc("reserve_floor", { p_restaurant: restaurantId, p_at: at ? at.toISOString() : null });
  if (error || !data) return null;
  return data as FloorInfo;
}

export type BookingDone = { code: string; table_name: string; kind: string; starts_at: string; price: number; people: number };

export async function createReservation(input: { restaurantId: string; tableId: string; at: Date; people: number; name: string; phone: string; note: string }): Promise<BookingDone> {
  const { data, error } = await supabase.rpc("reservation_create", {
    p_restaurant: input.restaurantId, p_table: input.tableId, p_at: input.at.toISOString(),
    p_people: input.people, p_name: input.name, p_phone: input.phone, p_note: input.note || null,
  });
  if (error) throw new Error(error.message || "Couldn't book");
  return data as BookingDone;
}

/* ---------------- time slots ---------------- */

const hm = (s: string) => { const [h, m] = (s || "").split(":").map((n) => Number.parseInt(n, 10)); return (Number.isFinite(h) ? h : 12) * 60 + (Number.isFinite(m) ? m : 0); };

/** Half-hour slots between the restaurant's booking hours; today's start 30 minutes from now. */
export function slotsFor(day: Date, from: string, to: string, now = new Date()): Date[] {
  const out: Date[] = [];
  const start = hm(from), end = hm(to);
  for (let m = start; m <= end; m += 30) {
    const d = new Date(day); d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    if (d.getTime() >= now.getTime() + 30 * 60000) out.push(d);
  }
  return out;
}

export const timeLabel = (d: Date | string) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const dayLabel = (d: Date | string, now = new Date()) => {
  const x = new Date(d); const a = new Date(now); a.setHours(0, 0, 0, 0); const b = new Date(x); b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return x.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};
