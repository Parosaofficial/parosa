// Parosa — Kitchen Display (migration 0018).
//
// The kitchen screen signs in like the staff POS (phone + today's code) and
// reads open orders through code-checked database functions. Cooks move an
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

const args = (s: StaffSession) => ({ p_restaurant: s.restaurant_id, p_code: s.code, p_staff: s.staff_id });

/** null = signed out (today's code changed) or the database isn't updated yet. */
export async function kitchenBoard(s: StaffSession): Promise<KitchenBoard | null> {
  const { data, error } = await supabase.rpc("kitchen_orders", args(s));
  if (error || !data) return null;
  const b = data as KitchenBoard;
  return { orders: b.orders ?? [], recent: b.recent ?? [], stations: b.stations ?? [], amber_min: b.amber_min || 10, red_min: b.red_min || 20 };
}

export async function kitchenSetStatus(s: StaffSession, orderId: string, status: KitchenStatus) {
  const { data, error } = await supabase.rpc("kitchen_set_status", { ...args(s), p_order: orderId, p_status: status });
  if (error || data === false) throw error ?? new Error("not allowed");
}

export async function kitchenItemDone(s: StaffSession, itemId: string, done: boolean) {
  const { data, error } = await supabase.rpc("kitchen_item_done", { ...args(s), p_item: itemId, p_done: done });
  if (error || data === false) throw error ?? new Error("not allowed");
}

/* ---------------- waiter's phone: food ready ---------------- */

export type ReadyFood = { order_id: string; order_no: string | null; ready_at: string; table_name: string | null; mine: boolean };

export async function staffReady(s: StaffSession): Promise<ReadyFood[]> {
  const { data, error } = await supabase.rpc("staff_ready", args(s));
  if (error || !Array.isArray(data)) return [];
  return data as ReadyFood[];
}

/* ---------------- owner: stations + timer colours ---------------- */

export async function saveKitchenSettings(restaurantId: string, p: { kitchen_stations?: Station[]; kds_amber_min?: number; kds_red_min?: number }) {
  const { error } = await supabase.from("restaurants").update(p).eq("id", restaurantId);
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
