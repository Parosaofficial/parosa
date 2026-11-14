"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, getCurrentUser, signUpOwner } from "@/lib/auth";
import { createRestaurant, generateUniqueSlug, getRestaurantByOwner, updateRestaurant, uploadPhoto } from "@/lib/db";
import { geoMessage, pinCurrentAddress } from "@/lib/geo";
import type { Restaurant } from "@/lib/types";
import "./signup.css";

/*
 * Owner sign-up in two screens, one URL each:
 *   /signup          → create the account (restaurant name, your name, mobile, email, password)
 *   /signup/details  → address + logo (optional — "Skip for now")
 * The account and the restaurant exist after screen 1, so screen 2 can be
 * skipped and finished later in Settings. Everyone starts the 14-day trial;
 * the plan is chosen later in Settings → Plan.
 * If the email needs confirming first, what was typed is kept on this device
 * and filled in again after the owner signs in.
 */
type Step = 0 | 1;
const PATHS = ["/signup", "/signup/details"] as const;
const TITLES = ["Create your account", "Your restaurant's details"];
// old 3-step links (/signup/address, /signup/logo) land on the details screen
const stepOf = (path: string): Step => (path === "/signup" ? 0 : 1);

const DRAFT = "parosa-signup";
type Draft = { name: string; ownerName: string; phone: string };
const readDraft = (): Draft => {
  if (typeof window === "undefined") return { name: "", ownerName: "", phone: "" };
  try { return { name: "", ownerName: "", phone: "", ...JSON.parse(localStorage.getItem(DRAFT) ?? "{}") }; } catch { return { name: "", ownerName: "", phone: "" }; }
};

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
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null); // signed in
  const [rest, setRest] = useState<Restaurant | null>(null);                           // created
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmSent, setConfirmSent] = useState("");

  // screen 1 — the account
  const [draft] = useState(readDraft);
  const [name, setName] = useState(draft.name);
  const [ownerName, setOwnerName] = useState(draft.ownerName);
  const [phone, setPhone] = useState(draft.phone);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  // screen 2 — address + logo
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [logo, setLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const go = (s: Step, replace = false) => {
    setErr("");
    window.history[replace ? "replaceState" : "pushState"](null, "", PATHS[s]);
    window.scrollTo({ top: 0 });
  };

  // Signed in with a restaurant → details screen if they're on it, else the dashboard.
  // Signed in without one (e.g. after confirming their email) → screen 1 without the login fields.
  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (u) {
        setAccount(u);
        const r = await getRestaurantByOwner(u.id);
        if (r) {
          if (stepOf(window.location.pathname) !== 1) { router.replace("/dashboard"); return; }
          setRest(r);
        }
      }
      setChecking(false);
    })();
  }, [router]);

  // Keep URL and data in step: the details screen needs a restaurant.
  useEffect(() => {
    if (checking) return;
    if (step === 1 && !rest) window.history.replaceState(null, "", PATHS[0]);
    else if (path !== PATHS[step]) window.history.replaceState(null, "", PATHS[step]);
  }, [checking, step, path, rest]);

  useEffect(() => { document.title = `${TITLES[step]} · Parosa`; }, [step, checking]);

  // remember what was typed (not the password) in case the email needs confirming
  useEffect(() => {
    try { localStorage.setItem(DRAFT, JSON.stringify({ name, ownerName, phone })); } catch { /* private mode */ }
  }, [name, ownerName, phone]);

  const create = async () => {
    if (busy) return;
    setErr("");
    if (!name.trim()) return setErr("What's your restaurant called?");
    if (!ownerName.trim()) return setErr("Please tell us your name.");
    if (phoneDigits(phone).length !== 10) return setErr("Enter your 10-digit mobile number.");
    if (!account) {
      if (!emailOk(email)) return setErr("Enter a valid email address.");
      if (pass.length < 8) return setErr("Password must be at least 8 characters.");
    }
    setBusy(true);
    try {
      let acc = account;
      if (!acc) {
        const { hasSession } = await signUpOwner(email, pass);
        if (!hasSession) { setBusy(false); setConfirmSent(email.trim().toLowerCase()); return; }
        acc = await getCurrentUser();
        if (!acc) throw new Error("Session lost");
        setAccount(acc); // a retry after a later failure mustn't sign up twice
      }
      const slug = await generateUniqueSlug(name);
      const r = await createRestaurant({
        ownerId: acc.id, slug, name: name.trim(), ownerName: ownerName.trim(),
        ownerEmail: acc.email, phone: `+91${phoneDigits(phone)}`, type: "Restaurant",
      });
      try { localStorage.removeItem(DRAFT); } catch { /* ignore */ }
      setRest(r);
      setBusy(false);
      go(1);
    } catch (e) {
      setBusy(false);
      setErr(authMessage(e));
    }
  };

  const locate = async () => {
    setGeoErr(""); setErr(""); setLocating(true);
    try {
      const p = await pinCurrentAddress();
      setCoords({ latitude: p.latitude, longitude: p.longitude });
      setAddress(p.address); setArea(p.area); setCity(p.city || p.district);
      setDistrict(p.district); setState(p.state); setPincode(p.pincode);
    } catch (e) {
      setGeoErr(geoMessage(e));
    } finally {
      setLocating(false);
    }
  };

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Please choose an image (JPG or PNG).");
    if (f.size > MAX_LOGO_MB * 1024 * 1024) return setErr(`That image is over ${MAX_LOGO_MB} MB — choose a smaller one.`);
    setErr(""); setLogo(URL.createObjectURL(f)); setLogoFile(f);
  };

  const finish = async () => {
    if (!rest || busy) return;
    setErr("");
    if (pincode && !/^\d{6}$/.test(pincode)) return setErr("Pincode must be 6 digits.");
    const patch: Partial<Restaurant> = {};
    if (address.trim()) Object.assign(patch, {
      address: address.trim(), area: area.trim() || null, city: (city || district).trim() || null,
      district: (district || city).trim() || null, state: state.trim() || null, pincode: pincode || null,
      latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
    });
    setBusy(true);
    try {
      if (logoFile) patch.logo_url = await uploadPhoto("logos", logoFile);
      if (Object.keys(patch).length) await updateRestaurant(rest.id, patch);
      router.replace("/dashboard");
    } catch {
      setBusy(false);
      setErr("Couldn't save — check your internet and try again, or skip for now.");
    }
  };

  if (checking) {
    return <div className="su-page su-loading"><Seal size={58} /><span className="su-spin" /></div>;
  }

  if (confirmSent) {
    return (
      <div className="su-page">
        <main className="su-col">
          <div className="su-brand"><Seal size={52} /></div>
          <h1 className="su-h1">Check your email</h1>
          <p className="su-sub">We sent a link to <b>{confirmSent}</b>. Open it to confirm your email, then sign in — your restaurant details are saved on this device.</p>
          <Link href="/login" className="su-prime" style={{ textDecoration: "none" }}>Go to sign in <Arrow /></Link>
          <p className="su-alt">Wrong email? <button type="button" className="su-link" onClick={() => setConfirmSent("")}>Change it</button></p>
        </main>
      </div>
    );
  }

  return (
    <div className="su-page">
      <div className="su-progress" aria-label={`Step ${step + 1} of 2`}>
        {[0, 1].map((i) => <span key={i} className={i === step ? "now" : i < step ? "done" : ""} />)}
      </div>

      <main className="su-col" key={step}>
        <div className="su-brand"><Seal size={52} /></div>

        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); create(); }}>
            <h1 className="su-h1">Create your Parosa account</h1>
            <p className="su-trial">14-day free trial · every feature · no card</p>

            <div className="su-field">
              <label htmlFor="su-name">Restaurant name</label>
              <input id="su-name" type="text" autoComplete="organization" placeholder="e.g. Sharma Ji Ka Dhaba" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="su-field">
              <label htmlFor="su-owner">Your name</label>
              <input id="su-owner" type="text" autoComplete="name" placeholder="Full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
            <div className="su-field">
              <label htmlFor="su-phone">Mobile number</label>
              <div className="su-phone">
                <span>+91</span>
                <input id="su-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            {account ? (
              <p className="su-hint">Signed in as <b>{account.email}</b>.</p>
            ) : (
              <>
                <div className="su-field">
                  <label htmlFor="su-email">Email</label>
                  <input id="su-email" type="email" autoComplete="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="su-field">
                  <label htmlFor="su-pass">Password</label>
                  <div className="su-pass">
                    <input id="su-pass" type={showPass ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={pass} onChange={(e) => setPass(e.target.value)} />
                    <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Hide password" : "Show password"}>{showPass ? "Hide" : "Show"}</button>
                  </div>
                </div>
              </>
            )}

            {err && <div className="su-err" role="alert">{err}</div>}
            <button className="su-prime" type="submit" disabled={busy}>{busy ? "Creating your account…" : <>Create account <Arrow /></>}</button>
            <p className="su-fine">By creating an account you agree to our <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.</p>
            <p className="su-alt">Already have an account? <Link href="/login">Sign in</Link></p>
          </form>
        )}

        {step === 1 && rest && (
          <>
            <h1 className="su-h1">Where is {rest.name}?</h1>
            <p className="su-sub">Your address prints on bills. Your logo shows on the menu.</p>

            <button type="button" className="su-locate" onClick={locate} disabled={locating}>
              {locating ? <span className="su-spin sm" /> : <PinIcon />}
              {locating ? "Finding your location…" : coords ? "Update my location" : "Use my current location"}
            </button>
            {geoErr && <div className="su-warn" role="alert">{geoErr}</div>}
            {coords && (
              <div className="su-pinned">
                <div className="hd"><span>✓ Location pinned</span><em>GPS</em></div>
                <p className="ln2">{[area, city || district, state, pincode].filter(Boolean).join(", ")}</p>
              </div>
            )}

            <div className="su-field">
              <label htmlFor="su-addr">Address <span className="opt">(edit if needed)</span></label>
              <textarea id="su-addr" rows={2} placeholder="Shop no., building, street, area" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="su-row">
              <div className="su-field">
                <label htmlFor="su-city">City</label>
                <input id="su-city" type="text" placeholder="Gurugram" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="su-field">
                <label htmlFor="su-pin">Pincode</label>
                <input id="su-pin" type="text" inputMode="numeric" maxLength={6} placeholder="122001" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>

            <div className="su-field">
              <label>Logo <span className="opt">(optional)</span></label>
              {logo ? (
                <div className="su-logo-pv">
                  <div className="img" style={{ backgroundImage: `url(${logo})` }} />
                  <div className="meta">
                    <b>{rest.name}</b>
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
            </div>

            {err && <div className="su-err" role="alert">{err}</div>}
            <button className="su-prime" onClick={finish} disabled={busy}>{busy ? "Saving…" : <>Open my dashboard <Arrow /></>}</button>
            <p className="su-alt"><button type="button" className="su-link" onClick={() => router.replace("/dashboard")} disabled={busy}>Skip for now</button> — add these later in Settings</p>
          </>
        )}
      </main>
    </div>
  );
}
