import Link from "next/link";
import { planAbove, planFor, type Feature, type Limits } from "@/lib/plans";
import "./planlock.css";

/*
 * What an owner sees when their plan doesn't include something:
 *  <PlanLock>  — a whole page (Loyalty, Analytics, Seat Reserve…)
 *  <PlanNote>  — one line beside a button that hit a limit (tables, staff…)
 */

const WHAT: Record<Feature, { title: string; text: string; many?: boolean }> = {
  whatsappBill: { title: "Bills on WhatsApp", many: true, text: "Send the bill, a tap-to-pay UPI link and your review link straight to the guest's WhatsApp." },
  reviewAsk: { title: "Google review ask", text: "Every bill asks happy guests to rate you on Google." },
  loyalty: { title: "Loyalty stamp cards", many: true, text: "Guests earn a stamp on every paid bill and come back for the reward — plus a scratch card on the menu." },
  customers: { title: "Customer list", text: "Every guest who ordered, how often they come and what they spend." },
  analytics: { title: "Analytics", text: "Orders, returning guests, average bill and best sellers, day by day." },
  seatReserve: { title: "Seat Reserve", text: "Guests book a table online and pay a booking fee. Your floor plan shows every booking live." },
  stations: { title: "Kitchen stations", many: true, text: "Give the tandoor, Chinese counter and bar their own kitchen screen with only their dishes." },
};

export function PlanLock({ feature }: { feature: Feature }) {
  const p = planFor(feature);
  const w = WHAT[feature];
  return (
    <div className="pl-lock" role="region" aria-label={`${w.title} on ${p.name}`}>
      <span className="pl-ic" aria-hidden="true">🔒</span>
      <h2>{w.title} {w.many ? "are" : "is"} on the {p.name} plan</h2>
      <p>{w.text}</p>
      <Link href="/settings/plan" className="pl-btn">Upgrade to {p.name} · ₹{p.price.toLocaleString("en-IN")}/mo</Link>
      <Link href="/#pricing" className="pl-link" target="_blank">Compare plans</Link>
    </div>
  );
}

/** Small lock card over a section (e.g. Stations on the Kitchen display page). */
export function PlanLockInline({ feature }: { feature: Feature }) {
  const p = planFor(feature);
  return (
    <div className="pl-inline">
      <b>🔒 {WHAT[feature].title} {WHAT[feature].many ? "are" : "is"} on {p.name}</b>
      <span>{WHAT[feature].text}</span>
      <Link href="/settings/plan" className="pl-btn small">Upgrade to {p.name} · ₹{p.price.toLocaleString("en-IN")}/mo</Link>
    </div>
  );
}

const NOUN: Record<keyof Limits, [string, string]> = {
  tables: ["table", "tables"],
  staff: ["staff login", "staff logins"],
  kitchenScreens: ["kitchen screen", "kitchen screens"],
};

/** "5 of 5 tables used on Starter — Upgrade for 10 →" */
export function PlanNote({ kind, used, limit, planName }: { kind: keyof Limits; used: number; limit: number; planName: string }) {
  const next = planAbove(kind, limit);
  const more = next.limits[kind];
  const [one, many] = NOUN[kind];
  return (
    <div className="pl-note" role="status">
      <span>{Math.min(used, limit)} of {limit} {limit === 1 ? one : many} used on {planName}</span>
      <Link href="/settings/plan">Upgrade for {more === null ? `unlimited ${many}` : `${more} ${many}`} →</Link>
    </div>
  );
}
