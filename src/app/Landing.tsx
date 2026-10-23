"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Seal } from "@/components/Logo";
import { PLANS } from "@/lib/plans";
import "./landing.css";

/* ------------------------------------------------------------------ content */

const CONTACT_EMAIL = "support.parosa@gmail.com";
// Opens a pre-filled Gmail compose window (works signed-in on desktop and mobile web).
const SALES_MAIL =
  "https://mail.google.com/mail/?view=cm&fs=1" +
  `&to=${encodeURIComponent(CONTACT_EMAIL)}` +
  `&su=${encodeURIComponent("Parosa — sales enquiry")}` +
  `&body=${encodeURIComponent("Hi Parosa team,\n\nRestaurant name:\nCity:\nOutlets / tables:\nPhone:\n\nI'd like to know more about:\n")}`;

// The "See Parosa in 2 minutes" video. Paste the YouTube video id (the part after
// "watch?v=" or "youtu.be/"). While it's empty the section shows a "coming soon" placeholder.
const YOUTUBE_ID = "";

// Real owner quotes only. While this is empty the reviews section stays hidden —
// invented testimonials mislead buyers and breach India's rules on fake reviews.
const REVIEWS: { q: string; n: string; p: string }[] = [];

// Fill in the real profile links — an icon without a link renders but isn't clickable.
const SOCIAL: { name: string; href: string; icon: ReactNode }[] = [
  { name: "Instagram", href: "", icon: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" /></> },
  { name: "LinkedIn", href: "", icon: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V17M8 7.2v.1M11.5 17v-3.6c0-1.6 1-2.7 2.3-2.7s2.2 1 2.2 2.7V17M11.5 10.5V17" /></> },
  { name: "X", href: "", icon: <path d="M4 4l16 16M20 4 4 20" /> },
  { name: "YouTube", href: YOUTUBE_ID ? `https://www.youtube.com/watch?v=${YOUTUBE_ID}` : "", icon: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10.2 9.3 4.6 2.7-4.6 2.7Z" fill="currentColor" /></> },
];

const NAV = [
  { id: "home", label: "Home" },
  { id: "how", label: "How it works" },
  { id: "video", label: "Video" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ's" },
];

const OUTCOMES: { t: string; s: string; icon: ReactNode }[] = [
  { t: "Repeat guests", s: "Stamp cards on every bill", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m7 12 2 2 3-4M15 12h2" /></> },
  { t: "Bigger bills", s: "Full menu with photos on every phone", icon: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></> },
  { t: "More reviews", s: "Google review ask on the bill", icon: <path d="M12 3l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15.9 7.4 17.2l.9-5.1L4.5 8.5l5.2-.8Z" /> },
  { t: "0% commission", s: "Every rupee is yours", icon: <><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3.1-1.6M12 6v2M12 16v2" /></> },
];

const STEPS: { t: string; s: string; icon: ReactNode }[] = [
  { t: "Menu & QR", s: "Your menu in Hindi and English, a QR on every table.", icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 20h1" /></> },
  { t: "Guests order", s: "They scan, order and pay by UPI. No app to install.", icon: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M9 8h2v2H9zM13 8h2v2h-2zM9 12h2v2H9z" /></> },
  { t: "They earn stamps", s: "Phone number at checkout, a tick on every paid bill.", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m7 12 2 2 3-4M15 12h2" /></> },
  { t: "They come back", s: "A reward waiting, and a review ask on the bill.", icon: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></> },
];

const FRAMES = [
  { src: "/landing/frames/restaurant.webp", label: "Restaurants" },
  { src: "/landing/frames/dhaba.webp", label: "Dhabas" },
  { src: "/landing/frames/cafe.webp", label: "Cafés" },
];

const FAQS = [
  { q: "How does Parosa bring my customers back?", a: "Guests add their phone number when they order. Every paid bill adds a tick to their stamp card, and when the card is full they get the reward you choose. They can see their card on the menu every time they scan, so they always have a reason to come back." },
  { q: "How does Parosa increase the bill per customer?", a: "Guests see your whole menu with photos on their own phone, at their own pace, so they find and order more than from a paper card or a busy waiter. Add-on suggestions — a lassi with a thali, a dessert after the main course — are coming soon to the Growth and Pro plans." },
  { q: "Will I see whether it's working?", a: "Yes. Your dashboard shows orders, returning guests, stamp cards filled and your average bill, day by day." },
  { q: "Who is Parosa for?", a: "Restaurants, dhabas and cafés where guests sit at tables — one outlet or many." },
  { q: "Do my customers need to download an app?", a: "No. Guests scan the QR with their phone camera and your menu opens in the browser. Nothing to install." },
  { q: "Is it really 0% commission?", a: "Yes. You pay one flat monthly fee. We never take a cut of your orders — every rupee your guests pay is yours." },
  { q: "Is the menu in Hindi and English?", a: "Every dish can carry both names and descriptions, so regulars and first-timers both read it their way." },
  { q: "How do guests pay?", a: "Directly to you — UPI, cash or card. Bills carry a scan-to-pay UPI QR with the amount filled in, and Parosa records every payment." },
  { q: "What do I need to get started?", a: "A phone or laptop, your menu, and a printer for the QR codes. Setup takes minutes." },
  { q: "Can I change how my menu looks?", a: "Yes. Pick from five menu designs, add your logo, and edit dishes and prices anytime." },
];

/* ------------------------------------------------------------------ bits */

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const Arrow = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Tick = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

function Brand() {
  return (
    <span className="lp-brand">
      <Seal size={44} />
      <span className="lp-bw"><b>PAROSA</b><i>SERVE · SAVOUR</i></span>
    </span>
  );
}

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** YouTube that loads only when tapped: a thumbnail first, then the real player. */
function Video({ id }: { id: string }) {
  const [on, setOn] = useState(false);
  if (!id) {
    return (
      <div className="lp-video">
        <div className="ph"><span className="play" aria-hidden="true" /><b>Parosa in 2 minutes</b><i>Video coming soon</i></div>
      </div>
    );
  }
  return (
    <div className="lp-video">
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title="Parosa in 2 minutes" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label="Play the Parosa video" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}>
          <span className="play" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export function Landing() {
  const [yearly, setYearly] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState("home");
  const [prog, setProg] = useState(0); // how-it-works: 0 → 1 while scrolling through the pinned section
  const howRef = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // header shadow once the page moves
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // scroll-spy for the nav highlight
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setSection(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // reveal-on-scroll: sections ease up as they enter the screen. Content is only
  // hidden once this has run (the lp-js class), so nothing stays invisible without JS.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add("lp-js");
    const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lp-in"); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);

  // how-it-works is scroll-driven: the section is tall and its content pinned, so
  // scrolling through it draws the line from step 1 to step 4.
  useEffect(() => {
    const el = howRef.current;
    if (!el) return;
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
    <div className="lp" ref={root}>
      {/* ---------------- header ---------------- */}
      <header className={`lp-nav${scrolled ? " sc" : ""}`}>
        <div className="lp-wrap lp-navin">
          <button className="lp-home" onClick={() => go("home")} aria-label="Parosa — home"><Brand /></button>
          <nav className={`lp-links${menuOpen ? " open" : ""}`} aria-label="Main">
            {NAV.map((n) => <button key={n.id} className={section === n.id ? "on" : ""} onClick={() => go(n.id)}>{n.label}</button>)}
            <div className="lp-mobcta">
              <Link href="/login" className="lp-btn line">Login</Link>
              <Link href="/signup" className="lp-btn white">Get Started</Link>
            </div>
          </nav>
          <div className="lp-navcta">
            <Link href="/login" className="lp-btn line">Login</Link>
            <Link href="/signup" className="lp-btn white">Get Started</Link>
          </div>
          <button className={`lp-burger${menuOpen ? " x" : ""}`} onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen}><span /><span /><span /></button>
        </div>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="lp-hero" id="home">
        <div className="lp-arch" aria-hidden="true" />
        <div className="lp-wrap lp-herogrid">
          <div className="lp-copy">
            <div className="lp-eyebrow">For restaurants · dhabas · cafés</div>
            <h1 className="lp-h1"><span>Bring guests back.</span><span className="soft">Grow every bill.</span></h1>
            <p className="lp-lead">
              Parosa turns every table into a QR menu your guests order from — then brings them back with stamp cards and
              review asks, so each guest is worth more to you. 0% commission.
            </p>
            <div className="lp-ctas">
              <Link href="/signup" className="lp-btn white lg">Get Started <Arrow /></Link>
              <button className="lp-btn line lg" onClick={() => go("video")}>▶ Watch 2-min video</button>
            </div>
            <ul className="lp-ticks">
              <li><Tick />No app for guests</li>
              <li><Tick />Setup in a day</li>
              <li><Tick />0% commission</li>
            </ul>
          </div>
          <div className="lp-visual" aria-hidden="true">
            <div className="lp-stand"><Image src="/landing/stand.webp" alt="" width={888} height={1313} priority sizes="(max-width: 980px) 46vw, 300px" /></div>
            <div className="lp-phone"><Image src="/landing/phone.webp" alt="" width={957} height={1422} priority sizes="(max-width: 980px) 52vw, 340px" /></div>
            <div className="lp-chip c1"><span className="i">★</span><span><b>Ravi is back · 6th visit</b><small>2 ticks to his free lassi</small></span></div>
            <div className="lp-chip c2"><span className="i">₹</span><span><b>New order · Table 4</b><small>₹660 · just now</small></span></div>
          </div>
        </div>
      </section>

      {/* ---------------- outcomes ---------------- */}
      <section className="lp-strip" aria-label="What Parosa does for you">
        <div className="lp-wrap lp-stripin">
          {OUTCOMES.map((f) => (
            <div key={f.t} className="lp-si" data-reveal>
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
              <h2 className="lp-h2">From first order to <em>regular guest</em></h2>
            </div>
            <ol className="lp-steps" style={{ ["--p" as string]: line }}>
              <li className="lp-rail" aria-hidden="true"><i /><b /></li>
              {STEPS.map((st, i) => (
                <li key={st.t} className={`lp-step${i <= lit ? " on" : ""}${i === lit && line < 1 ? " now" : ""}${line >= 1 ? " done" : ""}`}>
                  <span className="dot"><Icon size={30}>{st.icon}</Icon></span>
                  <span className="n">Step {i + 1}</span>
                  <b>{st.t}</b>
                  <p>{st.s}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- video ---------------- */}
      <section className="lp-sec alt" id="video">
        <div className="lp-wrap lp-vidwrap">
          <div className="lp-center" data-reveal>
            <div className="lp-eyebrow">Watch</div>
            <h2 className="lp-h2">See Parosa in 2 minutes</h2>
          </div>
          <div data-reveal><Video id={YOUTUBE_ID} /></div>
          <div className="lp-row center"><Link href="/signup" className="lp-btn maroon lg">Get Started <Arrow /></Link></div>
        </div>
      </section>

      {/* ---------------- built for ---------------- */}
      <section className="lp-sec" aria-label="Built for restaurants, dhabas and cafés">
        <div className="lp-wrap">
          <div className="lp-center" data-reveal>
            <div className="lp-eyebrow">Built for</div>
            <h2 className="lp-h2">Restaurants, dhabas and cafés</h2>
          </div>
          <div className="lp-frames">
            {FRAMES.map((f) => (
              <figure key={f.label} className="lp-frame" data-reveal>
                <Image src={f.src} alt={f.label} width={330} height={408} sizes="(max-width: 700px) 92vw, 380px" />
                <figcaption>{f.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- reviews (only once there are real quotes) ---------------- */}
      {REVIEWS.length > 0 && (
        <section className="lp-sec" id="reviews">
          <div className="lp-wrap">
            <div className="lp-center">
              <div className="lp-eyebrow">Trusted by food businesses</div>
              <h2 className="lp-h2">Real stories. <em>Real growth.</em></h2>
            </div>
            <div className="lp-revs">
              {REVIEWS.map((r) => (
                <article key={r.n} className="lp-review">
                  <div className="stars" aria-label="5 stars">★★★★★</div>
                  <p>&ldquo;{r.q}&rdquo;</p>
                  <div className="who"><span className="av">{initials(r.n)}</span><span><b>{r.n}</b><i>{r.p}</i></span></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- pricing ---------------- */}
      <section className="lp-sec alt" id="pricing">
        <div className="lp-wrap">
          <div className="lp-center" data-reveal>
            <div className="lp-eyebrow">Pricing</div>
            <h2 className="lp-h2">Simple, transparent pricing</h2>
            <div className="lp-toggle" role="tablist" aria-label="Billing period">
              <button role="tab" aria-selected={!yearly} className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
              <button role="tab" aria-selected={yearly} className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly <em>2 months free</em></button>
            </div>
          </div>
          <div className="lp-plans">
            {PLANS.map((p) => (
              <div key={p.id} className={`lp-plan${p.popular ? " pop" : ""}`} data-reveal>
                {p.popular && <span className="badge">Most popular</span>}
                <div className="pn">{p.name}</div>
                <div className="pt">{p.blurb}</div>
                <div className="pp"><b>₹{(yearly ? Math.round(p.yearly / 12) : p.price).toLocaleString("en-IN")}</b><span>/month</span></div>
                <div className="pb">{yearly ? `billed ₹${p.yearly.toLocaleString("en-IN")} yearly` : "billed monthly"}</div>
                <ul>
                  {p.featured.map((f) => <li key={f}><Tick />{f}</li>)}
                  {p.coming?.map((f) => <li key={f} className="soon"><Tick />{f}<em>Coming soon</em></li>)}
                </ul>
                <Link href="/signup" className={`lp-btn ${p.popular ? "white" : "outline"} block`}>Get Started</Link>
              </div>
            ))}
          </div>
          <p className="lp-planfoot">0% commission on every plan. Free during early access — no card needed to start.</p>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="lp-sec" id="faq">
        <div className="lp-wrap">
          <div className="lp-center" data-reveal>
            <div className="lp-eyebrow">FAQ&apos;s</div>
            <h2 className="lp-h2">Frequently asked questions</h2>
          </div>
          <div className="lp-qs">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`lp-q${faq === i ? " open" : ""}`} data-reveal>
                <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}>
                  <span className="qn">{String(i + 1).padStart(2, "0")}</span><span className="qt">{f.q}</span><span className="pm" aria-hidden="true" />
                </button>
                <div className="ans"><div><p>{f.a}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- closing banner ---------------- */}
      <section className="lp-cta">
        <div className="lp-wrap" data-reveal>
          <h2 className="lp-h2">Bring them back. Grow every bill.</h2>
          <p>For restaurants, dhabas and cafés across India.</p>
          <div className="lp-row center">
            <Link href="/signup" className="lp-btn white lg">Get Started <Arrow /></Link>
            <a href={SALES_MAIL} target="_blank" rel="noopener" className="lp-btn line lg">Contact Sales</a>
          </div>
        </div>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer className="lp-foot">
        <div className="lp-wrap lp-footin">
          <button className="lp-home" onClick={() => go("home")} aria-label="Back to top"><Brand /></button>
          <nav className="lp-flinks" aria-label="Footer">
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
        </div>
        <div className="lp-wrap lp-copyr">
          <span>© {new Date().getFullYear()} Parosa · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></span>
          <span>Made with <span aria-label="love">♥</span> in India</span>
        </div>
      </footer>
    </div>
  );
}
