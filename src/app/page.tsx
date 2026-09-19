"use client";

import { useState } from "react";
import Link from "next/link";
import { Seal } from "@/components/Logo";
import "./landing.css";

const FEATURES = [
  { n: 1, title: "Bilingual menu", body: "Every dish in Hindi and English — your regulars and first-timers both read it their way." },
  { n: 2, title: "A QR for every table", body: "Print a unique code per table. Scan → your menu opens with the table already filled in." },
  { n: 3, title: "Live order board + sound", body: "Orders land on your screen and ring a bell the second a guest taps Order. Nothing gets missed." },
  { n: 4, title: "WhatsApp bills", body: "One tap sends a clean, itemised bill to the guest's WhatsApp. No printer, no paper." },
  { n: 5, title: "0% commission", body: "Unlike the aggregators, we never take a cut of your order. You keep every rupee your guests pay." },
  { n: 6, title: "Insights that pay off", body: "See the day's collection, UPI vs cash, and your bestsellers — know exactly what to push." },
];
const STEPS = [
  { n: 1, title: "Create your account", body: "Add your restaurant, address and details. Two minutes, no card needed." },
  { n: 2, title: "Build your menu", body: "Add categories and dishes with prices and photos. Change anything, anytime." },
  { n: 3, title: "Print your QR codes", body: "Parosa makes a unique QR per table. Print them and place one on every table." },
  { n: 4, title: "Start serving", body: "Guests scan and order, you hear the bell, and the bill goes out on WhatsApp." },
];
const PLANS = [
  { name: "Basic", m: 99, y: 82, tag: "Everything to run one outlet beautifully.", items: ["1 restaurant", "Unlimited tables & QR codes", "Bilingual (हिंदी + English) menu", "Live orders with sound alerts", "WhatsApp bills", "UPI & cash tracking", "0% commission — always"] },
  { name: "Growth", m: 299, y: 249, popular: true, tag: "For busy kitchens that want to grow.", items: ["Everything in Basic, plus", "All premium menu templates & branding", "Deep analytics & exports", "Review-boost QR + auto-ask", "Up to 3 staff logins", "Priority support"] },
  { name: "Business", m: 499, y: 415, tag: "Multiple outlets and the full toolkit.", items: ["Everything in Growth, plus", "Multiple outlets", "Unlimited staff logins", "WhatsApp broadcasts & promos", "Custom domain", "Dedicated onboarding & support"] },
];
const FAQS = [
  { q: "Do my customers need to download an app?", a: "No. Guests scan the QR with their phone camera and the menu opens in the browser. Nothing to install." },
  { q: "Is it really 0% commission?", a: "Yes. You pay one flat monthly fee. We never take a cut of your orders." },
  { q: "Is the menu in Hindi and English?", a: "Every dish can carry both names and descriptions; guests switch language with one tap." },
  { q: "What do I need to get started?", a: "A phone or laptop, your menu, and a printer for the QR codes. Setup takes minutes." },
  { q: "How do payments work?", a: "Guests pay you directly — UPI, cash or card. Parosa records it so your day balances." },
  { q: "Can I change how my menu looks?", a: "Yes. Pick from menu templates, add your logo and colours, and edit dishes anytime." },
];
const DISHES = [
  { en: "Paneer Tikka", hi: "पनीर टिक्का", price: 220 },
  { en: "Tandoori Chaap", hi: "तंदूरी चाप", price: 240 },
  { en: "Hara Bhara Kebab", hi: "हरा भरा कबाब", price: 190 },
];
const STATS = [
  { v: "0%", l: "commission — always" },
  { v: "₹99", l: "per month to start" },
  { v: "2", l: "languages on every dish" },
  { v: "0", l: "apps your guests install" },
];

