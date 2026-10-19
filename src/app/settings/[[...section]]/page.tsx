"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { deleteRestaurant, updateRestaurant, uploadPhoto } from "@/lib/db";
import { signOutOwner } from "@/lib/auth";
import { useOwner } from "@/lib/useOwner";
import { PLANS, planById } from "@/lib/plans";
import { missingProfile } from "@/lib/profile";
import { geoMessage, pinCurrentAddress } from "@/lib/geo";
import { cleanUpi, isValidReviewUrl, isValidUpi, upiLink } from "@/lib/upi";
import { Dialog } from "@/components/Dialog";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/components/LegalShell";
import type { Hours, Restaurant } from "@/lib/types";
import "../../dash.css";
import "../settings.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultHours: Hours = { open: "11:00", close: "23:00", breakOn: false, breakFrom: "15:30", breakTo: "18:00", days: [true, true, true, true, true, true, true] };

type Form = {
  name: string; name_hi: string; tagline: string; description: string;
  phone: string; whatsapp: string;
  address: string; city: string; district: string; state: string; pincode: string;
  latitude: number | null; longitude: number | null;
  gstin: string; fssai: string; hours: Hours;
  upi_id: string; review_url: string; review_prompt: boolean;
};

/*
 * Settings home is a grid of small tiles; each tile opens one section at its
 * own URL (/settings/payments …). Like signup, sections switch with
 * history.pushState so unsaved edits survive moving between them.
 */
type SectionId = "profile" | "location" | "hours" | "contact" | "payments" | "licences" | "plan" | "account";
type Section = { id: SectionId; title: string; icon: ReactNode; tint: string; missing: string[]; save: boolean };

const ICONS: Record<SectionId, ReactNode> = {
  profile: <><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></>,
  location: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  hours: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  contact: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  payments: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h7v-4" /></>,
  licences: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  plan: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

function sectionsFor(r: Restaurant): Section[] {
  const miss = new Set(missingProfile(r).map((i) => i.key));
  const m = (...keys: string[]) => keys.filter((k) => miss.has(k));
  return [
    { id: "profile", title: "Business profile", tint: "#F6E3E1", icon: ICONS.profile, missing: m("logo"), save: true },
    { id: "location", title: "Address & location", tint: "#E2F3E8", icon: ICONS.location, missing: m("address"), save: true },
    { id: "hours", title: "Opening hours", tint: "#FBEBD3", icon: ICONS.hours, missing: [], save: true },
    { id: "contact", title: "Contact numbers", tint: "#E3EDF8", icon: ICONS.contact, missing: m("phone"), save: true },
    { id: "payments", title: "Payments & reviews", tint: "#EFE5F6", icon: ICONS.payments, missing: [], save: true },
    { id: "licences", title: "GSTIN & FSSAI", tint: "#F3EEDC", icon: ICONS.licences, missing: m("gstin", "fssai"), save: true },
    { id: "plan", title: "Plan & subscription", tint: "#FBEFD6", icon: ICONS.plan, missing: [], save: false },
    { id: "account", title: "Account", tint: "#ECE8E4", icon: ICONS.account, missing: [], save: false },
  ];
}

const sectionOf = (path: string): SectionId | null => {
  const id = path.replace(/^\/settings\/?/, "").split("/")[0];
  return (["profile", "location", "hours", "contact", "payments", "licences", "plan", "account"] as string[]).includes(id) ? (id as SectionId) : null;
};

const fmt12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};

function Chevron() {
  return <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>;
}

