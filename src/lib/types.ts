// Parosa — database row shapes (mirror the Supabase tables)

export type Hours = {
  open: string;      // "11:00"
  close: string;     // "23:30"
  breakOn: boolean;
  breakFrom: string; // "15:30"
  breakTo: string;   // "18:00"
  days: boolean[];   // [Mon..Sun]
};

export type Restaurant = {
  id: string;
  owner_id: string | null;
  slug: string;
  name: string;
  name_hi: string | null;
  owner_name: string | null;
  owner_email: string | null;
  phone: string | null;
  whatsapp: string | null;
  type: string | null;
  visitors: string | null;
  logo_url: string | null;
  gstin: string | null;
  gstin_url: string | null;
  fssai: string | null;
  fssai_url: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  tagline: string | null;
  description: string | null;
  template: string | null;
  theme?: string | null; // colour theme for the menu (added in 0007)
  plan: string | null; // 'basic' | 'growth' | 'business'
  upi_id: string | null;
  google_review_url?: string | null; // added in 0005 — optional until that migration runs
  review_prompt?: boolean | null;
  hours: Hours | null;
  tables_count: number;
  staff_code: string | null;
  staff_code_date: string | null;
};

export type Staff = {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  aadhaar: string | null;
  active: boolean;
  created_at: string;
};

export type StaffSession = {
  restaurant_id: string;
  slug: string;
  restaurant_name: string;
  staff_id: string;
  staff_name: string;
  code: string;
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
  customer_name: string | null;
  staff_name: string | null;
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