export default function Landing() {
  const [yearly, setYearly] = useState(false);
  const [faq, setFaq] = useState(0);

  return (
    <div className="pw">
      {/* NAV */}
      <header className="pw-nav">
        <Link href="/" className="pw-brand">
          <Seal size={52} />
          <span><b className="dev">परोसा</b><i>PAROSA</i></span>
        </Link>
        <nav className="pw-navlinks">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="pw-navcta">
          <Link href="/login" className="pw-btn ghost">Login</Link>
          <Link href="/signup" className="pw-btn solid">Get started <span className="ar">→</span></Link>
        </div>
      </header>

      {/* HERO */}
      <section className="pw-hero">
        <div className="pw-hero-l">
          <div className="pw-eyebrow"><span className="dia" />The QR menu made for India</div>
          <h1>Your menu, served in a scan.</h1>
          <div className="pw-rule" />
          <p>Guests scan a QR, browse your bilingual menu and order. You hear the bell instantly and send the bill on WhatsApp. No app for guests, no hardware, <strong>0% commission</strong>.</p>
          <div className="pw-hero-btns">
            <Link href="/signup" className="pw-btn gold wide">Start your restaurant <span>→</span></Link>
            <a href="#pricing" className="pw-btn outline">See pricing</a>
          </div>
          <div className="pw-hero-facts"><span>From ₹99 / month</span><span className="dev">हिंदी + English</span><span>Live in minutes</span></div>
        </div>
        <div className="pw-hero-r">
          <div className="pw-phone">
            <div className="pw-phone-hd"><Seal size={36} /><div><div className="rn">Raj Darbar</div><div className="tb">Table 7 · Scan &amp; order</div></div></div>
            <div className="pw-phone-tabs"><span className="on">Starters</span><span>Mains</span><span>Breads</span><span>Drinks</span></div>
            {DISHES.map((d) => (
              <div className="pw-phone-dish" key={d.en}>
                <div className="thumb" />
                <div><div className="en">{d.en}</div><div className="hi dev">{d.hi}</div><div className="pr">₹{d.price}</div></div>
                <span className="add">+</span>
              </div>
            ))}
            <div className="pw-phone-bar"><span>3 items</span><span className="go">Order · ₹650 →</span></div>
          </div>
          <div className="pw-float-order"><span className="dot" /><div><div className="t">New order · Table 7</div><div className="s">₹650 · just now</div></div></div>
          <div className="pw-float-scan"><span className="qr" />Scan me</div>
        </div>
      </section>

      {/* STAT STRIP */}
      <div className="pw-stats">
        {STATS.map((s) => (<div className="pw-stat" key={s.l}><div className="v">{s.v}</div><div className="l">{s.l}</div></div>))}
      </div>

      {/* FEATURES */}
      <section id="features" className="pw-sec">
        <div className="pw-sechead">
          <div><div className="pw-kick">01 — Everything in one place</div><h2>Run the whole floor from one screen</h2></div>
          <p>From the first scan to the final bill — Parosa handles the menu, the orders and the money, so you can focus on the food.</p>
        </div>
        <div className="pw-fgrid">
          {FEATURES.map((f) => (
            <div className="pw-fcell" key={f.n}>
              <div className="top"><span className="num">0{f.n}</span><span className="dia" /></div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="pw-sec">
        <div className="pw-sechead bordered">
          <div><div className="pw-kick">02 — Up and running today</div><h2>Four steps to your first order</h2></div>
          <p className="narrow">No installation, no training. If you can add a dish and print a page, you&apos;re ready.</p>
        </div>
        <div className="pw-steps">
          {STEPS.map((s) => (
            <div className="pw-step" key={s.n}><div className="num">{s.n}</div><h3>{s.title}</h3><p>{s.body}</p></div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pw-sec">
        <div className="pw-sechead bordered pricehead">
          <div><div className="pw-kick">03 — Simple, honest pricing</div><h2>One flat plan. Zero commission.</h2></div>
          <div className="pw-toggle">
            <button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
            <button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly <span className="save">SAVE 17%</span></button>
          </div>
        </div>
        <div className="pw-plans">
          {PLANS.map((p) => (
            <div className={`pw-plan${p.popular ? " pop" : ""}`} key={p.name}>
              <div className="hd"><h3>{p.name}</h3>{p.popular && <span className="badge">Most popular</span>}</div>
              <div className="price"><span className="amt">₹{yearly ? p.y : p.m}</span><span className="per">/mo</span><div className="billed">{yearly ? "billed yearly" : "billed monthly"}</div></div>
              <p className="tag">{p.tag}</p>
              <div className="items">{p.items.map((it) => (<div className="it" key={it}><span className="dia" />{it}</div>))}</div>
              <Link href="/signup" className="choose"><span>Choose {p.name}</span><span>→</span></Link>
            </div>
          ))}
        </div>
        <div className="pw-pricenote">Free during early access — you won&apos;t be charged until online billing goes live.</div>
      </section>

      {/* FAQ */}
      <section id="faq" className="pw-sec pw-faq">
        <div className="pw-faq-l">
          <div className="pw-kick">04 — Good questions</div>
          <h2>Everything you&apos;re wondering</h2>
          <p>Still stuck? WhatsApp us — a real person replies within the hour.</p>
        </div>
        <div className="pw-faq-list">
          {FAQS.map((f, i) => (
            <div className="pw-faq-item" key={f.q}>
              <button onClick={() => setFaq(faq === i ? -1 : i)}><span>{f.q}</span><span className="gl">{faq === i ? "−" : "+"}</span></button>
              {faq === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CLOSE */}
      <section className="pw-close">
        <div className="pw-close-l"><Seal size={300} /></div>
        <div className="pw-close-r">
          <div className="wm dev">परोसा</div>
          <h2>Give your tables a smarter menu today.</h2>
          <p>Set up in minutes, print your QR codes, and take your first scan-to-order this week.</p>
          <Link href="/signup" className="pw-btn gold wide">Create your restaurant <span>→</span></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pw-foot">
        <div className="col brand">
          <div className="row"><Seal size={40} /><span className="wm">PAROSA</span></div>
          <p>The bilingual QR-menu &amp; ordering platform built for India&apos;s restaurants and dhabas.</p>
          <div className="scan">SCAN · SERVE · SAVOUR</div>
        </div>
        <div className="col"><h4>Product</h4><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
        <div className="col"><h4>Company</h4><Link href="/signup">Get started</Link><Link href="/login">Login</Link><a href="mailto:sahustartup@gmail.com">Contact</a></div>
        <div className="col"><h4>Legal</h4><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link></div>
        <div className="copy">© {new Date().getFullYear()} Parosa. All rights reserved.</div>
      </footer>
    </div>
  );
}
