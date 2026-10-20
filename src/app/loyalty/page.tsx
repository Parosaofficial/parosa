"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { StampStrip } from "@/components/MenuStamp";
import { useOwner } from "@/lib/useOwner";
import {
  cardUrl, customerNames, listLoyaltyCards, loyaltyOf, redeemCard, rewardText,
  saveLoyaltySettings, setCardStamps, type LoyaltyCard, type LoyaltySettings,
} from "@/lib/loyalty";
import "../dash.css";
import "./loyalty.css";

const ago = (iso: string | null) => {
  if (!iso) return "No stamps yet";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Stamped today" : d === 1 ? "Stamped yesterday" : `Last stamp ${d} days ago`;
};

export default function Loyalty() {
  const { restaurant, ready, reload } = useOwner();
  const [form, setForm] = useState<LoyaltySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [listErr, setListErr] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  const live = loyaltyOf(restaurant);

  useEffect(() => {
    if (!restaurant) return;
    const l = loyaltyOf(restaurant);
    setForm({ loyalty_enabled: l.loyalty_enabled, loyalty_goal: l.loyalty_goal, loyalty_min: l.loyalty_min, loyalty_reward: l.loyalty_reward });
    if (!l.ready) return;
    (async () => {
      try { setCards(await listLoyaltyCards(restaurant.id)); setListErr(false); } catch { setListErr(true); }
      setNames(await customerNames(restaurant.id));
    })();
  }, [restaurant]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return cards;
    return cards.filter((c) => c.phone.includes(t.replace(/\D/g, "") || "~") || (names[c.phone] ?? "").toLowerCase().includes(t));
  }, [cards, names, q]);

  if (!ready || !restaurant || !form) return <AppLoading label="Loading loyalty…" />;

  const goal = live.loyalty_goal;
  const members = cards.length;
  const readyCount = cards.filter((c) => c.stamps >= goal).length;
  const redeemed = cards.reduce((n, c) => n + c.rewards_redeemed, 0);
  const regulars = cards.filter((c) => c.stamps + c.rewards_redeemed * goal >= 2).length;

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveLoyaltySettings(restaurant.id, form);
      await reload();
      showToast(form.loyalty_enabled ? "Stamp cards are live" : "Saved — stamp cards are off");
    } catch { showToast("Could not save — try again"); }
    finally { setSaving(false); }
  };

  const redeem = async (c: LoyaltyCard) => {
    setBusy(c.id);
    try {
      const left = await redeemCard(c.id);
      setCards((list) => list.map((x) => (x.id === c.id ? { ...x, stamps: left, rewards_redeemed: x.rewards_redeemed + 1 } : x)));
      showToast(`Reward given — ${rewardText(live.loyalty_reward)} 🎉`);
    } catch { showToast("Could not redeem — try again"); }
    finally { setBusy(""); }
  };

  const adjust = async (c: LoyaltyCard, delta: number) => {
    const next = Math.max(0, c.stamps + delta);
    if (next === c.stamps) return;
    setCards((list) => list.map((x) => (x.id === c.id ? { ...x, stamps: next } : x)));
    try { await setCardStamps(c.id, next); }
    catch { setCards((list) => list.map((x) => (x.id === c.id ? { ...x, stamps: c.stamps } : x))); showToast("Could not update — try again"); }
  };

  const shareCard = (c: LoyaltyCard) => {
    const url = cardUrl(window.location.origin, restaurant.slug, c.token);
    const left = Math.max(0, goal - c.stamps);
    const text = `Hi${names[c.phone] ? " " + names[c.phone] : ""}! Your ${restaurant.name} stamp card: ${c.stamps}/${goal} stamps` +
      (left ? ` — ${left} more visit${left === 1 ? "" : "s"} to ${rewardText(live.loyalty_reward)}.` : ` — your reward is ready! 🎉`) + `\n${url}`;
    window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const set = <K extends keyof LoyaltySettings>(k: K, v: LoyaltySettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main ly-maroon">
        <div className="db-topbar">
          <div><h1>Loyalty stamp card</h1><p>Every paid bill with the guest&apos;s number earns a tick. Fill the card, get the reward.</p></div>
          <span className={`ly-live${form.loyalty_enabled ? " on" : ""}`}>{form.loyalty_enabled ? "● Live on your menu" : "Off"}</span>
        </div>
        <div className="db-content">
          {!live.ready && (
            <div className="ly-setup">
              <b>One-time setup pending</b>
              <span>Stamp cards need a small database update before they can switch on. Your settings below will save as soon as it&apos;s done.</span>
            </div>
          )}

          <div className="ly-top">
            {/* live preview — exactly what the menu shows */}
            <div className="ly-prev">
              <span className="ly-plbl">What guests see on your menu</span>
              <div className="ly-phone">
                <div className="ms-wrap open">
                  <div className="ms-toggle" aria-hidden>
                    <span className="star">★</span>
                    <span className="tx">Your stamp card · {Math.min(3, form.loyalty_goal - 1)}/{form.loyalty_goal}</span>
                    <svg className="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                  <div className="ms-drop">
                    <StampStrip name={restaurant.name} goal={form.loyalty_goal} stamps={Math.min(3, form.loyalty_goal - 1)} reward={form.loyalty_reward} />
                  </div>
                </div>
              </div>
              <ol className="ly-how">
                <li><b>Guest adds their number</b> at checkout on your QR menu, or tells your staff on the POS.</li>
                <li><b>You mark the bill paid</b> and the tick lands on their card{form.loyalty_min ? ` (bills of ₹${form.loyalty_min}+)` : ""}. Unpaid orders never count.</li>
                <li><b>Card full?</b> They show it at the counter and you tap <b>Give reward</b>.</li>
              </ol>
            </div>

            {/* rules */}
            <div className="ly-set">
              <h3>Card rules</h3>
              <div className="ly-line">
                <div><div className="tt">Stamp card</div><div className="ts">Show it on your QR menu</div></div>
                <button className={`db-switch${form.loyalty_enabled ? " on" : ""}`} onClick={() => set("loyalty_enabled", !form.loyalty_enabled)} aria-label="Turn stamp cards on or off" />
              </div>
              <div className="ly-line">
                <div><div className="tt">Ticks for a reward</div><div className="ts">Paid visits that fill the card</div></div>
                <div className="ly-step">
                  <button onClick={() => set("loyalty_goal", Math.max(2, form.loyalty_goal - 1))} aria-label="Fewer stamps">−</button>
                  <span>{form.loyalty_goal}</span>
                  <button onClick={() => set("loyalty_goal", Math.min(30, form.loyalty_goal + 1))} aria-label="More stamps">+</button>
                </div>
              </div>
              <div className="ly-presets">
                {[5, 6, 8, 10].map((n) => <button key={n} className={form.loyalty_goal === n ? "on" : ""} onClick={() => set("loyalty_goal", n)}>{n} visits</button>)}
              </div>
              <div className="db-field" style={{ marginTop: 16 }}>
                <label>The reward</label>
                <input value={form.loyalty_reward ?? ""} maxLength={60} placeholder="A free masala chai" onChange={(e) => set("loyalty_reward", e.target.value)} />
              </div>
              <div className="db-field">
                <label>Minimum bill for a tick</label>
                <div className="ly-rupee"><span>₹</span><input inputMode="numeric" value={form.loyalty_min || ""} placeholder="0 = any bill" onChange={(e) => set("loyalty_min", Number(e.target.value.replace(/\D/g, "")) || 0)} /></div>
              </div>
              <button className="ly-save" onClick={save} disabled={saving || !live.ready}>{saving ? "Saving…" : "Save card rules"}</button>
            </div>
          </div>

          {/* stats */}
          <div className="ly-kpis">
            <div><b>{members}</b><span>Members</span></div>
            <div><b>{regulars}</b><span>Came back 2+ times</span></div>
            <div className={readyCount ? "hot" : ""}><b>{readyCount}</b><span>Rewards ready</span></div>
            <div><b>{redeemed}</b><span>Rewards given</span></div>
          </div>

          {/* members */}
          <div className="db-panel">
            <div className="db-ph">
              <h3>Members</h3>
              <input className="ly-search" placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {!live.ready || listErr ? (
              <div className="ly-empty">Members will show here once stamp cards are set up.</div>
            ) : shown.length === 0 ? (
              <div className="ly-empty">
                {cards.length === 0
                  ? <>No members yet. Turn stamp cards on — the first guest who leaves their number and pays will appear here.</>
                  : <>Nobody matches &ldquo;{q}&rdquo;.</>}
              </div>
            ) : (
              <div className="ly-list">
                {shown.map((c) => {
                  const full = c.stamps >= goal;
                  const nm = names[c.phone];
                  return (
                    <div key={c.id} className={`ly-row${full ? " full" : ""}`}>
                      <span className="av">{(nm || "#").trim().slice(0, 1).toUpperCase()}</span>
                      <div className="who">
                        <b>{nm || `+91 ${c.phone.slice(0, 5)} ${c.phone.slice(5)}`}</b>
                        <span>{nm ? `+91 ${c.phone.slice(0, 5)} ${c.phone.slice(5)} · ` : ""}{ago(c.last_stamp_at)}{c.rewards_redeemed ? ` · ${c.rewards_redeemed} reward${c.rewards_redeemed > 1 ? "s" : ""} given` : ""}</span>
                      </div>
                      <div className="dots" title={`${c.stamps} of ${goal} stamps`}>
                        {Array.from({ length: Math.min(goal, 12) }, (_, i) => <i key={i} className={i < Math.round((Math.min(c.stamps, goal) / goal) * Math.min(goal, 12)) ? "on" : ""} />)}
                        <em>{c.stamps}/{goal}</em>
                      </div>
                      <div className="adj">
                        <button onClick={() => adjust(c, -1)} aria-label="Remove a stamp" title="Remove a stamp">−</button>
                        <button onClick={() => adjust(c, 1)} aria-label="Add a stamp" title="Add a stamp">+</button>
                      </div>
                      <div className="acts">
                        {full && <button className="give" disabled={busy === c.id} onClick={() => redeem(c)}>{busy === c.id ? "…" : "🎁 Give reward"}</button>}
                        <button className="wa" onClick={() => shareCard(c)} title="Send their card on WhatsApp">Send card</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
