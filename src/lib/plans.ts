// Parosa — pricing plans (single source of truth for landing, settings & sidebar)
// Razorpay billing is added later; for now choosing a plan just records it.
// The ids stay "basic" / "growth" / "business" because they are stored on every
// restaurant row; only the names, prices and features changed (Oct 2026).

export type Plan = {
  id: "basic" | "growth" | "business";
  name: string;
  price: number;       // ₹ per month
  yearly: number;      // ₹ per year (2 months free)
  blurb: string;
  popular?: boolean;
  featured: string[];  // shown on the plan card
  coming?: string[];   // promised features not built yet — shown as "coming soon"
};

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Starter",
    price: 399,
    yearly: 3990,
    blurb: "One outlet, getting started.",
    featured: [
      "QR menu in Hindi + English",
      "QR table ordering & live orders",
      "WhatsApp bills + UPI pay QR",
      "Google review ask on every bill",
      "Unlimited tables",
      "0% commission — always",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 699,
    yearly: 6990,
    blurb: "Bring your guests back.",
    popular: true,
    featured: [
      "Everything in Starter, plus",
      "Loyalty stamp cards",
      "Customer list & analytics",
      "All menu designs & branding",
      "Up to 3 staff logins (POS)",
    ],
    coming: ["Add-on suggestions on the menu"],
  },
  {
    id: "business",
    name: "Pro",
    price: 999,
    yearly: 9990,
    blurb: "For busy and multi-outlet places.",
    featured: [
      "Everything in Growth, plus",
      "Multiple outlets",
      "Unlimited staff logins",
      "Priority onboarding & support",
    ],
    coming: ["WhatsApp “we miss you” messages"],
  },
];

export const planById = (id?: string | null) => PLANS.find((p) => p.id === id) ?? PLANS[0];
