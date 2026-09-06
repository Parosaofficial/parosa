import Link from "next/link";
import { Seal } from "@/components/Logo";
import "./landing.css";

const FEATURES = [
  { t: "Bilingual menu", d: "Every dish in Hindi and English — your regulars and first-timers both read it their way.", i: "M3 5h12M9 3v2m0 0c0 5-2 8-6 10m4-4c1.5 2 3.5 3.5 6 4M14 21l4-9 4 9m-7-3h6" },
  { t: "QR per table", d: "Print a unique code for every table. Scan → menu opens with the table already filled in.", i: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6M17 20h3" },
  { t: "Live order board", d: "Orders land on your screen the second a guest taps Order — new, cooking, ready, served.", i: "M4 6h16M4 12h16M4 18h10" },
  { t: "WhatsApp bill", d: "One tap sends a clean, itemised bill to the guest's WhatsApp. No printer, no paper.", i: "M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" },
  { t: "Menu you control", d: "Add dishes, change prices, mark sold-out — updates the moment you save. No reprints.", i: "M12 20h9M4 20l1-4 10-10 3 3-10 10z" },
  { t: "Payments & insights", d: "See the day's collection, UPI vs cash, and your bestsellers — all in one place.", i: "M4 19V5m4 14v-8m4 8V9m4 10v-6m4 6V7" },
];

const STEPS = [
  { n: "1", t: "Create your account", d: "Add your restaurant name, type and details. Takes two minutes — no card needed." },
  { n: "2", t: "Build your menu", d: "Add categories and dishes with prices and photos. Change anything, anytime." },
  { n: "3", t: "Add tables & print QR", d: "Parosa makes a unique QR for each table. Print them and place one on every table." },
  { n: "4", t: "Start serving", d: "Guests scan, browse and order. You get the order live and send the bill on WhatsApp." },
];

const AUDIENCE = ["Restaurants", "Dhabas", "Food trucks", "Cafés", "Cloud kitchens", "Family diners"];

export default function Landing() {
  return (
    <div className="ld">
      {/* NAV */}
      <header className="ld-nav">
        <div className="ld-wrap ld-navrow">
          <Link href="/" className="ld-brand">
            <Seal size={38} />
            <span className="ld-brandtx">
              <b>परोसा</b>
              <i>PAROSA</i>
            </span>
          </Link>
          <nav className="ld-navlinks">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#who">Who it&apos;s for</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="ld-navcta">
            <Link href="/login" className="ld-btn ghost">Login</Link>
            <Link href="/login?mode=create" className="ld-btn solid">Sign up free</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="ld-hero">
        <div aria-hidden className="ld-paisley" />
        <div className="ld-wrap ld-herogrid">
          <div className="ld-heroL">
            <span className="ld-pill">✦ The QR menu made for India</span>
            <h1 className="emboss-ink">
              Your menu, <span className="hl">served</span> in a scan.
            </h1>
            <p className="ld-sub">
              Parosa turns every table into a self-order counter. Guests scan a QR, browse your
              bilingual menu, and order — you get it live and send the bill on WhatsApp. No app to
              download, no expensive hardware.
            </p>
            <div className="ld-herobtns">
              <Link href="/login?mode=create" className="ld-btn solid lg">Start free — build your menu</Link>
              <Link href="/login" className="ld-btn ghost lg">I already have an account</Link>
            </div>
            <div className="ld-trust">
              <span>● No card required</span>
              <span>● Hindi + English</span>
              <span>● Live in minutes</span>
            </div>
          </div>

          {/* phone mock */}
          <div className="ld-heroR" aria-hidden>
            <div className="ld-phone">
              <div className="ld-phscreen">
                <div className="ld-phtop"><Seal size={26} /><div className="ld-phname">Raj Darbar</div><div className="ld-phtag">Table 7 · Scan &amp; order</div></div>
                <div className="ld-phcat">Tandoori Starters</div>
                {[["Paneer Tikka", "₹220", "🧀"], ["Tandoori Chaap", "₹240", "🍢"], ["Hara Bhara Kebab", "₹190", "🥬"]].map(([n, p]) => (
                  <div key={n} className="ld-phdish">
                    <div className="ld-phdot" />
                    <div className="ld-phdinfo"><b>{n}</b><span>{p}</span></div>
                    <div className="ld-phadd">+</div>
                  </div>
                ))}
                <div className="ld-phbar"><span>3 items</span><div className="ld-phorder">Order · ₹650</div></div>
              </div>
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
          {["Scan", "❖", "Serve", "❖", "Savour", "❖", "Repeat"].map((s, i) => (
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
                <div className="ld-ficon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.i} /></svg></div>
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

      {/* WHO */}
      <section id="who" className="ld-sec">
        <div className="ld-wrap ld-whowrap">
          <div>
            <span className="ld-kicker">Built for every kitchen</span>
            <h2>From highway dhabas to city cafés</h2>
            <p className="ld-whotx">Whether you serve fifty plates a day or five hundred, Parosa fits. No POS to rip out, no monthly hardware bill — just a QR on the table and a screen in your hand.</p>
            <div className="ld-chips">
              {AUDIENCE.map((a) => <span key={a} className="ld-chip">{a}</span>)}
            </div>
          </div>
          <div className="ld-statcard">
            {[["₹0", "to start — free forever plan"], ["2 min", "to build your first menu"], ["0", "apps for your guests to install"], ["100%", "Hindi + English, side by side"]].map(([a, b]) => (
              <div key={b} className="ld-stat"><b>{a}</b><span>{b}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="ld-sec alt">
        <div className="ld-wrap">
          <div className="ld-head">
            <span className="ld-kicker">Honest pricing</span>
            <h2>Start free. Grow when you&apos;re ready.</h2>
            <p>No setup fee, no per-QR charge, no surprises. Every table, every scan — included.</p>
          </div>
          <div className="ld-pricewrap">
            <div className="ld-price">
              <div className="ld-pricehd"><h3>Starter</h3><div className="ld-amt">₹0<small>/forever</small></div></div>
              <ul>
                <li>One restaurant, unlimited tables</li>
                <li>Bilingual menu &amp; QR codes</li>
                <li>Live orders &amp; WhatsApp bills</li>
                <li>Payments &amp; basic insights</li>
              </ul>
              <Link href="/login?mode=create" className="ld-btn ghost full">Get started</Link>
            </div>
            <div className="ld-price feat">
              <div className="ld-pricebadge">Coming soon</div>
              <div className="ld-pricehd"><h3>Pro</h3><div className="ld-amt">₹499<small>/month</small></div></div>
              <ul>
                <li>Everything in Starter</li>
                <li>Multiple outlets &amp; staff logins</li>
                <li>Menu templates &amp; branding</li>
                <li>Deep analytics &amp; exports</li>
              </ul>
              <Link href="/login?mode=create" className="ld-btn solid full">Start free today</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ld-final">
        <div aria-hidden className="ld-paisley" />
        <div className="ld-wrap ld-finalin">
          <Seal size={72} />
          <h2 className="emboss">परोसा</h2>
          <p>Give your tables a smarter menu today. It&apos;s free to start — you could be taking your first QR order within the hour.</p>
          <Link href="/login?mode=create" className="ld-btn gold lg">Create your free account</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ld-foot">
        <div className="ld-wrap ld-footrow">
          <div className="ld-brand">
            <Seal size={34} />
            <span className="ld-brandtx dark"><b>परोसा</b><i>PAROSA</i></span>
          </div>
          <div className="ld-footlinks">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login">Login</Link>
            <Link href="/login?mode=create">Sign up</Link>
          </div>
          <p className="ld-copy">© {new Date().getFullYear()} Parosa · Scan · Serve · Savour</p>
        </div>
      </footer>
    </div>
  );
}