export default function Settings() {
  const router = useRouter();
  const path = usePathname();
  const open = sectionOf(path);
  const { restaurant, ready, reload } = useOwner();
  const [f, setF] = useState<Form | null>(null);
  const [logo, setLogo] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    if (!restaurant) return;
    setF({
      name: restaurant.name ?? "", name_hi: restaurant.name_hi ?? "",
      tagline: restaurant.tagline ?? "", description: restaurant.description ?? "",
      phone: restaurant.phone ?? "", whatsapp: restaurant.whatsapp ?? "",
      address: restaurant.address ?? "", city: restaurant.city ?? "",
      district: restaurant.district ?? "", state: restaurant.state ?? "", pincode: restaurant.pincode ?? "",
      latitude: restaurant.latitude ?? null, longitude: restaurant.longitude ?? null,
      gstin: restaurant.gstin ?? "", fssai: restaurant.fssai ?? "",
      hours: restaurant.hours ?? defaultHours,
      upi_id: restaurant.upi_id ?? "", review_url: restaurant.google_review_url ?? "",
      review_prompt: restaurant.review_prompt !== false,
    });
    setLogo(restaurant.logo_url ?? "");
  }, [restaurant]);

  // Old links (/settings#collect from Orders and Tables) open the payments section.
  useEffect(() => {
    if (window.location.hash === "#collect") window.history.replaceState(null, "", "/settings/payments");
    else if (path !== "/settings" && !sectionOf(path)) window.history.replaceState(null, "", "/settings");
  }, [path]);

  if (!ready || !restaurant || !f) return <AppLoading label="Loading settings…" />;

  const sections = sectionsFor(restaurant);
  const current = sections.find((s) => s.id === open) ?? null;
  const go = (id: SectionId | null) => {
    window.history.pushState(null, "", id ? `/settings/${id}` : "/settings");
    window.scrollTo({ top: 0 });
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => (p ? { ...p, [k]: v } : p));
  const setHours = (patch: Partial<Hours>) => setF((p) => (p ? { ...p, hours: { ...p.hours, ...patch } } : p));
  const toggleDay = (i: number) => setHours({ days: f.hours.days.map((v, k) => (k === i ? !v : v)) });

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogo(URL.createObjectURL(file)); setLogoFile(file); }
  };

  const locate = async () => {
    setGeoErr(""); setLocating(true);
    try {
      const p = await pinCurrentAddress();
      setF((prev) => prev && {
        ...prev, latitude: p.latitude, longitude: p.longitude,
        address: p.address || prev.address, city: p.city || p.district || prev.city,
        district: p.district || prev.district, state: p.state || prev.state, pincode: p.pincode || prev.pincode,
      });
    } catch (e) { setGeoErr(geoMessage(e)); }
    finally { setLocating(false); }
  };

  const upiBad = !!f.upi_id.trim() && !isValidUpi(f.upi_id);
  const reviewBad = !!f.review_url.trim() && !isValidReviewUrl(f.review_url);
  const pinBad = !!f.pincode.trim() && !/^\d{6}$/.test(f.pincode.trim());

  const save = async () => {
    if (!f.name.trim()) { showToast("Business name can't be empty"); return; }
    if (upiBad) { showToast("That UPI ID doesn't look right — it should be like name@bank"); return; }
    if (reviewBad) { showToast("Paste the Google review link that starts with https://"); return; }
    if (pinBad) { showToast("Pincode must be 6 digits"); return; }
    setBusy(true);
    try {
      let logo_url = restaurant.logo_url;
      if (logoFile) logo_url = await uploadPhoto("logos", logoFile);
      await updateRestaurant(restaurant.id, {
        name: f.name.trim(), name_hi: f.name_hi.trim() || null, tagline: f.tagline.trim() || null,
        description: f.description.trim() || null, phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null,
        address: f.address.trim() || null, city: f.city.trim() || null, pincode: f.pincode.trim() || null,
        gstin: f.gstin.trim() || null, fssai: f.fssai.trim() || null, hours: f.hours, logo_url,
        upi_id: f.upi_id.trim() ? cleanUpi(f.upi_id) : null,
      });
      setLogoFile(null);
      // Saved separately so the rest of the profile still saves if these
      // columns (migrations 0005 and 0011) aren't in the database yet.
      let extrasSaved = true;
      try {
        await updateRestaurant(restaurant.id, { google_review_url: f.review_url.trim() || null, review_prompt: f.review_prompt });
      } catch { extrasSaved = false; }
      try {
        await updateRestaurant(restaurant.id, {
          district: f.district.trim() || null, state: f.state.trim() || null,
          latitude: f.latitude, longitude: f.longitude,
        });
      } catch { extrasSaved = false; }
      await reload();
      showToast(extrasSaved ? "Saved ✓" : "Saved — some fields need a database update first");
    } catch { showToast("Could not save — try again"); }
    finally { setBusy(false); }
  };

  const changePlan = async (id: string) => {
    if (id === (restaurant.plan ?? "basic")) return;
    await updateRestaurant(restaurant.id, { plan: id });
    await reload();
    showToast(`Switched to Parosa ${planById(id).name}`);
  };

  const signOut = async () => { await signOutOwner(); router.replace("/login"); };

  const confirmDelete = async () => {
    setDelBusy(true);
    try {
      await deleteRestaurant(restaurant.id);
      await signOutOwner();
      router.replace("/signup");
    } catch { setDelBusy(false); setDelOpen(false); showToast("Could not delete — try again"); }
  };

  // One-line summary under each tile title — shows what's saved right now.
  const h = restaurant.hours ?? defaultHours;
  const summary: Record<SectionId, string> = {
    profile: [restaurant.name, restaurant.tagline].filter(Boolean).join(" · "),
    location: [restaurant.address, restaurant.city].filter(Boolean).join(", ") || "Add your address",
    hours: `${fmt12(h.open)} – ${fmt12(h.close)} · ${h.days.every(Boolean) ? "Open daily" : `${h.days.filter(Boolean).length} days a week`}`,
    contact: restaurant.phone || "Add a phone number",
    payments: [restaurant.upi_id ? `UPI ${restaurant.upi_id}` : "No UPI ID", restaurant.google_review_url ? "Review link set" : "No review link"].join(" · "),
    licences: [restaurant.gstin ? "GSTIN added" : "", restaurant.fssai ? "FSSAI added" : ""].filter(Boolean).join(" · ") || "Add your licence numbers",
    plan: `Parosa ${planById(restaurant.plan).name}`,
    account: restaurant.owner_email ?? "Sign out or delete",
  };

  // Setup checklist on the home screen — each item opens the section that fixes it.
  const checklist: { done: boolean; yes: string; todo: string; to: SectionId }[] = [
    { done: !!restaurant.logo_url, yes: "Logo uploaded", todo: "Upload your logo", to: "profile" },
    { done: !!restaurant.address, yes: "Address added", todo: "Add your address", to: "location" },
    { done: !!restaurant.phone, yes: "Phone number added", todo: "Add a phone number", to: "contact" },
    { done: !!restaurant.upi_id, yes: "UPI ID added", todo: "Add your UPI ID", to: "payments" },
    { done: !!restaurant.google_review_url, yes: "Google review link added", todo: "Add Google review link", to: "payments" },
    { done: !!restaurant.gstin, yes: "GSTIN added", todo: "Add GSTIN", to: "licences" },
    { done: !!restaurant.fssai, yes: "FSSAI number added", todo: "Add FSSAI number", to: "licences" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const menuUrl = typeof window === "undefined" ? `/${restaurant.slug}/menu/1` : `${window.location.origin}/${restaurant.slug}/menu/1`;
  const place = [restaurant.type, [restaurant.city || restaurant.district, restaurant.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const shareMenu = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: restaurant.name, text: `See our menu — ${restaurant.name}`, url: menuUrl }); return; }
      await navigator.clipboard.writeText(menuUrl);
      showToast("Menu link copied ✓");
    } catch { /* share sheet closed */ }
  };

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main set-simple">
        <div className="db-topbar">
          {current ? (
            <div className="set-crumb">
              <button className="set-backbtn" onClick={() => go(null)} aria-label="Back to settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
              </button>
              <div><p>Settings</p><h1>{current.title}</h1></div>
            </div>
          ) : (
            <div><h1>Settings</h1><p>Your business, payments and account.</p></div>
          )}
          {current?.save && (
            <div className="db-acts"><button className="db-btn prime" onClick={save} disabled={busy}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg> {busy ? "Saving…" : "Save"}</button></div>
          )}
        </div>

        <div className={`db-content set-wrap${current ? "" : " home"}`} key={open ?? "home"}>
          {!current && (
            <>
              <section className="set-hero">
                <div className="who">
                  {restaurant.logo_url
                    ? <span className="lg" style={{ backgroundImage: `url(${restaurant.logo_url})` }} />
                    : <span className="lg empty">{restaurant.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>}
                  <div className="nm">
                    <b>{restaurant.name}</b>
                    {place && <span>{place}</span>}
                    <a href={menuUrl} target="_blank" rel="noopener noreferrer">{menuUrl.replace(/^https?:\/\//, "").replace(/\/1$/, "")}</a>
                  </div>
                </div>
                <div className="prog">
                  <div className="pt"><b>Profile {pct}% complete</b><span>{pct === 100 ? "All set" : `${checklist.length - doneCount} left`}</span></div>
                  <div className="set-bar"><i style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="acts">
                  <a className="db-btn" href={menuUrl} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg> View menu
                  </a>
                  <button className="db-btn prime" onClick={shareMenu}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg> Share menu
                  </button>
                </div>
              </section>

              <div className="set-tiles">
                {sections.map((s) => (
                  <button key={s.id} className="set-tile" onClick={() => go(s.id)}>
                    <span className="ic" style={{ background: s.tint }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg></span>
                    <span className="tx"><b>{s.title}</b><span>{summary[s.id]}</span></span>
                    {s.missing.length > 0 && <span className="add">Add</span>}
                    <Chevron />
                  </button>
                ))}
              </div>

              <div className="set-bottom">
                <section className="set-card set-check">
                  <h3>{doneCount === checklist.length ? "You're all set up ✓" : "Finish setting up"}</h3>
                  <ul>
                    {checklist.map((c) => (
                      <li key={c.yes}>
                        <button className={c.done ? "done" : ""} onClick={() => go(c.to)}>
                          <span className="mk" aria-hidden>{c.done ? "✓" : ""}</span>{c.done ? c.yes : c.todo}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="set-card set-links">
                  <h3>Quick links</h3>
                  <Link href="/tables">Download table QRs</Link>
                  <Link href="/menu-editor">Edit menu &amp; dishes</Link>
                  <Link href="/templates">Change menu design</Link>
                </section>
                <section className="set-card set-links">
                  <h3>Need help?</h3>
                  <a href={`mailto:${SUPPORT_EMAIL}`}>Email support</a>
                  <span className="mail">{SUPPORT_EMAIL}</span>
                  <Link href="/terms" target="_blank">Terms &amp; privacy</Link>
                </section>
              </div>
            </>
          )}

          {open === "profile" && (
            <div className="db-panel"><div className="db-pb">
              <div className="set-logo">
                <div className="set-logoem">{logo ? <span style={{ width: 52, height: 52, borderRadius: 10, backgroundImage: `url(${logo})`, backgroundSize: "cover", backgroundPosition: "center", display: "block" }} /> : <span className="set-logoempty">No logo</span>}</div>
                <div><div className="set-lu">Business logo</div><div className="set-ls">PNG/JPG, square, max 1MB</div><label className="set-upl" style={{ cursor: "pointer" }}><input type="file" accept="image/*" hidden onChange={pickLogo} />{logo ? "Change logo" : "Upload logo"}</label></div>
              </div>
              <div className="db-frow two">
                <div className="db-field"><label>Name (English)</label><input type="text" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="db-field"><label>नाम (हिंदी)</label><input type="text" value={f.name_hi} placeholder="राज दरबार" onChange={(e) => set("name_hi", e.target.value)} /></div>
              </div>
              <div className="db-field"><label>Tagline</label><input type="text" value={f.tagline} placeholder="Royal North-Indian since 1994" onChange={(e) => set("tagline", e.target.value)} /></div>
              <div className="db-field"><label>Short description</label><textarea value={f.description} placeholder="Slow-cooked curries, clay-oven kebabs and dum biryani." onChange={(e) => set("description", e.target.value)} /></div>
            </div></div>
          )}

          {open === "location" && (
            <div className="db-panel"><div className="db-pb">
              <button type="button" className="set-locate" onClick={locate} disabled={locating}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 22 2l-9 19-2-8-8-2z" /></svg>
                {locating ? "Finding your location…" : "Use current location"}
              </button>
              <p className="set-hint" style={{ textAlign: "center", marginBottom: 14 }}>Tap this while you are at your business — it fills the address from your phone&apos;s GPS.</p>
              {geoErr && <div className="set-geoerr">{geoErr}</div>}
              {f.latitude != null && f.longitude != null && (
                <div className="set-gps"><span>✓ GPS location set</span><b>{f.latitude.toFixed(6)}, {f.longitude.toFixed(6)}</b></div>
              )}
              <div className="db-field"><label>Address</label><input type="text" value={f.address} placeholder="Shop no., street, area" onChange={(e) => set("address", e.target.value)} /></div>
              <div className="db-frow two">
                <div className="db-field"><label>City</label><input type="text" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
                <div className="db-field"><label>District</label><input type="text" value={f.district} onChange={(e) => set("district", e.target.value)} /></div>
              </div>
              <div className="db-frow two">
                <div className="db-field"><label>State</label><input type="text" value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
                <div className={`db-field${pinBad ? " bad" : ""}`}><label>Pincode</label><input type="text" inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} /></div>
              </div>
            </div></div>
          )}

          {open === "hours" && (
            <div className="db-panel"><div className="db-pb">
              <div className="db-field"><label>Open on</label>
                <div className="set-days">{DAYS.map((d, i) => <button key={d} className={`set-day${f.hours.days[i] ? " on" : ""}`} onClick={() => toggleDay(i)} aria-label={d}>{d[0]}</button>)}</div>
              </div>
              <div className="db-frow two set-timegrid" style={{ marginTop: 4 }}>
                <div className="db-field" style={{ marginBottom: 0 }}><label>Opens at</label><input type="time" value={f.hours.open} onChange={(e) => setHours({ open: e.target.value })} /></div>
                <div className="db-field" style={{ marginBottom: 0 }}><label>Closes at</label><input type="time" value={f.hours.close} onChange={(e) => setHours({ close: e.target.value })} /></div>
              </div>
              <div className="db-togrow" style={{ marginTop: 8 }}>
                <div><div className="tt">Break time (kitchen closed)</div><div className="ts">Afternoon break between lunch &amp; dinner service</div></div>
                <button className={`db-switch${f.hours.breakOn ? " on" : ""}`} onClick={() => setHours({ breakOn: !f.hours.breakOn })} aria-label="Break time" />
              </div>
              {f.hours.breakOn && (
                <div className="db-frow two set-timegrid" style={{ marginTop: 14 }}>
                  <div className="db-field" style={{ marginBottom: 0 }}><label>Break from</label><input type="time" value={f.hours.breakFrom} onChange={(e) => setHours({ breakFrom: e.target.value })} /></div>
                  <div className="db-field" style={{ marginBottom: 0 }}><label>Break to</label><input type="time" value={f.hours.breakTo} onChange={(e) => setHours({ breakTo: e.target.value })} /></div>
                </div>
              )}
            </div></div>
          )}

          {open === "contact" && (
            <div className="db-panel"><div className="db-pb">
              <div className="db-frow two">
                <div className="db-field"><label>Phone</label><input type="text" value={f.phone} placeholder="+91 98765 43210" onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="db-field"><label>WhatsApp number <span className="set-lbl-note">· for bills</span></label><input type="text" value={f.whatsapp} placeholder="+91 98765 43210" onChange={(e) => set("whatsapp", e.target.value)} /></div>
              </div>
            </div></div>
          )}

          {open === "payments" && (
            <div className="db-panel"><div className="db-pb">
              <p className="set-hint" style={{ marginTop: 0, marginBottom: 14 }}>Printed on every bill and sent on WhatsApp.</p>
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
            </div></div>
          )}

          {open === "licences" && (
            <div className="db-panel"><div className="db-pb">
              <div className="db-frow two">
                <div className="db-field"><label>GSTIN</label><input type="text" value={f.gstin} placeholder="06ABCDE1234F1Z5" onChange={(e) => set("gstin", e.target.value.toUpperCase())} /></div>
                <div className="db-field"><label>FSSAI number</label><input type="text" inputMode="numeric" maxLength={14} value={f.fssai} placeholder="14-digit number" onChange={(e) => set("fssai", e.target.value.replace(/\D/g, ""))} /></div>
              </div>
              <p className="set-hint" style={{ marginTop: 0 }}>Both print on your bills. Food businesses must show their FSSAI number.</p>
            </div></div>
          )}

          {open === "plan" && (
            <div className="db-panel"><div className="db-pb">
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
              <p className="set-hint" style={{ margin: "12px 2px 0" }}>0% commission on every plan. Online billing (Razorpay) is coming soon — you&apos;re in free early access until then.</p>
            </div></div>
          )}

          {open === "account" && (
            <>
              <div className="db-panel"><div className="db-pb">
                <div className="db-field"><label>Owner email</label><input type="text" value={restaurant.owner_email ?? ""} readOnly style={{ opacity: 0.75 }} /></div>
                <button className="db-btn" onClick={signOut}>Sign out</button>
              </div></div>
              <div className="db-panel set-danger">
                <div className="db-pb set-dangerrow">
                  <div><div className="tt">Delete business</div><div className="ts">Permanently removes your menu, QRs and data.</div></div>
                  <button className="set-del" onClick={() => setDelOpen(true)}>Delete {restaurant.name}</button>
                </div>
              </div>
            </>
          )}
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
