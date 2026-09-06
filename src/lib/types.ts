// Parosa — database row shapes (mirror the Supabase tables)

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  phone: string | null;
  type: string | null;
  visitors: string | null;
  logo_url: string | null;
  gstin: string | null;
  fssai: string | null;
  address: string | null;
  city: string | null;
  tagline: string | null;
  template: string | null;
  upi_id: string | null;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

export type Dish = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_veg: boolean;
  tag: string | null; // '' | 'best' | 'new'
  available: boolean;
  photo_url: string | null;
  sort_order: number;
};

export type OrderStatus = "new" | "cooking" | "ready" | "served";

export type Order = {
  id: string;
  restaurant_id: string;
  order_no: string | null;
  table_number: string | null;
  status: OrderStatus;
  subtotal: number;
  gst: number;
  total: number;
  payment_status: "paid" | "unpaid";
  payment_method: string | null;
  customer_phone: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  dish_id: string | null;
  name: string;
  qty: number;
  price: number;
};

// input when a customer places an order
export type NewOrderItem = { dish_id: string; name: string; qty: number; price: number };
