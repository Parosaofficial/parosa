"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { deleteRestaurant, updateRestaurant, uploadPhoto } from "@/lib/db";
import { signOutOwner } from "@/lib/auth";
import { useOwner } from "@/lib/useOwner";
import { PLANS, planById } from "@/lib/plans";
import { missingProfile } from "@/lib/profile";
import { cleanUpi, isValidReviewUrl, isValidUpi, upiLink } from "@/lib/upi";
import { Dialog } from "@/components/Dialog";
import type { Hours } from "@/lib/types";
import "../dash.css";
import "./settings.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultHours: Hours = { open: "11:00", close: "23:00", breakOn: false, breakFrom: "15:30", breakTo: "18:00", days: [true, true, true, true, true, true, true] };

type Form = {
  name: string; name_hi: string; tagline: string; description: string;
  phone: string; whatsapp: string; address: string; city: string;
  gstin: string; fssai: string; hours: Hours;
  upi_id: string; review_url: string; review_prompt: boolean;
};

export default function Settings() {
  const router = useRouter();
  const { restaurant, ready, reload } = useOwner();
  const [f, setF] = useState<Form | null>(null);
  const [logo, setLogo] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
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
      upi_id: restaurant.upi_id ?? "", review_url: restaurant.google_review_url ?? "",
      review_prompt: restaurant.review_prompt !== false,
    });
    setLogo(restaurant.logo_url ?? "");
  }, [restaurant]);

  if (!ready || !restaurant || !f) return <AppLoading label="Loading settings…" />;

  const issues = missingProfile(restaurant);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => (p ? { ...p, [k]: v } : p));
  const setHours = (patch: Partial<Hours>) => setF((p) => (p ? { ...p, hours: { ...p.hours, ...patch } } : p));
  const toggleDay = (i: number) => setHours({ days: f.hours.days.map((v, k) => (k === i ? !v : v)) });

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogo(URL.createObjectURL(file)); setLogoFile(file); }
  };

  const upiBad = !!f.upi_id.trim() && !isValidUpi(f.upi_id);
  const reviewBad = !!f.review_url.trim() && !isValidReviewUrl(f.review_url);

  const save = async () => {
    if (!f.name.trim()) { showToast("Restaurant name can't be empty"); return; }
    if (upiBad) { showToast("That UPI ID doesn't look right — it should be like name@bank"); return; }
    if (reviewBad) { showToast("Paste the Google review link that starts with https://"); return; }
    setBusy(true);
    try {
      let logo_url = restaurant.logo_url;
      if (logoFile) logo_url = await uploadPhoto("logos", logoFile);
      await updateRestaurant(restaurant.id, {
        name: f.name.trim(), name_hi: f.name_hi.trim() || null, tagline: f.tagline.trim() || null,
        description: f.description.trim() || null, phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null,
        address: f.address.trim() || null, city: f.city.trim() || null, gstin: f.gstin.trim() || null,
        fssai: f.fssai.trim() || null, hours: f.hours, logo_url,
        upi_id: f.upi_id.trim() ? cleanUpi(f.upi_id) : null,
      });
      setLogoFile(null);
      // Saved separately so the rest of the profile still saves if the
      // review columns (migration 0005) aren't in the database yet.
      let reviewSaved = true;
      try {
        await updateRestaurant(restaurant.id, { google_review_url: f.review_url.trim() || null, review_prompt: f.review_prompt });
      } catch { reviewSaved = false; }
      await reload();
      showToast(reviewSaved ? "Settings saved ✓" : "Saved — but the review link needs the 0005 database update");
    } catch { showToast("Could not save — try again"); }
    finally { setBusy(false); }
  };

  const changePlan = async (id: string) => {
    if (id === (restaurant.plan ?? "basic")) return;
    await updateRestaurant(restaurant.id, { plan: id });
    await reload();
    showToast(`Switched to Parosa ${planById(id).name}`);
  };

  const confirmDelete = async () => {
    setDelBusy(true);
    try {
      await deleteRestaurant(restaurant.id);
      await signOutOwner();
      router.replace("/signup");
    } catch { setDelBusy(false); setDelOpen(false); showToast("Could not delete — try again"); }
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
          {issues.length > 0 && (
            <div className={`set-warn${warnOpen ? " open" : ""}`}>
              <button className="set-warn-hd" onClick={() => setWarnOpen((v) => !v)}>
                <span className="ic">!</span>
                <span className="tx"><b>{issues.length} thing{issues.length > 1 ? "s" : ""} to finish setting up</b><span>Your profile isn&apos;t complete — click to see what&apos;s missing.</span></span>
                <span className="chev">{warnOpen ? "▲" : "▼"}</span>
              </button>
              {warnOpen && (
                <div className="set-warn-list">
                  {issues.map((i) => (
                    <div key={i.key} className="set-warn-item"><span className="dot" /><div><b>{i.label}</b><span>{i.hint}</span></div></div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="db-panel">
            <div className="db-ph"><h3>Restaurant profile</h3></div>
            <div className="db-pb">
              <div className="set-logo">
                <div className="set-logoem">{logo ? <span style={{ width: 52, height: 52, borderRadius: 10, backgroundImage: `url(${logo})`, backgroundSize: "cover", backgroundPosition: "center", display: "block" }} /> : <span className="set-logoempty">No logo</span>}</div>
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

          <div className="db-panel" id="collect">
            <div className="db-ph"><h3>Get paid &amp; get reviews</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Printed on every bill · sent on WhatsApp</span></div>
            <div className="db-pb">
              <div className="set-collect">
                <div className="set-cf">
                  <div className={`db-field${upiBad ? " bad" : ""}`}>
                    <label>Your UPI ID <span className="set-lbl-note">· guests scan &amp; pay the exact bill</span></label>
                    <input type="text" value={f.upi_id} placeholder="rajdarbar@okaxis" autoCapitalize="none" spellCheck={false} onChange={(e) => set("upi_id", e.target.value)} />
                    {upiBad ? <div className="set-err">Should look like <b>name@bank</b> — e.g. rajdarbar@okaxis or 9876543210@ybl</div>
                      : <div className="set-hint">Use a <b>business</b> UPI ID (free from GPay for Business, PhonePe Business or Paytm Business) — personal IDs can be limited by UPI apps. Money goes straight to your bank; Parosa never touches it.</div>}
                  </div>
                </div>
                <div className="set-verify">
                  {f.upi_id.trim() && !upiBad ? (
                    <>
                      <div className="q"><QRCodeSVG value={upiLink({ upi: f.upi_id, name: f.name || "Restaurant" })} size={104} level="M" marginSize={1} fgColor="#2A1414" bgColor="#FFFFFF" /></div>
                      <div className="t"><b>Check before you go live</b>Scan with your own UPI app — it should show <i>your</i> name or business. Then just go back; don&apos;t pay.</div>
                    </>
                  ) : <div className="t muted">Enter your UPI ID to get a test QR — a wrong ID would send guests&apos; money to someone else.</div>}
                </div>
              </div>

              <div className="set-collect" style={{ marginTop: 18 }}>
                <div className="set-cf">
                  <div className={`db-field${reviewBad ? " bad" : ""}`}>
                    <label>Google review link</label>
                    <input type="url" value={f.review_url} placeholder="https://g.page/r/…/review" autoCapitalize="none" spellCheck={false} onChange={(e) => set("review_url", e.target.value)} />
                    {reviewBad ? <div className="set-err">Paste the full link from Google — it starts with https:// (g.page or maps.app.goo.gl)</div>
                      : <div className="set-hint">Where to find it: open <b>Google Maps</b> or search your restaurant on Google → your Business Profile → <b>Ask for reviews</b> → <b>Copy link</b>.</div>}
                  </div>
                </div>
                <div className="set-verify">
                  {f.review_url.trim() && !reviewBad
                    ? <a className="set-test" href={f.review_url.trim()} target="_blank" rel="noopener noreferrer">Test link ↗</a>
                    : <div className="t muted">Paste your link, then test it opens your review box.</div>}
                </div>
              </div>

              <div className="db-togrow" style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
                <div><div className="tt">Ask every guest for a Google review</div><div className="ts">Adds a &ldquo;Rate us on Google&rdquo; QR to printed bills, and the link to WhatsApp bills and the pay page. Google&apos;s rules: ask everyone, and never offer a discount for a review.</div></div>
                <button className={`db-switch${f.review_prompt ? " on" : ""}`} onClick={() => set("review_prompt", !f.review_prompt)} aria-label="Ask for reviews" />
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
              <button className="set-del" onClick={() => setDelOpen(true)}>Delete {restaurant.name}</button>
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
      <Dialog
        open={delOpen}
        title="Delete restaurant?"
        message={`This permanently removes ${restaurant.name}'s menu, tables, QR codes and orders. This can't be undone. Type the restaurant name to confirm.`}
        input
        placeholder={restaurant.name}
        requireMatch={restaurant.name}
        confirmLabel="Delete forever"
        danger
        busy={delBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDelOpen(false)}
      />

      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
