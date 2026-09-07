"use client";

import { useState } from "react";
import Link from "next/link";
import { Seal } from "@/components/Logo";
import { PLANS } from "@/lib/plans";
import "./landing.css";

const FEATURES = [
  { t: "Bilingual menu", d: "Every dish in Hindi and English — your regulars and first-timers both read it their way.", i: "M4 5h9M4 5c0 6-1.5 9-2 10m4-6c1.5 3 3.5 4.5 5 5M13 19l4-9 4 9m-6.5-3h5" },
  { t: "A QR for every table", d: "Print a unique code per table. Scan → your menu opens with the table already filled in.", i: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6M17 20h3" },
  { t: "Live order board + sound", d: "Orders land on your screen and ring a bell the second a guest taps Order. Nothing gets missed.", i: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" },
  { t: "WhatsApp bills", d: "One tap sends a clean, itemised bill to the guest's WhatsApp. No printer, no paper.", i: "M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" },
  { t: "0% commission", d: "Unlike the aggregators, we never take a cut of your order. You keep every rupee your guests pay.", i: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { t: "Insights that pay off", d: "See the day's collection, UPI vs cash, and your bestsellers — know exactly what to push.", i: "M4 19V5m4 14v-8m4 8V9m4 10v-6m4 6V7" },
];

const STEPS = [
  { n: "1", t: "Create your account", d: "Add your restaurant, address and details. Two minutes, no card needed." },
  { n: "2", t: "Build your menu", d: "Add categories and dishes with prices and photos. Change anything, anytime." },
  { n: "3", t: "Print your QR codes", d: "Parosa makes a unique QR per table. Print them and place one on every table." },
  { n: "4", t: "Start serving", d: "Guests scan and order, you hear the bell, and the bill goes out on WhatsApp." },
];

const FAQ = [
  ["Do my customers need to download an app?", "No — never. Guests scan your QR with any phone camera and your menu opens in the browser. Nothing to install."],
  ["Is it really 0% commission?", "Yes. Parosa charges a flat monthly plan and takes nothing from your orders. Every rupee your guest pays is yours."],
  ["Is the menu in Hindi and English?", "Both, side by side. Your regulars and first-time guests each read it the way they're comfortable."],
  ["What do I need to get started?", "Just your menu. You can build it in a couple of minutes and print your first table QR the same day — no special hardware."],
  ["How do payments work?", "Your guests pay you directly by UPI or cash and Parosa tracks every bill. Online plan billing via Razorpay is coming soon; you're in free early access until then."],
  ["Can I change how my menu looks?", "Yes. Pick from designed templates any time — your dishes and prices stay exactly the same, only the look changes."],
];

export default function Landing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="ld">
      {/* NAV */}
      <header className="ld-nav">
        <div className="ld-wrap ld-navrow">
          <Link href="/" className="ld-brand">
            <Seal size={38} />
            <span className="ld-brandtx"><b>परोसा</b><i>PAROSA</i></span>
          </Link>
          <nav className="ld-navlinks">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="ld-navcta">
            <Link href="/login" className="ld-btn ghost">Login</Link>
            <Link href="/login?mode=create" className="ld-btn solid">Get started</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="ld-hero">
        <div aria-hidden className="ld-paisley" />
        <div aria-hidden className="ld-heroglow" />
        <div className="ld-wrap ld-herogrid">
          <div className="ld-heroL">
            <span className="ld-pill"><span className="dot" /> The QR menu made for India</span>
            <h1>Your menu,<br /><span className="hl">served</span> in a scan.</h1>
            <p className="ld-sub">
              Parosa turns every table into a self-order counter. Guests scan a QR, browse your
              bilingual menu and order — you hear the bell instantly and send the bill on WhatsApp.
              No app for guests, no expensive hardware, <b>0% commission</b>.
            </p>
            <div className="ld-herobtns">
              <Link href="/login?mode=create" className="ld-btn solid lg">Start your restaurant</Link>
              <a href="#pricing" className="ld-btn ghost lg">See pricing</a>
            </div>
            <div className="ld-trust">
              <span>✦ From ₹99/mo</span>
              <span>✦ Hindi + English</span>
              <span>✦ Live in minutes</span>
            </div>
          </div>

          <div className="ld-heroR" aria-hidden>
            <div className="ld-phone">
              <div className="ld-phscreen">
                <div className="ld-phtop"><Seal size={26} /><div className="ld-phname">Raj Darbar</div><div className="ld-phtag">Table 7 · Scan &amp; order</div></div>
                <div className="ld-phcat">Tandoori Starters</div>
                {[["Paneer Tikka", "₹220"], ["Tandoori Chaap", "₹240"], ["Hara Bhara Kebab", "₹190"]].map(([n, p]) => (
                  <div key={n} className="ld-phdish">
                    <div className="ld-phdot" />
                    <div className="ld-phdinfo"><b>{n}</b><span>{p}</span></div>
                    <div className="ld-phadd">+</div>
                  </div>
                ))}
                <div className="ld-phbar"><span>3 items</span><div className="ld-phorder">Order · ₹650</div></div>
              </div>
            </div>
            <div className="ld-floatorder">
              <span className="ld-fo-ping" />
              <div><b>New order · Table 7</b><span>₹650 · just now</span></div>
            </div>
            <div className="ld-qrfloat">
              <div className="ld-qrgrid" />
              <span>Scan me</span>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP */}
      <div className="ld-strip">
        <div className="ld-wrap ld-stripwrap">
          {["0% commission", "❖", "No app for guests", "❖", "हिंदी + English", "❖", "Made in India"].map((s, i) => (
            <span key={i} className={s === "❖" ? "d" : ""}>{s}</span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-head">
            <span className="ld-kicker">Everything in one place</span>
            <h2>Run the whole floor from one screen</h2>
            <p>From the first scan to the final bill — Parosa handles the menu, the orders and the money, so you can focus on the food.</p>
          </div>
          <div className="ld-fgrid">
            {FEATURES.map((f) => (
              <div key={f.t} className="ld-fcard">
                <div className="ld-ficon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={f.i} /></svg></div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="ld-sec alt">
        <div className="ld-wrap">
          <div className="ld-head">
            <span className="ld-kicker">Up and running today</span>
            <h2>Four steps to your first order</h2>
            <p>No installation, no training. If you can add a dish and print a page, you&apos;re ready.</p>
          </div>
          <div className="ld-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="ld-step">
                <div className="ld-stepn">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-head">
            <span className="ld-kicker">Simple, honest pricing</span>
            <h2>One flat plan. Zero commission.</h2>
            <p>No setup fee, no per-QR charge, no cut of your orders — ever. Pick a plan and change it whenever you like.</p>
          </div>
          <div className="ld-bill">
            <button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
            <button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly <em>save 17%</em></button>
          </div>
          <div className="ld-pricewrap">
            {PLANS.map((p) => (
              <div key={p.id} className={`ld-price${p.popular ? " feat" : ""}`}>
                {p.popular && <div className="ld-pricebadge">Most popular</div>}
                <div className="ld-pricehd">
                  <h3>{p.name}</h3>
                  <div className="ld-amt">₹{yearly ? Math.round(p.yearly / 12) : p.price}<small>/mo</small></div>
                  <div className="ld-amtsub">{yearly ? `billed ₹${p.yearly}/year` : "billed monthly"}</div>
                </div>
                <p className="ld-priceblurb">{p.blurb}</p>
                <ul>{p.featured.map((f) => <li key={f}>{f}</li>)}</ul>
                <Link href="/login?mode=create" className={`ld-btn ${p.popular ? "solid" : "ghost"} full`}>Choose {p.name}</Link>
              </div>
            ))}
          </div>
          <p className="ld-pricenote">Free during early access — you won&apos;t be charged until online billing goes live.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="ld-sec alt">
        <div className="ld-wrap ld-faqwrap">
          <div className="ld-head">
            <span className="ld-kicker">Good questions</span>
            <h2>Everything you&apos;re wondering</h2>
          </div>
          <div className="ld-faq">
            {FAQ.map(([q, a]) => (
              <details key={q} className="ld-faqitem">
                <summary>{q}<span className="ld-faqx">+</span></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ld-final">
        <div aria-hidden className="ld-paisley" />
        <div className="ld-wrap ld-finalin">
          <Seal size={72} />
          <h2 className="emboss">परोसा</h2>
          <p>Give your tables a smarter menu today. Set up in minutes, print your QR codes, and take your first scan-to-order this week.</p>
          <Link href="/login?mode=create" className="ld-btn gold lg">Create your restaurant</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ld-foot">
        <div className="ld-wrap ld-footgrid">
          <div className="ld-footbrand">
            <div className="ld-brand"><Seal size={34} /><span className="ld-brandtx dark"><b>परोसा</b><i>PAROSA</i></span></div>
            <p>The bilingual QR-menu &amp; ordering platform built for India&apos;s restaurants and dhabas.</p>
            <p className="ld-footscan">Scan · Serve · Savour</p>
          </div>
          <div className="ld-footcol">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="ld-footcol">
            <h4>Company</h4>
            <Link href="/login?mode=create">Get started</Link>
            <Link href="/login">Login</Link>
            <a href="mailto:sahustartup@gmail.com">Contact</a>
          </div>
          <div className="ld-footcol">
            <h4>Legal</h4>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
        <div className="ld-wrap ld-footbar">© {new Date().getFullYear()} Parosa. All rights reserved.</div>
      </footer>
    </div>
  );
}
