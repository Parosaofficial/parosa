"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import "./login.css";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.2-4.9 3.2-8Z" />
      <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.2H2.3a11 11 0 0 0 0 9.9L6 14.3Z" />
      <path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.2L6 10.1c.9-2.6 3.2-4.6 6-4.6Z" />
    </svg>
  );
}
function MailIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}
function Bloom({ className }: { className: string }) {
  const petals = Array.from({ length: 12 });
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        {petals.map((_, i) => <ellipse key={i} cx="0" cy="-58" rx="15" ry="40" transform={`rotate(${i * 30})`} />)}
        {petals.map((_, i) => <ellipse key={"b" + i} cx="0" cy="-40" rx="9" ry="24" transform={`rotate(${i * 30 + 15})`} />)}
        <circle r="15" /><circle r="7" />
      </g>
    </svg>
  );
}

const TYPES = ["Restaurant", "Dhaba", "Food truck", "Small cafe", "Other"];
const VISITORS = ["Less than 50", "50–100", "100–200", "200+"];

function Drop({ label, img, onPick, onRemove }: { label: string; img: string; onPick: (e: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return (
    <div className="lg-field">
      <label>{label} <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label>
      {img ? (
        <div className="lg-logopreview"><div className="pv" style={{ backgroundImage: `url(${img})` }} /><button className="lg-choice" onClick={onRemove}>Remove</button></div>
      ) : (
        <label className="lg-drop"><input type="file" accept="image/*" hidden onChange={onPick} /><b>Click to upload</b><span>JPG/PNG image</span></label>
      )}
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [step, setStep] = useState(0);
  const [rtype, setRtype] = useState("Restaurant");
  const [visitors, setVisitors] = useState("50–100");
  const [logo, setLogo] = useState("");
  const [gst, setGst] = useState("");
  const [fssai, setFssai] = useState("");

  const enter = () => router.push("/dashboard");
  const toSignin = () => { setMode("signin"); setStep(0); };
  const pick = (set: (s: string) => void) => (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) set(URL.createObjectURL(f)); };

  return (
    <div className="lg-page">
      <Bloom className="lg-bloom tl" />
      <Bloom className="lg-bloom r" />
      <Bloom className="lg-bloom bl" />

      <div className="lg-tag-tr">भारत के<br />हर रेस्टोरेंट के लिए<span className="u" /></div>
      <div className="lg-tag-br">GOOD FOOD<br />BUILDS<br />BETTER STORIES<span className="u" /></div>

      <div className="lg-card">
        <div className="lg-logo">
          <Seal size={66} />
          <div className="lg-wm">परोसा</div>
          <div className="lg-en">PAROSA</div>
          <div className="lg-portal">Restaurant Partner Portal</div>
          <div className="lg-div"><span className="ln" />❖<span className="ln" /></div>
        </div>

        <div className="lg-switch" key={mode === "create" ? `c${step}` : "s"}>
          {mode === "signin" ? (
            <>
              <h1 className="lg-welcome">Welcome to Parosa</h1>
              <p className="lg-sub">Sign in to manage your restaurant</p>
              <button className="lg-gbtn" onClick={enter}><GoogleIcon /> Continue with Google</button>
              <div className="lg-or"><span className="ln" />OR<span className="ln" /></div>
              <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" placeholder="you@restaurant.com" /></div></div>
              <button className="lg-prime" onClick={enter}>Continue →</button>
              <p className="lg-alt">Don&apos;t have a restaurant yet? <a onClick={() => { setMode("create"); setStep(0); }}>Create restaurant</a></p>
            </>
          ) : (
            <>
              <div className="lg-steps">{[0, 1, 2].map((i) => <span key={i} className={`s${i <= step ? " on" : ""}`} />)}</div>

              {step === 0 && (
                <>
                  <h2 className="lg-h2">Create your account</h2>
                  <p className="lg-sub">Step 1 — you &amp; your restaurant</p>
                  <button className="lg-gbtn" onClick={() => setStep(1)}><GoogleIcon /> Sign up with Google</button>
                  <div className="lg-or"><span className="ln" />OR FILL IN<span className="ln" /></div>
                  <div className="lg-field"><label>Restaurant name</label><input type="text" placeholder="Raj Darbar" /></div>
                  <div className="lg-field"><label>Owner name</label><input type="text" placeholder="Your full name" /></div>
                  <div className="lg-frow two">
                    <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" placeholder="you@restaurant.com" /></div></div>
                    <div className="lg-field"><label>Phone number</label><input type="tel" placeholder="+91 98765 43210" /></div>
                  </div>
                  <Drop label="Logo" img={logo} onPick={pick(setLogo)} onRemove={() => setLogo("")} />
                  <button className="lg-prime" onClick={() => setStep(1)}>Continue →</button>
                  <p className="lg-alt">Already have a restaurant? <a onClick={toSignin}>Sign in</a></p>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="lg-h2">About your place</h2>
                  <p className="lg-sub">Step 2 — help us set you up right</p>
                  <div className="lg-field" style={{ marginTop: 16 }}>
                    <label>What type of place is it?</label>
                    <div className="lg-choices">{TYPES.map((t) => <button key={t} className={`lg-choice${rtype === t ? " on" : ""}`} onClick={() => setRtype(t)}>{t}</button>)}</div>
                  </div>
                  <div className="lg-field">
                    <label>Visitors per day</label>
                    <div className="lg-choices">{VISITORS.map((v) => <button key={v} className={`lg-choice${visitors === v ? " on" : ""}`} onClick={() => setVisitors(v)}>{v}</button>)}</div>
                  </div>
                  <div className="lg-stepnav"><button className="lg-back" onClick={() => setStep(0)}>Back</button><button className="lg-prime" onClick={() => setStep(2)}>Continue →</button></div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="lg-h2">Licences</h2>
                  <p className="lg-sub">Step 3 — GSTIN &amp; FSSAI (number + photo)</p>
                  <div style={{ marginTop: 16 }}>
                    <div className="lg-field"><label>GSTIN</label><input type="text" placeholder="06ABCDE1234F1Z5" /></div>
                    <Drop label="GSTIN certificate" img={gst} onPick={pick(setGst)} onRemove={() => setGst("")} />
                    <div className="lg-field"><label>FSSAI Licence No.</label><input type="text" placeholder="10012345000123" /></div>
                    <Drop label="FSSAI licence" img={fssai} onPick={pick(setFssai)} onRemove={() => setFssai("")} />
                    <div className="lg-field"><label>Anything else? <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><textarea placeholder="Opening hours, number of tables, special notes…" /></div>
                  </div>
                  <div className="lg-stepnav"><button className="lg-back" onClick={() => setStep(1)}>Back</button><button className="lg-prime" onClick={() => setStep(3)}>Submit &amp; create →</button></div>
                </>
              )}

              {step === 3 && (
                <div className="lg-done">
                  <h2>स्वागत है! 🎉</h2>
                  <p><b>Raj Darbar</b> is ready on Parosa.<br />Your account is set up — let&apos;s build your menu.</p>
                  <button className="lg-prime" style={{ marginTop: 22 }} onClick={enter}>Enter dashboard →</button>
                  <p className="lg-alt"><a onClick={toSignin}>Back to sign in</a></p>
                </div>
              )}
            </>
          )}
        </div>

        <p className="lg-terms">By continuing you agree to Parosa&apos;s <a>Terms &amp; Privacy.</a></p>
      </div>
    </div>
  );
}
