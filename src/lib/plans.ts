// Parosa — pricing plans (single source of truth for landing, settings, sidebar
// and every plan limit in the app). Razorpay billing is added later; for now
// choosing a plan just records it.
// The ids stay "basic" / "growth" / "business" because they are stored on every
// restaurant row; only the names, prices and features changed (Nov 2026).

export type PlanId = "basic" | "growth" | "business";

/** Features that are on or off per plan. */
export type Feature =
  | "whatsappBill"   // "Send on WhatsApp" bills
  | "reviewAsk"      // Google review link on bills
  | "loyalty"        // stamp cards + scratch card
  | "customers"      // customer list
  | "analytics"
  | "seatReserve"    // table booking with a fee
  | "stations";      // kitchen stations

export type Limits = { tables: number | null; staff: number | null; kitchenScreens: number | null }; // null = unlimited

export type Plan = {
  id: PlanId;
  name: string;
  price: number;       // ₹ per month, + GST
  yearly: number;      // ₹ per year, + GST (2 months free)
  blurb: string;
  popular?: boolean;
  includes: string[];  // everything on the plan card
  coming?: string[];   // promised, not built yet — shown as "coming soon"
  features: Feature[];
  limits: Limits;
};

const ALL: Feature[] = ["whatsappBill", "reviewAsk", "loyalty", "customers", "analytics", "seatReserve", "stations"];

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Starter",
    price: 499,
    yearly: 4990,
    blurb: "For dhabas & small cafés",
    includes: [
      "Digital QR menu with dish photos",
      "Table QR ordering & live orders",
      "Call-waiter button for guests",
      "Print / PDF bills + UPI pay QR",
      "Kitchen display (1 screen)",
      "2 staff logins (POS + waiter alerts)",
      "Up to 5 tables",
    ],
    features: [],
    limits: { tables: 5, staff: 2, kitchenScreens: 1 },
  },
  {
    id: "growth",
    name: "Growth",
    price: 999,
    yearly: 9990,
    blurb: "For busy restaurants",
    popular: true,
    includes: [
      "Digital QR menu with dish photos",
      "Table QR ordering & live orders",
      "Call-waiter button for guests",
      "Print / PDF bills + UPI pay QR",
      "Bills on WhatsApp",
      "Google review ask on every bill",
      "Loyalty stamp card + scratch card",
      "Customer list & analytics",
      "Seat Reserve — table booking with a fee",
      "Kitchen display + stations, unlimited screens",
      "5 staff logins",
      "Up to 10 tables",
    ],
    features: ALL,
    limits: { tables: 10, staff: 5, kitchenScreens: null },
  },
  {
    id: "business",
    name: "Pro",
    price: 1499,
    yearly: 14990,
    blurb: "For big & multi-outlet places",
    includes: [
      "Digital QR menu with dish photos",
      "Table QR ordering & live orders",
      "Call-waiter button for guests",
      "Print / PDF bills + UPI pay QR",
      "Bills on WhatsApp",
      "Google review ask on every bill",
      "Loyalty stamp card + scratch card",
      "Customer list & analytics",
      "Seat Reserve — table booking with a fee",
      "Kitchen display + stations, unlimited screens",
      "Unlimited staff logins",
      "Unlimited tables",
      "Multiple outlets (+₹999 per extra outlet)",
      "Priority setup & support",
    ],
    coming: ["Food-court mode"],
    features: ALL,
    limits: { tables: null, staff: null, kitchenScreens: null },
  },
];

export const planById = (id?: string | null) => PLANS.find((p) => p.id === id) ?? PLANS[0];

/** The plan that unlocks a feature first (for "Upgrade to Growth" prompts). */
export const planFor = (f: Feature) => PLANS.find((p) => p.features.includes(f)) ?? PLANS[1];
/** The cheapest plan that allows more than `n` of something. */
export const planAbove = (key: keyof Limits, n: number) =>
  PLANS.find((p) => p.limits[key] === null || p.limits[key]! > n) ?? PLANS[PLANS.length - 1];

/* ---------------- comparison table (basics first, the big ones last) ---------------- */

export type CompareRow = { label: string; cells: [string, string, string] };
const Y = "✓", N = "—";
export const COMPARE: CompareRow[] = [
  { label: "Digital QR menu & dish photos", cells: [Y, Y, Y] },
  { label: "Table QR ordering & live orders", cells: [Y, Y, Y] },
  { label: "Call-waiter button", cells: [Y, Y, Y] },
  { label: "Print / PDF bills + UPI pay QR", cells: [Y, Y, Y] },
  { label: "Kitchen display screens", cells: ["1", "Unlimited", "Unlimited"] },
  { label: "Bills on WhatsApp", cells: [N, Y, Y] },
  { label: "Google review ask on bills", cells: [N, Y, Y] },
  { label: "Kitchen stations (Tandoor, Chinese…)", cells: [N, Y, Y] },
  { label: "Loyalty stamp + scratch card", cells: [N, Y, Y] },
  { label: "Customer list & analytics", cells: [N, Y, Y] },
  { label: "Seat Reserve (table booking)", cells: [N, Y, Y] },
  { label: "Tables", cells: ["Up to 5", "Up to 10", "Unlimited"] },
  { label: "Staff logins", cells: ["2", "5", "Unlimited"] },
  { label: "Multiple outlets", cells: [N, N, Y] },
  { label: "Priority setup & support", cells: [N, N, Y] },
];
export const COMPARE_FIRST = 5; // rows shown before "View all features"

/* ---------------- what this restaurant can use right now ---------------- */

/** Restaurants that joined before plan limits started keep every feature. */
export const LIMITS_START = "2026-11-10T00:00:00+05:30";
export const TRIAL_DAYS = 14;

type PlanOwner = { plan?: string | null; created_at?: string | null };

export type Access = {
  plan: Plan;                      // the plan they chose (what they'd pay for)
  mode: "founder" | "trial" | "plan";
  trialDaysLeft: number;           // when mode = "trial"
  can: (f: Feature) => boolean;
  limit: (k: keyof Limits) => number | null;
};

export function accessOf(r: PlanOwner | null | undefined): Access {
  const plan = planById(r?.plan);
  const joined = r?.created_at ? new Date(r.created_at).getTime() : NaN;
  let mode: Access["mode"] = "plan";
  let trialDaysLeft = 0;
  if (!Number.isNaN(joined)) {
    if (joined < new Date(LIMITS_START).getTime()) mode = "founder";
    else {
      const left = Math.ceil((joined + TRIAL_DAYS * 86400000 - Date.now()) / 86400000);
      if (left > 0) { mode = "trial"; trialDaysLeft = left; }
    }
  }
  const open = mode !== "plan";   // founders and trials get everything
  return {
    plan, mode, trialDaysLeft,
    can: (f) => open || plan.features.includes(f),
    limit: (k) => (open ? null : plan.limits[k]),
  };
}
