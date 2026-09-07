// Parosa — data access layer.
// EVERY database call goes through this file, so the rest of the app never
// touches Supabase directly. Change a query once here and it's fixed everywhere.

import { supabase } from "./supabase";
import type { Category, Dish, NewOrderItem, Order, Restaurant } from "./types";

/* ---------------- Menu (public / customer side) ---------------- */

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const { data } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  return data as Restaurant | null;
}

/* ---------------- Restaurant (owner account) ---------------- */

/** The restaurant belonging to a signed-in owner. */
export async function getRestaurantByOwner(ownerId: string): Promise<Restaurant | null> {
  const { data } = await supabase.from("restaurants").select("*").eq("owner_id", ownerId).maybeSingle();
  return data as Restaurant | null;
}

function slugify(s: string): string {
  return (
    s.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "restaurant"
  );
}

/** A URL-safe slug from the restaurant name that isn't already taken. */
export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  const { data } = await supabase.from("restaurants").select("slug").ilike("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export async function createRestaurant(input: {
  ownerId: string;
  slug: string;
  name: string;
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  type?: string;
  visitors?: string;
  plan?: string;
  logoUrl?: string | null;
  gstin?: string;
  gstinUrl?: string | null;
  fssai?: string;
  fssaiUrl?: string | null;
  notes?: string;
}): Promise<Restaurant> {
  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      owner_id: input.ownerId,
      slug: input.slug,
      name: input.name,
      owner_name: input.ownerName || null,
      owner_email: input.ownerEmail || null,
      phone: input.phone || null,
      whatsapp: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      pincode: input.pincode || null,
      type: input.type || null,
      visitors: input.visitors || null,
      plan: input.plan || "basic",
      logo_url: input.logoUrl || null,
      gstin: input.gstin || null,
      gstin_url: input.gstinUrl || null,
      fssai: input.fssai || null,
      fssai_url: input.fssaiUrl || null,
      description: input.notes || null,
      template: "virasat",
      tables_count: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Restaurant;
}

export async function updateRestaurant(id: string, patch: Partial<Restaurant>) {
  const { error } = await supabase.from("restaurants").update(patch).eq("id", id);
  if (error) throw error;
}

/** Permanently delete a restaurant (categories, dishes and orders cascade). */
export async function deleteRestaurant(id: string) {
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  if (error) throw error;
}

export async function getMenu(
  slug: string
): Promise<{ restaurant: Restaurant; categories: Category[]; dishes: Dish[] } | null> {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return null;
  const [{ data: categories }, { data: dishes }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
    supabase.from("dishes").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
  ]);
  return { restaurant, categories: (categories as Category[]) ?? [], dishes: (dishes as Dish[]) ?? [] };
}

/* ---------------- Orders ---------------- */

export async function createOrder(input: {
  restaurantId: string;
  table: string;
  items: NewOrderItem[];
  subtotal: number;
  gst: number;
  total: number;
  phone?: string;
}): Promise<Order> {
  // We generate the id and order number on the client so a customer (anon)
  // only ever needs INSERT permission — never SELECT — under RLS.
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const orderNo = "A-" + Math.floor(200 + Math.random() * 799);
  const created_at = new Date().toISOString();

  const order: Order = {
    id,
    restaurant_id: input.restaurantId,
    table_number: input.table,
    order_no: orderNo,
    subtotal: input.subtotal,
    gst: input.gst,
    total: input.total,
    status: "new",
    payment_status: "unpaid",
    payment_method: null,
    customer_phone: input.phone ?? null,
    created_at,
  };

  const { error } = await supabase.from("orders").insert({
    id,
    restaurant_id: input.restaurantId,
    table_number: input.table,
    order_no: orderNo,
    subtotal: input.subtotal,
    gst: input.gst,
    total: input.total,
    status: "new",
    payment_status: "unpaid",
    customer_phone: input.phone ?? null,
  });
  if (error) throw error;

  const rows = input.items.map((i) => ({
    order_id: id,
    dish_id: i.dish_id,
    name: i.name,
    qty: i.qty,
    price: i.price,
  }));
  const { error: itemErr } = await supabase.from("order_items").insert(rows);
  if (itemErr) throw itemErr;

  return order;
}

export async function listOrders(restaurantId: string): Promise<Order[]> {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  return (data as Order[]) ?? [];
}

export type OrderWithItems = Order & { items: { name: string; qty: number; price: number }[] };

export async function listOrdersWithItems(restaurantId: string): Promise<OrderWithItems[]> {
  const orders = await listOrders(restaurantId);
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const { data: items } = await supabase.from("order_items").select("order_id,name,qty,price").in("order_id", ids);
  const byOrder: Record<string, { name: string; qty: number; price: number }[]> = {};
  (items ?? []).forEach((it) => { (byOrder[it.order_id] ??= []).push({ name: it.name, qty: it.qty, price: it.price }); });
  return orders.map((o) => ({ ...o, items: byOrder[o.id] ?? [] }));
}

/** Order-item rows (with dish_id) for a set of orders — used by Analytics. */
export async function getOrderItems(
  orderIds: string[]
): Promise<{ order_id: string; dish_id: string | null; name: string; qty: number; price: number }[]> {
  if (!orderIds.length) return [];
  const { data } = await supabase
    .from("order_items")
    .select("order_id,dish_id,name,qty,price")
    .in("order_id", orderIds);
  return (data as { order_id: string; dish_id: string | null; name: string; qty: number; price: number }[]) ?? [];
}

export async function updateOrderStatus(orderId: string, status: Order["status"]) {
  await supabase.from("orders").update({ status }).eq("id", orderId);
}

export async function markOrderPaid(orderId: string, method: string) {
  await supabase.from("orders").update({ payment_status: "paid", payment_method: method }).eq("id", orderId);
}

/** Owner adds a dish to an existing order (insert-only) and recomputes the totals. */
export async function addItemToOrder(
  orderId: string,
  dish: { id: string; name: string; price: number },
  newTotals: { subtotal: number; gst: number; total: number }
) {
  const { error } = await supabase.from("order_items").insert({ order_id: orderId, dish_id: dish.id, name: dish.name, qty: 1, price: dish.price });
  if (error) throw error;
  const { error: e2 } = await supabase.from("orders").update(newTotals).eq("id", orderId);
  if (e2) throw e2;
}

/* ---------------- Menu editing (owner side) ---------------- */

export async function addCategory(restaurantId: string, name: string, sortOrder = 99): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function upsertDish(dish: Partial<Dish> & { restaurant_id: string; category_id: string; name: string }) {
  const { data, error } = await supabase.from("dishes").upsert(dish).select().single();
  if (error) throw error;
  return data as Dish;
}

export async function setDishAvailable(dishId: string, available: boolean) {
  await supabase.from("dishes").update({ available }).eq("id", dishId);
}

export async function deleteDish(dishId: string) {
  await supabase.from("dishes").delete().eq("id", dishId);
}

/* ---------------- Tables ---------------- */

export async function setTablesCount(restaurantId: string, count: number) {
  await supabase.from("restaurants").update({ tables_count: count }).eq("id", restaurantId);
}

/* ---------------- Photo storage ---------------- */

export async function uploadPhoto(folder: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
}
