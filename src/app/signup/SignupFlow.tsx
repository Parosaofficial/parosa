"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, getCurrentUserId, signUpOwner } from "@/lib/auth";
import { createRestaurant, generateUniqueSlug, getRestaurantByOwner, uploadPhoto } from "@/lib/db";
import { geoMessage, pinCurrentAddress } from "@/lib/geo";
import "./signup.css";

/*
 * Owner registration in three steps, one URL each:
 *   /signup          → you & your business
 *   /signup/address  → GPS address + FSSAI
 *   /signup/logo     → logo, terms, Register
 * Like the sign-in screen, steps move with history.pushState so this component
 * stays mounted — nothing typed is lost and the browser Back button works.
 * Plan selection happens later, from the dashboard.
 */
type Step = 0 | 1 | 2;
const PATHS = ["/signup", "/signup/address", "/signup/logo"] as const;
const TITLES = ["Create your account", "Your address", "Your logo"];
const stepOf = (path: string): Step => {
  const i = PATHS.indexOf(path as (typeof PATHS)[number]);
  return (i < 0 ? 0 : i) as Step;
};

const TYPES = [
  { id: "Restaurant", icon: "🍽️" },
  { id: "Café", icon: "☕" },
  { id: "Dhaba", icon: "🫓" },
  { id: "Food truck", icon: "🚚" },
  { id: "Other", icon: "🏪" },
];
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const phoneDigits = (p: string) => p.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
const MAX_LOGO_MB = 5;

function PinIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 22 2l-9 19-2-8-8-2z" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function UploadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>;
}

