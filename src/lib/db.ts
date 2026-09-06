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
  const orderNo = "A-" + Math.floor(200 + Math.random() * 799);
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: input.restaurantId,
      table_number: input.table,
      order_no: orderNo,
      subtotal: input.subtotal,
      gst: input.gst,
      total: input.total,
      status: "new",
      payment_status: "unpaid",
      customer_phone: input.phone ?? null,
    })
    .select()
    .single();
  if (error || !order) throw error ?? new Error("Order failed");

  const rows = input.items.map((i) => ({
    order_id: order.id,
    dish_id: i.dish_id,
    name: i.name,
    qty: i.qty,
    price: i.price,
  }));
  const { error: itemErr } = await supabase.from("order_items").insert(rows);
  if (itemErr) throw itemErr;

  return order as Order;
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

export async function updateOrderStatus(orderId: string, status: Order["status"]) {
  await supabase.from("orders").update({ status }).eq("id", orderId);
}

export async function markOrderPaid(orderId: string, method: string) {
  await supabase.from("orders").update({ payment_status: "paid", payment_method: method }).eq("id", orderId);
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

/* ---------------- Photo storage ---------------- */

export async function uploadPhoto(folder: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
}
