"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { getMenu } from "@/lib/db";
import {
  kitchenDevices, pendingKitchenOtp, removeKitchenDevice, saveKitchenSettings,
  type KitchenDevice, type KitchenOtp, type Station,
} from "@/lib/kitchen";
import { useOwner } from "@/lib/useOwner";
import { accessOf } from "@/lib/plans";
import { PlanLockInline, PlanNote } from "@/components/PlanLock";
import type { Category } from "@/lib/types";
import "../dash.css";
import "./kitchendisplay.css";

/*
 * Owner side of the Kitchen Display: the kitchen link, the Restaurant ID and
 * sign-in code a kitchen tablet needs, the signed-in screens, ticket timer
 * colours, and stations (which menu categories each kitchen screen cooks).
 */

const AMBER = [5, 8, 10, 15];
const RED = [15, 20, 25, 30];

export default function KitchenDisplay() {
  const { restaurant, ready, reload } = useOwner();
  const [cats, setCats] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[] | null>(null); // null = use the saved ones
  const [newName, setNewName] = useState("");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  // kitchen sign-in: the live code (until WhatsApp is connected) + signed-in screens
  const [otp, setOtp] = useState<KitchenOtp | null>(null);
  const [devices, setDevices] = useState<KitchenDevice[] | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!restaurant) return;
    let alive = true;
    const load = () => {
      pendingKitchenOtp(restaurant.id).then((o) => { if (alive) setOtp(o); });
      kitchenDevices(restaurant.id).then((d) => { if (alive) setDevices(d); });
      setTick(Date.now());
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [restaurant]);

  useEffect(() => {
    if (!restaurant) return;
    getMenu(restaurant.slug).then((m) => setCats(m?.categories ?? [])).catch(() => {});
  }, [restaurant]);

  if (!ready || !restaurant) return <AppLoading label="Loading kitchen display…" />;

  const missing = restaurant.kitchen_stations === undefined;
  const plan = accessOf(restaurant);
  const canStations = plan.can("stations");
  const scrLim = plan.limit("kitchenScreens");
  const scrFull = scrLim !== null && (devices?.length ?? 0) >= scrLim;
  const list = stations ?? restaurant.kitchen_stations ?? [];
  const link = `${window.location.origin}/kitchen`; // rendered only on the client, after sign-in

  const save = async (p: Parameters<typeof saveKitchenSettings>[1], msg: string) => {
    try { await saveKitchenSettings(restaurant.id, p); await reload(); showToast(msg); }
    catch { showToast("Couldn't save — try again"); }
  };
  const saveStations = (next: Station[], msg: string) => { setStations(next); save({ kitchen_stations: next }, msg); };

  const addStation = () => {
    const name = newName.trim().replace(/\s+/g, " ").slice(0, 20);
    if (!name) { showToast("Give the station a name, like Tandoor"); return; }
    if (list.some((s) => s.name.toLowerCase() === name.toLowerCase())) { showToast(`There's already a ${name} station`); return; }
    setNewName("");
    saveStations([...list, { name, categories: [] }], `${name} station added — pick its categories`);
  };
  const toggleCat = (s: Station, catId: string) => {
    const on = s.categories.includes(catId);
    saveStations(list.map((x) => (x.name === s.name ? { ...x, categories: on ? x.categories.filter((c) => c !== catId) : [...x.categories, catId] } : x)), `${s.name} updated`);
  };
  const removeStation = (s: Station) => {
    if (!window.confirm(`Remove the ${s.name} station?`)) return;
    saveStations(list.filter((x) => x.name !== s.name), `${s.name} removed`);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(link); showToast("Kitchen link copied"); } catch { showToast(link); } };
  const removeDevice = async (d: KitchenDevice) => {
    if (!window.confirm(`Sign out ${d.name}? It will need a new code to open the kitchen again.`)) return;
    try { await removeKitchenDevice(d.id); setDevices((l) => l?.filter((x) => x.id !== d.id) ?? l); showToast(`${d.name} signed out`); }
    catch { showToast("Couldn't sign it out — try again"); }
  };
  const ago = (iso: string) => {
    const m = Math.round((tick - new Date(iso).getTime()) / 60000);
    return m < 2 ? "now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
  };
  const otpLeft = otp ? Math.max(0, Math.ceil((new Date(otp.expires_at).getTime() - tick) / 60000)) : 0;
  const unassigned = cats.filter((c) => !list.some((s) => s.categories.includes(c.id)));

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Kitchen display</h1><p>A screen in the kitchen: every order with a timer, Cooking → Ready. No more paper KOTs.</p></div>
          <div className="db-acts"><a className="db-btn prime" href="/kitchen" target="_blank" rel="noopener noreferrer">Open kitchen screen</a></div>
        </div>
        <div className="db-content">
          {missing && <div className="kd-missing"><b>One-time database update needed</b><span>The kitchen display needs update 0018.</span></div>}

          <div className="kdo-grid">
            <section className="db-panel kdo-card">
              <h3>Put it on the kitchen tablet</h3>
              <div className="kdo-link"><code>{link.replace(/^https?:\/\//, "")}</code><button className="db-btn" onClick={copy}>Copy</button></div>
              <ol className="kdo-steps">
                <li>Open the link on any tablet, old phone or TV in the kitchen.</li>
                <li>Enter the <b>Restaurant ID</b> <b className="kdo-code">{restaurant.slug}</b> and the registered mobile {restaurant.phone ? <b>{restaurant.phone}</b> : <Link href="/settings">— add one in Settings first</Link>}.</li>
                <li>Enter the 6-digit code, tap <b>Start kitchen screen</b> and leave it open. New orders ring with the Cha-Ching sound.</li>
              </ol>
              {scrFull && scrLim !== null ? (
                <PlanNote kind="kitchenScreens" used={devices?.length ?? 0} limit={scrLim} planName={plan.plan.name} />
              ) : otp ? (
                <div className="kdo-otp" role="status">
                  <span>Kitchen sign-in code</span>
                  <b>{otp.code}</b>
                  <small>{otp.sent_whatsapp ? "Also sent on WhatsApp · " : ""}Works for {otpLeft} more min. Only give it to your kitchen.</small>
                </div>
              ) : (
                <p className="kdo-muted">When the kitchen asks for a code, it shows up right here (WhatsApp codes are coming soon).</p>
              )}
            </section>

            <section className="db-panel kdo-card">
              <h3>Ticket timer colours</h3>
              <div className="kdo-rule"><span>Amber after</span>
                <div className="kdo-chips">{AMBER.map((m) => <button key={m} className={(restaurant.kds_amber_min ?? 10) === m ? "on" : ""} onClick={() => save({ kds_amber_min: m }, `Tickets turn amber after ${m} min`)} disabled={missing}>{m} min</button>)}</div>
              </div>
              <div className="kdo-rule"><span>Red after</span>
                <div className="kdo-chips">{RED.map((m) => <button key={m} className={(restaurant.kds_red_min ?? 20) === m ? "on" : ""} onClick={() => save({ kds_red_min: m }, `Tickets turn red after ${m} min`)} disabled={missing}>{m} min</button>)}</div>
              </div>
              <div className="kdo-legend"><span className="g">0–{restaurant.kds_amber_min ?? 10} min</span><span className="a">{restaurant.kds_amber_min ?? 10}–{restaurant.kds_red_min ?? 20} min</span><span className="r">{restaurant.kds_red_min ?? 20}+ min</span></div>
            </section>
          </div>

          <section className="db-panel kdo-card kdo-devs">
            <h3>Signed-in kitchen screens</h3>
            {devices === null ? <p className="kdo-muted">Shows once the database update is done.</p>
              : devices.length === 0 ? <p className="kdo-empty">No kitchen screen signed in yet.</p>
              : devices.map((d) => (
                <div key={d.id} className="kdo-dev">
                  <span aria-hidden="true">🖥</span>
                  <div><b>{d.name}</b><small>Signed in {new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · last seen {ago(d.last_seen)}</small></div>
                  <button className="kdo-x" onClick={() => removeDevice(d)}>Sign out</button>
                </div>
              ))}
          </section>

          <section className="db-panel kdo-card kdo-stations">
            <div className="kdo-sh">
              <div><h3>Stations</h3><p className="kdo-muted">Optional. Give each kitchen screen its own dishes — the tandoor sees only breads and kebabs. The &ldquo;All&rdquo; screen sees everything.</p></div>
              {canStations && <form className="kdo-add" onSubmit={(e) => { e.preventDefault(); addStation(); }}>
                <input value={newName} maxLength={20} onChange={(e) => setNewName(e.target.value)} placeholder="Tandoor, Chinese, Bar…" aria-label="New station name" disabled={missing} />
                <button className="db-btn prime" type="submit" disabled={missing}>＋ Add station</button>
              </form>}
            </div>
            {!canStations ? <PlanLockInline feature="stations" /> : list.length === 0 ? (
              <p className="kdo-empty">No stations yet — every kitchen screen shows all orders.</p>
            ) : list.map((s) => (
              <div key={s.name} className="kdo-st">
                <div className="kdo-sth"><b>{s.name}</b><span>{s.categories.length} {s.categories.length === 1 ? "category" : "categories"}</span><button className="kdo-x" onClick={() => removeStation(s)} aria-label={`Remove ${s.name}`}>Remove</button></div>
                <div className="kdo-chips">
                  {cats.map((c) => <button key={c.id} className={s.categories.includes(c.id) ? "on" : ""} onClick={() => toggleCat(s, c.id)} aria-pressed={s.categories.includes(c.id)}>{c.name}</button>)}
                </div>
              </div>
            ))}
            {canStations && list.length > 0 && unassigned.length > 0 && (
              <p className="kdo-warn">Not on any station yet: {unassigned.map((c) => c.name).join(", ")} — these show only on the &ldquo;All&rdquo; screen.</p>
            )}
          </section>
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
