// Parosa — pricing plans (single source of truth for landing, signup & settings)
// Razorpay billing is added later; for now choosing a plan just records it.

export type Plan = {
  id: "basic" | "growth" | "business";
  name: string;
  price: number;       // ₹ per month
  yearly: number;      // ₹ per year (2 months free)
  blurb: string;
  popular?: boolean;
  featured: string[];  // shown on the plan card
};

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 99,
    yearly: 990,
    blurb: "Everything to run one outlet beautifully.",
    featured: [
      "1 restaurant",
      "Unlimited tables & QR codes",
      "Bilingual (हिंदी + English) menu",
      "Live orders with sound alerts",
      "WhatsApp bills",
      "UPI & cash tracking",
      "0% commission — always",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 299,
    yearly: 2990,
    blurb: "For busy kitchens that want to grow.",
    popular: true,
    featured: [
      "Everything in Basic, plus",
      "All premium menu templates & branding",
      "Deep analytics & exports",
      "Review-boost QR + auto-ask",
      "Up to 3 staff logins",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 499,
    yearly: 4990,
    blurb: "Multiple outlets and the full toolkit.",
    featured: [
      "Everything in Growth, plus",
      "Multiple outlets",
      "Unlimited staff logins",
      "WhatsApp broadcasts & promos",
      "Custom domain",
      "Dedicated onboarding & support",
    ],
  },
];

export const planById = (id?: string | null) => PLANS.find((p) => p.id === id) ?? PLANS[0];
