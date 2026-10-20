// Parosa — digital stamp cards (loyalty).
//
// Stamps are added by a database trigger (migration 0010) when an order that
// carries the guest's phone is marked paid, so nothing here can award a stamp.
// Every call degrades quietly if the migration hasn't been applied yet.

import { supabase } from "./supabase";

export type LoyaltySettings = {
  loyalty_enabled: boolean;
  loyalty_goal: number;
  loyalty_min: number;
  loyalty_reward: string | null;
};

export type LoyaltyCard = {
  id: string;
  restaurant_id: string;
  phone: string;
  token: string;
  stamps: number;
  rewards_redeemed: number;
  last_stamp_at: string | null;
  created_at: string;
};

/** What a guest sees on their card page. */
export type PublicCard = {
  restaurant_name: string;
  slug: string;
  logo_url: string | null;
  enabled: boolean;
  goal: number;
  min: number;
  reward: string | null;
  stamps: number;
  rewards_redeemed: number;
  phone_tail: string;
  last_stamp_at: string | null;
};

export const DEFAULT_LOYALTY: LoyaltySettings = { loyalty_enabled: false, loyalty_goal: 8, loyalty_min: 0, loyalty_reward: "" };

/** Read the loyalty fields off any restaurant row (they're optional until 0010 runs). */
export function loyaltyOf(r: object | null | undefined): LoyaltySettings & { ready: boolean } {
  const x = (r ?? {}) as Partial<LoyaltySettings>;
  return {
    ready: "loyalty_enabled" in (r ?? {}),
    loyalty_enabled: !!x.loyalty_enabled,
    loyalty_goal: x.loyalty_goal && x.loyalty_goal > 0 ? x.loyalty_goal : 8,
    loyalty_min: x.loyalty_min && x.loyalty_min > 0 ? x.loyalty_min : 0,
    loyalty_reward: x.loyalty_reward ?? "",
  };
}

/** A friendly default if the owner hasn't written a reward yet. */
export const rewardText = (reward?: string | null) => (reward && reward.trim()) || "a free treat";

export const cleanPhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
};

/* ---------------- owner ---------------- */

export async function saveLoyaltySettings(restaurantId: string, s: LoyaltySettings) {
  const { error } = await supabase.from("restaurants").update({
    loyalty_enabled: s.loyalty_enabled,
    loyalty_goal: Math.max(2, Math.min(30, Math.round(s.loyalty_goal))),
    loyalty_min: Math.max(0, Math.round(s.loyalty_min)),
    loyalty_reward: (s.loyalty_reward ?? "").trim() || null,
  }).eq("id", restaurantId);
  if (error) throw error;
}

export async function listLoyaltyCards(restaurantId: string): Promise<LoyaltyCard[]> {
  const { data, error } = await supabase.from("loyalty_cards").select("*")
    .eq("restaurant_id", restaurantId).order("stamps", { ascending: false }).order("last_stamp_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LoyaltyCard[];
}

/** Latest known name for each phone, from the restaurant's own orders. */
export async function customerNames(restaurantId: string): Promise<Record<string, string>> {
  const { data } = await supabase.from("orders").select("customer_phone, customer_name, created_at")
    .eq("restaurant_id", restaurantId).not("customer_name", "is", null).order("created_at", { ascending: false }).limit(1000);
  const out: Record<string, string> = {};
  for (const o of (data ?? []) as { customer_phone: string | null; customer_name: string | null }[]) {
    const p = cleanPhone(o.customer_phone ?? "");
    if (p && o.customer_name && !out[p]) out[p] = o.customer_name;
  }
  return out;
}

export async function redeemCard(cardId: string): Promise<number> {
  const { data, error } = await supabase.rpc("loyalty_redeem", { p_card: cardId });
  if (error) throw error;
  return data as number;
}

/** Owner correction: set a card's stamps by hand (e.g. a missed visit). */
export async function setCardStamps(cardId: string, stamps: number) {
  const { error } = await supabase.from("loyalty_cards").update({ stamps: Math.max(0, stamps) }).eq("id", cardId);
  if (error) throw error;
}

/** Attach a phone to an order so the trigger can stamp it (owner, from the bill). */
export async function setOrderPhone(orderId: string, phone: string) {
  const p = cleanPhone(phone);
  if (!p) return;
  await supabase.from("orders").update({ customer_phone: p }).eq("id", orderId);
}

export async function cardForPhone(restaurantId: string, phone: string): Promise<LoyaltyCard | null> {
  const p = cleanPhone(phone);
  if (!p) return null;
  try {
    const { data } = await supabase.from("loyalty_cards").select("*").eq("restaurant_id", restaurantId).eq("phone", p).maybeSingle();
    return (data as LoyaltyCard) ?? null;
  } catch { return null; }
}

/* ---------------- guest ---------------- */

export async function getPublicCard(token: string): Promise<PublicCard | null> {
  try {
    const { data, error } = await supabase.rpc("loyalty_card", { p_token: token });
    if (error || !data) return null;
    return data as PublicCard;
  } catch { return null; }
}

export async function tokenForOrder(orderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("loyalty_token_for_order", { p_order: orderId });
    if (error || !data) return null;
    return data as string;
  } catch { return null; }
}

/** The guest's own card links, remembered on their phone per restaurant. */
const KEY = "parosa-cards";
export function rememberCard(slug: string, token: string) {
  try { const m = JSON.parse(localStorage.getItem(KEY) || "{}"); m[slug] = token; localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
export function rememberedCard(slug: string): string | null {
  try { return (JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>)[slug] ?? null; } catch { return null; }
}

export const cardUrl = (origin: string, slug: string, token: string) => `${origin}/${slug}/card/${token}`;

/* ---------------- staff (POS) ---------------- */

export type StaffLoyalty = { enabled: boolean; goal: number; reward: string | null; stamps: number };

export async function staffLoyalty(restaurantId: string, code: string, phone: string): Promise<StaffLoyalty | null> {
  if (!cleanPhone(phone)) return null;
  try {
    const { data, error } = await supabase.rpc("staff_loyalty", { p_restaurant_id: restaurantId, p_code: code, p_phone: phone });
    if (error || !data) return null;
    return data as StaffLoyalty;
  } catch { return null; }
}

export async function staffRedeem(restaurantId: string, code: string, phone: string): Promise<number> {
  const { data, error } = await supabase.rpc("staff_loyalty_redeem", { p_restaurant_id: restaurantId, p_code: code, p_phone: phone });
  if (error) throw error;
  return data as number;
}
