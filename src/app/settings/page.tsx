"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Seal } from "@/components/Logo";
import { AppLoading } from "@/components/AppLoading";
import { deleteRestaurant, updateRestaurant, uploadPhoto } from "@/lib/db";
import { signOutOwner } from "@/lib/auth";
import { useOwner } from "@/lib/useOwner";
import { PLANS, planById } from "@/lib/plans";
import type { Hours } from "@/lib/types";
import "../dash.css";
import "./settings.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultHours: Hours = { open: "11:00", close: "23:00", breakOn: false, breakFrom: "15:30", breakTo: "18:00", days: [true, true, true, true, true, true, true] };

type Form = {
  name: string; name_hi: string; tagline: string; description: string;
  phone: string; whatsapp: string; address: string; city: string;
  gstin: string; fssai: string; hours: Hours;
};

export default function Settings() {
  const router = useRouter();
  const { restaurant, ready, reload } = useOwner();
  const [f, setF] = useState<Form | null>(null);
  const [logo, setLogo] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    if (!restaurant) return;
    setF({
      name: restaurant.name ?? "", name_hi: restaurant.name_hi ?? "",
      tagline: restaurant.tagline ?? "", description: restaurant.description ?? "",
      phone: restaurant.phone ?? "", whatsapp: restaurant.whatsapp ?? "",
      address: restaurant.address ?? "", city: restaurant.city ?? "",
      gstin: restaurant.gstin ?? "", fssai: restaurant.fssai ?? "",
      hours: restaurant.hours ?? defaultHours,
    });
    setLogo(restaurant.logo_url ?? "");
  }, [restaurant]);

  if (!ready || !restaurant || !f) return <AppLoading label="Loading settings…" />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => (p ? { ...p, [k]: v } : p));
  const setHours = (patch: Partial<Hours>) => setF((p) => (p ? { ...p, hours: { ...p.hours, ...patch } } : p));
  const toggleDay = (i: number) => setHours({ days: f.hours.days.map((v, k) => (k === i ? !v : v)) });

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogo(URL.createObjectURL(file)); setLogoFile(file); }
  };

  const save = async () => {
    if (!f.name.trim()) { showToast("Restaurant name can't be empty"); return; }
    setBusy(true);
    try {
      let logo_url = restaurant.logo_url;
      if (logoFile) logo_url = await uploadPhoto("logos", logoFile);
      await updateRestaurant(restaurant.id, {
        name: f.name.trim(), name_hi: f.name_hi.trim() || null, tagline: f.tagline.trim() || null,
        description: f.description.trim() || null, phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null,
        address: f.address.trim() || null, city: f.city.trim() || null, gstin: f.gstin.trim() || null,
        fssai: f.fssai.trim() || null, hours: f.hours, logo_url,
      });
      setLogoFile(null);
      await reload();
      showToast("Settings saved ✓");
    } catch { showToast("Could not save — try again"); }
    finally { setBusy(false); }
  };

  const changePlan = async (id: string) => {
    if (id === (restaurant.plan ?? "basic")) return;
    await updateRestaurant(restaurant.id, { plan: id });
    await reload();
    showToast(`Switched to Parosa ${planById(id).name}`);
  };

  const del = async () => {
    const typed = prompt(`This permanently deletes "${restaurant.name}" — menu, tables, QRs and orders.\n\nType the restaurant name to confirm:`);
    if (typed === null) return;
    if (typed.trim() !== restaurant.name.trim()) { showToast("Name didn't match — not deleted"); return; }
    try {
      await deleteRestaurant(restaurant.id);
      await signOutOwner();
      router.replace("/login?mode=create");
    } catch { showToast("Could not delete — try again"); }
  };

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Settings</h1><p>Your restaurant profile, hours and account.</p></div>
          <div className="db-acts"><button className="db-btn prime" onClick={save} disabled={busy}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg> {busy ? "Saving…" : "Save changes"}</button></div>
        </div>
        <div className="db-content">
          <div className="db-panel">
            <div className="db-ph"><h3>Restaurant profile</h3></div>
            <div className="db-pb">
              <div className="set-logo">
                <div className="set-logoem">{logo ? <span style={{ width: 52, height: 52, borderRadius: 10, backgroundImage: `url(${logo})`, backgroundSize: "cover", backgroundPosition: "center", display: "block" }} /> : <Seal size={52} />}</div>
                <div><div className="set-lu">Restaurant logo</div><div className="set-ls">PNG/JPG, square, max 1MB</div><label className="set-upl" style={{ cursor: "pointer" }}><input type="file" accept="image/*" hidden onChange={pickLogo} />{logo ? "Change logo" : "Upload logo"}</label></div>
              </div>
              <div className="db-frow two">
                <div className="db-field"><label>Name (English)</label><input type="text" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="db-field"><label>नाम (हिंदी)</label><input type="text" value={f.name_hi} placeholder="राज दरबार" onChange={(e) => set("name_hi", e.target.value)} /></div>
              </div>
              <div className="db-field"><label>Tagline</label><input type="text" value={f.tagline} placeholder="Royal North-Indian since 1994" onChange={(e) => set("tagline", e.target.value)} /></div>
              <div className="db-field"><label>Short description</label><textarea value={f.description} placeholder="Slow-cooked curries, clay-oven kebabs and dum biryani." onChange={(e) => set("description", e.target.value)} /></div>
            </div>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Contact &amp; location</h3></div>
            <div className="db-pb">
              <div className="db-frow two">
                <div className="db-field"><label>Phone</label><input type="text" value={f.phone} placeholder="+91 98765 43210" onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="db-field"><label>WhatsApp number <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· for bills</span></label><input type="text" value={f.whatsapp} placeholder="+91 98765 43210" onChange={(e) => set("whatsapp", e.target.value)} /></div>
              </div>
              <div className="db-field"><label>Address</label><input type="text" value={f.address} placeholder="Street, area, city, PIN" onChange={(e) => set("address", e.target.value)} /></div>
              <div className="db-frow three">
                <div className="db-field"><label>City</label><input type="text" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
                <div className="db-field"><label>GSTIN</label><input type="text" value={f.gstin} onChange={(e) => set("gstin", e.target.value)} /></div>
                <div className="db-field"><label>FSSAI</label><input type="text" value={f.fssai} onChange={(e) => set("fssai", e.target.value)} /></div>
              </div>
            </div>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Opening hours</h3></div>
            <div className="db-pb">
              <div className="db-field"><label>Open on</label>
                <div className="set-days">{DAYS.map((d, i) => <button key={d} className={`set-day${f.hours.days[i] ? " on" : ""}`} onClick={() => toggleDay(i)}>{d[0]}</button>)}</div>
              </div>
              <div className="db-frow two set-timegrid" style={{ marginTop: 4 }}>
                <div className="db-field" style={{ marginBottom: 0 }}><label>Opens at</label><input type="time" value={f.hours.open} onChange={(e) => setHours({ open: e.target.value })} /></div>
                <div className="db-field" style={{ marginBottom: 0 }}><label>Closes at</label><input type="time" value={f.hours.close} onChange={(e) => setHours({ close: e.target.value })} /></div>
              </div>
              <div className="db-togrow" style={{ marginTop: 8 }}>
                <div><div className="tt">Break time (kitchen closed)</div><div className="ts">Afternoon break between lunch &amp; dinner service</div></div>
                <button className={`db-switch${f.hours.breakOn ? " on" : ""}`} onClick={() => setHours({ breakOn: !f.hours.breakOn })} />
              </div>
              {f.hours.breakOn && (
                <div className="db-frow two set-timegrid" style={{ marginTop: 14 }}>
                  <div className="db-field" style={{ marginBottom: 0 }}><label>Break from</label><input type="time" value={f.hours.breakFrom} onChange={(e) => setHours({ breakFrom: e.target.value })} /></div>
                  <div className="db-field" style={{ marginBottom: 0 }}><label>Break to</label><input type="time" value={f.hours.breakTo} onChange={(e) => setHours({ breakTo: e.target.value })} /></div>
                </div>
              )}
            </div>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Account &amp; plan</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Currently on Parosa {planById(restaurant.plan).name}</span></div>
            <div className="db-pb">
              <div className="db-field"><label>Owner email</label><input type="text" value={restaurant.owner_email ?? ""} readOnly style={{ opacity: 0.75 }} /></div>
              <div className="set-plans">
                {PLANS.map((p) => {
                  const on = (restaurant.plan ?? "basic") === p.id;
                  return (
                    <div key={p.id} className={`set-plancard${on ? " on" : ""}`}>
                      {p.popular && <span className="set-planpop">Popular</span>}
                      <div className="set-planname">{p.name}</div>
                      <div className="set-planprice">₹{p.price}<small>/mo</small></div>
                      <div className="set-planblurb">{p.blurb}</div>
                      <button className={on ? "set-plancur" : "set-planbtn"} disabled={on} onClick={() => changePlan(p.id)}>{on ? "Current plan" : "Switch"}</button>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 2px 0" }}>0% commission on every plan. Online billing (Razorpay) is coming soon — you&apos;re in free early access until then.</p>
            </div>
          </div>

          <div className="db-panel set-danger">
            <div className="db-ph"><h3>Danger zone</h3></div>
            <div className="db-pb" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>Delete restaurant</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Permanently removes your menu, QRs and data.</div></div>
              <button className="set-del" onClick={del}>Delete {restaurant.name}</button>
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
