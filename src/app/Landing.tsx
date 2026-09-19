"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Seal } from "@/components/Logo";
import { PLANS } from "@/lib/plans";
import "./landing.css";

/* ------------------------------------------------------------------ content */

const CONTACT_EMAIL = "sahustartup@gmail.com";
// Opens a pre-filled Gmail compose window (works signed-in on desktop and mobile web).
const SALES_MAIL =
  "https://mail.google.com/mail/?view=cm&fs=1" +
  `&to=${encodeURIComponent(CONTACT_EMAIL)}` +
  `&su=${encodeURIComponent("Parosa — sales enquiry")}` +
  `&body=${encodeURIComponent("Hi Parosa team,\n\nRestaurant name:\nCity:\nOutlets / tables:\nPhone:\n\nI'd like to know more about:\n")}`;

// Fill in the real profile links — an icon without a link renders but isn't clickable.
const SOCIAL: { name: string; href: string; icon: ReactNode }[] = [
  { name: "Instagram", href: "", icon: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" /></> },
  { name: "LinkedIn", href: "", icon: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V17M8 7.2v.1M11.5 17v-3.6c0-1.6 1-2.7 2.3-2.7s2.2 1 2.2 2.7V17M11.5 10.5V17" /></> },
  { name: "X", href: "", icon: <path d="M4 4l16 16M20 4 4 20" /> },
  { name: "YouTube", href: "", icon: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10.2 9.3 4.6 2.7-4.6 2.7Z" fill="currentColor" /></> },
];

const NAV = [
  { id: "home", label: "Home" },
  { id: "how", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ's" },
];

const STRIP: { t: string; s: string; icon: ReactNode }[] = [
  { t: "Digital Menu", s: "Bilingual & customisable", icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></> },
  { t: "QR Generation", s: "One per table, instantly", icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></> },
  { t: "Works on Any Phone", s: "No app to download", icon: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></> },
  { t: "Live Orders", s: "A bell rings on every order", icon: <path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12Z" /> },
  { t: "0% Commission", s: "Keep every rupee", icon: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></> },
];

const STEPS: { t: string; icon: ReactNode }[] = [
  { t: "Create Your Menu", icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></> },
  { t: "Get Your QR", icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></> },
  { t: "Customers Scan", icon: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M9 8h2v2H9zM13 8h2v2h-2zM9 12h2v2H9zM13 13h2" /></> },
  { t: "Receive Orders", icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" /></> },
];

// Placeholder photos (cropped from the design mock-up) — swap for real ones in public/landing/frames/.
const FRAMES = [
  { src: "/landing/frames/dhaba.webp", label: "Dhabas" },
  { src: "/landing/frames/restaurant.webp", label: "Restaurants" },
  { src: "/landing/frames/food-truck.webp", label: "Food Trucks" },
  { src: "/landing/frames/cafe.webp", label: "Cafés" },
];

// ⚠️ SAMPLE REVIEWS from the design mock-up — not real customers. Replace with
// genuine owner quotes (with their permission) before this page goes public:
// invented testimonials are misleading to buyers and breach India's rules on fake reviews.
const REVIEWS = [
  { q: "Parosa made ordering so easy for our dhaba. Customers love it!", n: "Ramesh Singh", p: "Highway Dhaba, Jaipur" },
  { q: "Simple, fast and works perfectly for our café. Highly recommended!", n: "Neha Sharma", p: "Café Mitti, Udaipur" },
  { q: "Our food truck gets more orders now. Parosa is a game changer!", n: "Arjun Mehta", p: "The Rolling Tawa, Delhi" },
];

const FAQS = [
  { q: "Do my customers need to download an app?", a: "No. Guests scan the QR with their phone camera and your menu opens in the browser. Nothing to install." },
  { q: "Is it really 0% commission?", a: "Yes. You pay one flat monthly fee. We never take a cut of your orders — every rupee your guests pay is yours." },
  { q: "Is the menu in Hindi and English?", a: "Every dish can carry both names and descriptions, so regulars and first-timers both read it their way." },
  { q: "How do guests pay?", a: "Directly to you — UPI, cash or card. Bills carry a scan-to-pay UPI QR with the amount filled in, and Parosa records every payment." },
  { q: "What do I need to get started?", a: "A phone or laptop, your menu, and a printer for the QR codes. Setup takes minutes." },
  { q: "Can I change how my menu looks?", a: "Yes. Pick from five menu designs, add your logo, and edit dishes and prices anytime." },
];

/* ------------------------------------------------------------------ bits */

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const Arrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Check = () => <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="m7 12.5 3.2 3L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Brand() {
  return (
    <span className="lp-brand">
      <Seal size={46} />
      <span className="lp-bw"><b>PAROSA</b><i>SERVE · SAVOUR</i></span>
    </span>
  );
}

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/* ------------------------------------------------------------------ page */

export function Landing({ fontClass }: { fontClass: string }) {
  const [yearly, setYearly] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState("home");
  const [prog, setProg] = useState(0); // how-it-works: 0 → 1 as you scroll through the pinned section
  const howRef = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // header shadow once the page moves
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // scroll-spy for the nav underline
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setSection(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // reveal-on-scroll for anything marked data-reveal
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lp-in"); io.unobserve(e.target); } }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // how-it-works is scroll-driven: the section is tall and its content pinned,
  // so scrolling through it moves the line from step 1 to "Receive Orders".
  useEffect(() => {
    const el = howRef.current;
    if (!el) return;
    // Measured straight in the scroll event (browsers already fire it once per frame);
    // React skips the re-render when the rounded value hasn't changed.
    const measure = () => {
      const r = el.getBoundingClientRect();
      const run = r.height - window.innerHeight; // scroll distance while pinned
      const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 1;
      setProg(Math.round(p * 400) / 400);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, []);
  // the line spans step 1 → 4 over the first 85% of the scroll; the rest holds the finished state
  const line = Math.min(1, prog / 0.85);
  const lit = Math.min(3, Math.floor(line * 3 + 0.02)); // furthest step the line has reached

  const go = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className={`lp ${fontClass}`} ref={root}>
      {/* ---------------- header ---------------- */}
      <header className={`lp-nav${scrolled ? " sc" : ""}`}>
        <div className="lp-wrap lp-navin">
          <button className="lp-home" onClick={() => go("home")} aria-label="Parosa — home"><Brand /></button>
          <nav className={`lp-links${menuOpen ? " open" : ""}`}>
            {NAV.map((n) => <button key={n.id} className={section === n.id ? "on" : ""} onClick={() => go(n.id)}>{n.label}</button>)}
            <div className="lp-mobcta">
              <Link href="/login" className="lp-btn ghost">Login</Link>
              <Link href="/signup" className="lp-btn">Get Started</Link>
            </div>
          </nav>
          <div className="lp-navcta">
            <Link href="/login" className="lp-btn ghost sm">Login</Link>
            <Link href="/signup" className="lp-btn sm">Get Started</Link>
          </div>
          <button className={`lp-burger${menuOpen ? " x" : ""}`} onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen}><span /><span /><span /></button>
        </div>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="lp-hero" id="home">
        <div className="lp-arch" aria-hidden="true"><span className="lp-script s1">For<br />Food Businesses</span></div>
        <div className="lp-leaf" aria-hidden="true" />
        <div className="lp-wrap lp-herogrid">
          <div className="lp-copy">
            <div className="lp-eyebrow lp-rise" style={{ animationDelay: ".05s" }}>India&apos;s restaurant OS</div>
            <h1 className="lp-h1">
              <span className="lp-rise" style={{ animationDelay: ".12s" }}>Your Menu.</span>
              <span className="lp-rise thin" style={{ animationDelay: ".22s" }}>Their Phone.</span>
              <span className="lp-rise" style={{ animationDelay: ".32s" }}>More Orders.</span>
            </h1>
            <p className="lp-lead lp-rise" style={{ animationDelay: ".42s" }}>
              Parosa helps dhabas, restaurants, food trucks and cafés create digital menus with QR codes — so your customers can scan and order in seconds.
            </p>
            <div className="lp-ctas lp-rise" style={{ animationDelay: ".52s" }}>
              <Link href="/signup" className="lp-btn lg">Get Started <Arrow /></Link>
              <a href="/raj-darbar/menu/1" target="_blank" rel="noopener" className="lp-btn ghost lg">
                See Live Demo <span className="lp-play"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor" /></svg></span>
              </a>
            </div>
            <ul className="lp-ticks lp-rise" style={{ animationDelay: ".62s" }}>
              <li><Check />No App Required</li>
              <li><Check />Setup in Minutes</li>
              <li><Check />0% Commission</li>
            </ul>
          </div>

          <div className="lp-visual" aria-hidden="true">
            <span className="lp-script s2">Scan<br />Order<br />Enjoy</span>
            {/* hand-drawn arrow from "Scan · Order · Enjoy" sweeping right into the stand */}
            <svg className="lp-curl" viewBox="0 0 80 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4c-3 20 9 34 32 34 11 0 21-3 30-8" /><path d="M61 24l10 6-8 8" /></svg>
            <div className="lp-stand"><Image src="/landing/stand.webp" alt="" width={968} height={1423} priority sizes="(max-width: 900px) 46vw, 330px" /></div>
          </div>
        </div>
        <div className="lp-phone" aria-hidden="true"><Image src="/landing/phone.webp" alt="" width={957} height={1422} priority sizes="(max-width: 900px) 52vw, 420px" /></div>
      </section>

      {/* ---------------- feature strip ---------------- */}
      <section className="lp-strip">
        <div className="lp-wrap lp-stripin">
          {STRIP.map((f, i) => (
            <div key={f.t} className="lp-sitem" data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
              <span className="ic"><Icon>{f.icon}</Icon></span>
              <span><b>{f.t}</b><i>{f.s}</i></span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- how it works — scroll-driven ---------------- */}
      <section className="lp-how" id="how" ref={howRef}>
        <div className="lp-howpin">
          <div className="lp-wrap">
            <div className="lp-center">
              <div className="lp-eyebrow">How Parosa works</div>
              <h2 className="lp-h2">From Menu to More Orders,<br />in 4 Simple Steps</h2>
            </div>
            <div className="lp-steps" style={{ ["--p" as string]: line }}>
              <div className="lp-rail" aria-hidden="true"><i /><b /></div>
              {STEPS.map((s, i) => (
                <div key={s.t} className={`lp-step${i <= lit ? " on" : ""}${i === lit && line < 1 ? " now" : ""}${line >= 1 ? " done" : ""}`}>
                  <span className="dot"><Icon size={28}>{s.icon}</Icon></span>
                  <b><em>{i + 1}</em>{s.t}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- moving 9:16 frames ---------------- */}
      <section className="lp-built" aria-label="Built for dhabas, restaurants, food trucks and cafés">
        <div className="lp-marquee">
          <div className="lp-track x4">
            {[...FRAMES, ...FRAMES, ...FRAMES, ...FRAMES].map((f, i) => (
              <figure key={i} className="lp-frame" aria-hidden={i >= FRAMES.length}>
                <Image src={f.src} alt={i < FRAMES.length ? f.label : ""} width={330} height={408} sizes="240px" />
                <figcaption>{f.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- reviews — moving white boxes ---------------- */}
      <section className="lp-sec lp-reviews" id="reviews">
        <div className="lp-wrap lp-center" data-reveal>
          <div className="lp-eyebrow">Trusted by food businesses</div>
          <h2 className="lp-h2">Real Stories. Real Growth.</h2>
        </div>
        <div className="lp-marquee wide">
          <div className="lp-track rev">
            {[...REVIEWS, ...REVIEWS, ...REVIEWS, ...REVIEWS].map((r, i) => (
              <article key={i} className="lp-review" aria-hidden={i >= REVIEWS.length}>
                <div className="stars" aria-label="5 stars">★★★★★</div>
                <p>&ldquo;{r.q}&rdquo;</p>
                <div className="who"><span className="av">{initials(r.n)}</span><span><b>{r.n}</b><i>{r.p}</i></span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- pricing ---------------- */}
      <section className="lp-sec lp-pricing" id="pricing">
        <div className="lp-wrap">
          <div className="lp-center" data-reveal>
            <div className="lp-eyebrow">Pricing</div>
            <h2 className="lp-h2">Simple, Transparent Pricing</h2>
          </div>
          <div className="lp-pricebox">
            <div className="lp-toggle" role="tablist" aria-label="Billing period">
              <button role="tab" aria-selected={!yearly} className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
              <button role="tab" aria-selected={yearly} className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly <em>2 months free</em></button>
              <span className={`knob${yearly ? " r" : ""}`} aria-hidden="true" />
            </div>
            <div className="lp-plans">
              {PLANS.map((p, i) => (
                <div key={p.id} className={`lp-plan${p.popular ? " pop" : ""}`} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                  {p.popular && <span className="badge">Most Popular</span>}
                  <div className="pn">{p.name}</div>
                  <div className="pt">{p.blurb}</div>
                  <div className="pp">
                    <span className="amt" key={yearly ? "y" : "m"}>₹{yearly ? Math.round(p.yearly / 12) : p.price}</span>
                    <span className="per">/month</span>
                  </div>
                  <div className="pb">{yearly ? `billed ₹${p.yearly.toLocaleString("en-IN")} yearly` : "billed monthly"}</div>
                  <ul>{p.featured.map((f) => <li key={f}><Check />{f}</li>)}</ul>
                  <Link href="/signup" className={`lp-btn ${p.popular ? "" : "ghost"} block`}>Get Started</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="lp-sec lp-faq" id="faq">
        <div className="lp-wrap">
          <div className="lp-center" data-reveal>
            <div className="lp-eyebrow">FAQ&apos;s</div>
            <h2 className="lp-h2">Frequently Asked Questions</h2>
          </div>
          <div className="lp-qs">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`lp-q${faq === i ? " open" : ""}`}>
                <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}><span><span className="qn">{String(i + 1).padStart(2, "0")}</span>{f.q}</span><span className="pm" aria-hidden="true" /></button>
                <div className="ans"><div><p>{f.a}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA banner ---------------- */}
      <section className="lp-cta">
        <Image src="/landing/cta-banner.webp" alt="" fill sizes="100vw" className="bg" />
        <div className="lp-ctain" data-reveal>
          <h2 className="lp-h2">Let&apos;s Build a More<br />Connected Food India</h2>
          <p>Join the dhabas, restaurants and cafés taking their menus digital with Parosa.</p>
          <div className="lp-row center">
            <Link href="/signup" className="lp-btn">Get Started <Arrow /></Link>
            <a href={SALES_MAIL} target="_blank" rel="noopener" className="lp-btn cream">Contact Sales</a>
          </div>
        </div>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer className="lp-foot">
        <div className="lp-wrap lp-footin">
          <button className="lp-home" onClick={() => go("home")} aria-label="Back to top"><Brand /></button>
          <nav className="lp-flinks">
            {NAV.map((n) => <button key={n.id} onClick={() => go(n.id)}>{n.label}</button>)}
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <div className="lp-social">
            {SOCIAL.map((s) =>
              s.href
                ? <a key={s.name} href={s.href} target="_blank" rel="noopener" aria-label={s.name}><Icon size={20}>{s.icon}</Icon></a>
                : <span key={s.name} title={`${s.name} — coming soon`}><Icon size={20}>{s.icon}</Icon></span>,
            )}
          </div>
          <div className="lp-made">Made with <span aria-label="love">♥</span> in India</div>
        </div>
        <div className="lp-wrap lp-copyr">© {new Date().getFullYear()} Parosa · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
      </footer>
    </div>
  );
}