export default function SignupFlow() {
  const router = useRouter();
  const path = usePathname();
  const step = stepOf(path);
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false); // has an account but no restaurant yet
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // step 1 — you & your business
  const [ownerName, setOwnerName] = useState("");
  const [rtype, setRtype] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  // step 2 — address
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [fssai, setFssai] = useState("");
  // step 3 — logo + terms
  const [logo, setLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  const go = (s: Step, replace = false) => {
    setErr("");
    window.history[replace ? "replaceState" : "pushState"](null, "", PATHS[s]);
    window.scrollTo({ top: 0 });
  };

  // Already has a restaurant → dashboard. Signed in without one → skip the login fields.
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        if (await getRestaurantByOwner(uid)) { router.replace("/dashboard"); return; }
        setSignedIn(true);
      }
      setChecking(false);
    })();
  }, [router]);

  const step1Valid = !!(ownerName.trim() && rtype && name.trim() &&
    (signedIn || (phoneDigits(phone).length === 10 && emailOk(email) && pass.length >= 6)));
  const step2Valid = !!(address.trim() && district.trim() && state.trim() && /^\d{6}$/.test(pincode));

  // A later step opened directly (refresh, old /signup/plan link) without the
  // earlier answers goes back to the first unanswered step.
  useEffect(() => {
    if (checking) return;
    if (step >= 1 && !step1Valid) window.history.replaceState(null, "", PATHS[0]);
    else if (step === 2 && !step2Valid) window.history.replaceState(null, "", PATHS[1]);
    else if (path !== PATHS[step]) window.history.replaceState(null, "", PATHS[0]);
  }, [checking, step, path, step1Valid, step2Valid]);

  useEffect(() => { document.title = `${TITLES[step]} · Parosa`; }, [step, checking]);

  const next1 = () => {
    if (!ownerName.trim()) return setErr("Please tell us your name.");
    if (!rtype) return setErr("Choose what type of business you run.");
    if (!name.trim()) return setErr("What's your business called?");
    if (!signedIn) {
      if (phoneDigits(phone).length !== 10) return setErr("Enter your 10-digit mobile number.");
      if (!emailOk(email)) return setErr("Enter a valid email address.");
      if (pass.length < 6) return setErr("Password must be at least 6 characters.");
    }
    go(1);
  };

  const locate = async () => {
    setGeoErr(""); setErr(""); setLocating(true);
    try {
      const p = await pinCurrentAddress();
      setCoords({ latitude: p.latitude, longitude: p.longitude });
      setAddress(p.address); setArea(p.area); setCity(p.city);
      setDistrict(p.district); setState(p.state); setPincode(p.pincode);
    } catch (e) {
      setGeoErr(geoMessage(e));
    } finally {
      setLocating(false);
      setShowEdit(true);
    }
  };

  const next2 = () => {
    if (!showEdit) return setErr("Tap “Use current location”, or type your address.");
    if (!address.trim()) return setErr("Add your shop / street address.");
    if (!district.trim()) return setErr("Add your district.");
    if (!state.trim()) return setErr("Add your state.");
    if (!/^\d{6}$/.test(pincode)) return setErr("Pincode must be 6 digits.");
    if (fssai.trim() && !/^\d{14}$/.test(fssai.trim())) return setErr("FSSAI number is 14 digits — check it, or leave it empty.");
    go(2);
  };

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Please choose an image (JPG or PNG).");
    if (f.size > MAX_LOGO_MB * 1024 * 1024) return setErr(`That image is over ${MAX_LOGO_MB} MB — choose a smaller one.`);
    setErr(""); setLogo(URL.createObjectURL(f)); setLogoFile(f);
  };

  const register = async () => {
    if (!agreed) return setErr("Please accept the Terms & Conditions to continue.");
    setErr(""); setBusy(true);
    try {
      if (!signedIn) {
        const { hasSession } = await signUpOwner(email, pass);
        if (!hasSession) {
          setBusy(false);
          setErr("Almost there — check your inbox to confirm your email, then sign in.");
          return;
        }
        setSignedIn(true); // a retry after a later failure mustn't sign up twice
      }
      const uid = await getCurrentUserId();
      if (!uid) throw new Error("Session lost");
      const logoUrl = logoFile ? await uploadPhoto("logos", logoFile) : null;
      const slug = await generateUniqueSlug(name);
      await createRestaurant({
        ownerId: uid, slug, name: name.trim(), ownerName: ownerName.trim(),
        ownerEmail: email.trim().toLowerCase(),
        phone: phone ? `+91${phoneDigits(phone)}` : undefined,
        address: address.trim(), area: area.trim(), city: (city || district).trim(),
        district: district.trim(), state: state.trim(), pincode,
        latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
        type: rtype, fssai: fssai.trim(), logoUrl,
      });
      router.replace("/dashboard");
    } catch (e) {
      setBusy(false);
      setErr(authMessage(e));
    }
  };

  if (checking) {
    return <div className="su-page su-loading"><Seal size={58} /><span className="su-spin" /></div>;
  }

  return (
    <div className="su-page">
      <div className="su-progress" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => <span key={i} className={i === step ? "now" : i < step ? "done" : ""} />)}
      </div>

      <main className="su-col" key={step}>
        <div className="su-brand"><Seal size={52} /></div>

        {step === 0 && (
          <>
            <h1 className="su-h1">Welcome aboard! 👋</h1>
            <p className="su-sub">Tell us a bit about you and your business.</p>

            <div className="su-field">
              <label htmlFor="su-owner">Your name</label>
              <input id="su-owner" type="text" autoComplete="name" placeholder="Full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>

            <div className="su-field">
              <label>Business type</label>
              <div className="su-types" role="radiogroup" aria-label="Business type">
                {TYPES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={rtype === t.id} className={rtype === t.id ? "on" : ""} onClick={() => setRtype(t.id)}>
                    <span className="ic" aria-hidden>{t.icon}</span>{t.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="su-field">
              <label htmlFor="su-name">Business name</label>
              <input id="su-name" type="text" placeholder="e.g. Sharma Ji Ka Dhaba" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {!signedIn && (
              <>
                <div className="su-divider"><span>Your login</span></div>
                <div className="su-field">
                  <label htmlFor="su-phone">Mobile number</label>
                  <div className="su-phone">
                    <span>+91</span>
                    <input id="su-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="su-field">
                  <label htmlFor="su-email">Email</label>
                  <input id="su-email" type="email" autoComplete="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="su-field">
                  <label htmlFor="su-pass">Password</label>
                  <input id="su-pass" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && next1()} />
                </div>
              </>
            )}

            {err && <div className="su-err" role="alert">{err}</div>}
            <button className="su-prime" onClick={next1}>Continue <Arrow /></button>
            <p className="su-alt">Already registered? <Link href="/login">Sign in</Link></p>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="su-h1">Where are you located?</h1>
            <p className="su-sub">Customers and bills will show this address.</p>

            <div className="su-field">
              <label>Business address</label>
              <button type="button" className="su-locate" onClick={locate} disabled={locating}>
                {locating ? <span className="su-spin sm" /> : <PinIcon />}
                {locating ? "Finding your location…" : coords ? "Update current location" : "Use current location"}
              </button>
              <p className="su-hint">Tap this while you are at your business — we read the GPS point and fill your address for you.</p>
            </div>

            {geoErr && <div className="su-warn" role="alert">{geoErr}</div>}

            {coords && (
              <div className="su-pinned">
                <div className="hd"><span>✓ Location pinned</span><em>GPS verified</em></div>
                <p className="ln">{address || "Add your street address below"}</p>
                <p className="ln2">{[district, state, pincode].filter(Boolean).join(" · ")}</p>
              </div>
            )}

            {showEdit ? (
              <div className="su-edit">
                <div className="su-edit-hd">{coords ? "Check & edit details" : "Enter your address"}</div>
                <div className="su-field">
                  <label htmlFor="su-addr">Address</label>
                  <textarea id="su-addr" rows={2} placeholder="Shop no., building, street, area" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="su-row">
                  <div className="su-field">
                    <label htmlFor="su-dist">District</label>
                    <input id="su-dist" type="text" placeholder="Gurugram" value={district} onChange={(e) => setDistrict(e.target.value)} />
                  </div>
                  <div className="su-field">
                    <label htmlFor="su-state">State</label>
                    <input id="su-state" type="text" placeholder="Haryana" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                </div>
                <div className="su-field">
                  <label htmlFor="su-pin">Pincode</label>
                  <input id="su-pin" type="text" inputMode="numeric" maxLength={6} placeholder="122001" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
            ) : (
              <button type="button" className="su-link" onClick={() => setShowEdit(true)}>Type the address instead</button>
            )}

            <div className="su-field" style={{ marginTop: 26 }}>
              <label htmlFor="su-fssai">FSSAI registration number <span className="opt">(Optional)</span></label>
              <input id="su-fssai" type="text" inputMode="numeric" maxLength={14} placeholder="14-digit number" value={fssai} onChange={(e) => setFssai(e.target.value.replace(/\D/g, ""))} />
            </div>

            {err && <div className="su-err" role="alert">{err}</div>}
            <div className="su-nav">
              <button className="su-back" onClick={() => go(0)}>Back</button>
              <button className="su-prime" onClick={next2}>Continue <Arrow /></button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="su-h1">Add your logo</h1>
            <p className="su-sub">It shows on your menu, QR stands and bills.</p>

            <div className="su-field">
              {logo ? (
                <div className="su-logo-pv">
                  <div className="img" style={{ backgroundImage: `url(${logo})` }} />
                  <div className="meta">
                    <b>{name}</b>
                    <label className="su-link">Change<input type="file" accept="image/*" hidden onChange={pickLogo} /></label>
                    <button type="button" className="su-link muted" onClick={() => { setLogo(""); setLogoFile(null); }}>Remove</button>
                  </div>
                </div>
              ) : (
                <label className="su-drop">
                  <input type="file" accept="image/*" hidden onChange={pickLogo} />
                  <UploadIcon />
                  <b>Upload logo</b>
                  <span>JPG or PNG · up to {MAX_LOGO_MB} MB · square looks best</span>
                </label>
              )}
              {!logo && <p className="su-hint">No logo yet? You can skip this and add it later in Settings.</p>}
            </div>

            <label className="su-check">
              <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErr(""); }} />
              <span>I agree to Parosa&apos;s <a href="/terms" target="_blank">Terms &amp; Conditions</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.</span>
            </label>

            {err && <div className="su-err" role="alert">{err}</div>}
            <div className="su-nav">
              <button className="su-back" onClick={() => go(1)} disabled={busy}>Back</button>
              <button className="su-prime" onClick={register} disabled={busy || !agreed}>
                {busy ? "Registering…" : <>Register <Arrow /></>}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
