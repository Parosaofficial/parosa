"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { useOwner } from "@/lib/useOwner";
import "../dash.css";
import "./analytics.css";

type Seg = { n: string; pct: number; color: string };

function Donut({ data, size = 148, thickness = 22, top, bottom }: { data: Seg[]; size?: number; thickness?: number; top: string; bottom: string }) {
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="an-donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#EEE2C6" strokeWidth={thickness} />
        {data.map((s, i) => {
          const len = (s.pct / 100) * C;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          off += len;
          return el;
        })}
      </svg>
      <div className="ctr"><b>{top}</b><span>{bottom}</span></div>
    </div>
  );
}

const CATS: Seg[] = [
  { n: "Tandoor", pct: 28, color: "#8C2A28" },
  { n: "Curries", pct: 24, color: "#C25A1E" },
  { n: "Biryani", pct: 20, color: "#C9821B" },
  { n: "Chinese", pct: 14, color: "#0FA39A" },
  { n: "Sweets", pct: 8, color: "#F0468A" },
  { n: "Drinks", pct: 6, color: "#7C55D6" },
];
const PAY: Seg[] = [{ n: "UPI", pct: 62, color: "#0d6b39" }, { n: "Cash", pct: 38, color: "#B07A16" }];

const WEEK = {
  rev: "₹1,08,600", orders: 312, aov: "₹388", repeat: "41%",
  bars: [["Mon", 62, "₹11.2k"], ["Tue", 55, "₹9.8k"], ["Wed", 70, "₹12.4k"], ["Thu", 78, "₹13.9k"], ["Fri", 84, "₹15.1k"], ["Sat", 94, "₹16.8k"], ["Sun", 100, "₹18.2k"]] as const,
  top: [["Butter Chicken", 38, 100], ["Hyderabadi Biryani", 31, 82], ["Paneer Tikka", 27, 71], ["Butter Naan", 24, 63], ["Dal Makhani", 19, 50], ["Chilli Paneer", 16, 42]] as const,
};
const MONTH = { rev: "₹4,42,300", orders: 1284, aov: "₹344", repeat: "47%" };

const HOURS: [string, number, boolean][] = [
  ["12p", 42, false], ["1p", 58, false], ["2p", 46, false], ["3p", 22, false], ["4p", 16, false], ["5p", 28, false],
  ["6p", 52, false], ["7p", 74, false], ["8p", 100, true], ["9p", 92, true], ["10p", 58, false], ["11p", 34, false],
];

export default function Analytics() {
  const { restaurant, ready } = useOwner();
  const [range, setRange] = useState<"week" | "month">("week");
  const d = range === "week" ? WEEK : { ...WEEK, ...MONTH };

  if (!ready || !restaurant) return <AppLoading label="Loading analytics…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Analytics</h1><p>What&apos;s selling, when you&apos;re busy, and what to do next.</p></div>
          <div className="db-acts">
            <div className="an-range">
              <button className={range === "week" ? "on" : ""} onClick={() => setRange("week")}>This week</button>
              <button className={range === "month" ? "on" : ""} onClick={() => setRange("month")}>This month</button>
            </div>
          </div>
        </div>

        <div className="db-content">
          <div className="db-note" style={{ marginBottom: 16 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><b>Sample analytics.</b> These charts show what your trends will look like — your real numbers appear here as orders come in. Live totals are already on your <b>Overview</b>.</span>
          </div>
          {/* KPIs */}
          <div className="db-kpis">
            <div className="db-kpi">
              <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
              <div className="db-kl">Total Revenue</div><div className="db-kv">{d.rev}</div><div className="db-kd up">▲ 14% <span style={{ color: "var(--muted)", fontWeight: 500 }}>vs last {range}</span></div>
            </div>
            <div className="db-kpi">
              <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2l1.5 3h9L18 2M4 7h16l-1.5 13a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8Z" /></svg></div>
              <div className="db-kl">Total Orders</div><div className="db-kv">{d.orders}</div><div className="db-kd up">▲ 9%</div>
            </div>
            <div className="db-kpi">
              <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="M7 14l3-4 4 3 4-6" /></svg></div>
              <div className="db-kl">Avg Order Value</div><div className="db-kv">{d.aov}</div><div className="db-kd up">▲ 5%</div>
            </div>
            <div className="db-kpi">
              <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></svg></div>
              <div className="db-kl">Repeat Guests</div><div className="db-kv">{d.repeat}</div><div className="db-kd up">▲ 3%</div>
            </div>
          </div>

          {/* Revenue trend + Category pie */}
          <div className="an-two">
            <div className="db-panel">
              <div className="db-ph"><h3>Revenue trend</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{d.rev} total</span></div>
              <div className="db-pb">
                <div className="an-bars">
                  {d.bars.map(([lab, h, v]) => (
                    <div key={lab} className={`an-col${lab === "Sun" ? " hi" : ""}`}><div className="an-bk" style={{ height: `${h}%` }}><span className="v">{v}</span></div><span className="an-dl">{lab}</span></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>Sales by category</h3></div>
              <div className="db-pb">
                <div className="an-donutwrap">
                  <Donut data={CATS} top="Tandoor" bottom="Top category" />
                  <div className="an-legend">
                    {CATS.map((c) => (
                      <div className="an-leg" key={c.n}><span className="dot" style={{ background: c.color }} /><span className="nm">{c.n}</span><span className="pct">{c.pct}%</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top items + Payment split */}
          <div className="an-two">
            <div className="db-panel">
              <div className="db-ph"><h3>Top-selling dishes</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>by orders</span></div>
              <div className="db-pb">
                <div className="an-top">
                  {d.top.map(([name, c, w], i) => (
                    <div className="an-ti" key={name}>
                      <span className="rk">{i + 1}</span>
                      <div className="bd"><div className="bn"><span>{name}</span><span className="c">{c}</span></div><div className="bar"><span style={{ width: `${w}%` }} /></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>How guests pay</h3></div>
              <div className="db-pb">
                <div className="an-donutwrap">
                  <Donut data={PAY} top="62%" bottom="via UPI" />
                  <div className="an-legend">
                    {PAY.map((c) => (
                      <div className="an-leg" key={c.n}><span className="dot" style={{ background: c.color }} /><span className="nm">{c.n}</span><span className="pct">{c.pct}%</span></div>
                    ))}
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Most guests prefer UPI — keep your QR pay-link on the bill.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Busiest hours */}
          <div className="db-panel">
            <div className="db-ph"><h3>Busiest hours</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Peak 8–9 PM</span></div>
            <div className="db-pb">
              <div className="an-bars">
                {HOURS.map(([lab, h, hi]) => (
                  <div key={lab} className={`an-col${hi ? " hi" : ""}`}><div className="an-bk" style={{ height: `${h}%` }} /><span className="an-dl">{lab}</span></div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights & suggestions */}
          <div className="db-rule"><span className="t">Smart suggestions</span><span className="ln" /></div>
          <div className="an-insights">
            <div className="an-card star">
              <span className="ic">⭐</span>
              <div><h4>Star product — Butter Chicken</h4><p>38 orders this week, ₹12,920 revenue. It&apos;s your crowd-favourite — feature it at the top of the menu &amp; in a combo.</p><span className="tag">Do: pin to top</span></div>
            </div>
            <div className="an-card">
              <span className="ic">📈</span>
              <div><h4>Fast riser — Hyderabadi Biryani</h4><p>Up 22% vs last week. Consider a weekend biryani offer on WhatsApp to ride the momentum.</p><span className="tag">Do: promote</span></div>
            </div>
            <div className="an-card">
              <span className="ic">🕐</span>
              <div><h4>Rush at 8–9 PM</h4><p>Nearly a third of orders land in this window. Make sure the kitchen &amp; staff are fully stocked before 8.</p><span className="tag">Do: staff up</span></div>
            </div>
            <div className="an-card">
              <span className="ic">🐢</span>
              <div><h4>Slow mover — Malai Soya Chaap</h4><p>Only 4 orders this week. Bundle it into a starter combo, or rotate it out to keep the menu tight.</p><span className="tag">Do: combo or cut</span></div>
            </div>
            <div className="an-card">
              <span className="ic">💡</span>
              <div><h4>Add combo meals</h4><p>Your avg order is {d.aov}. Restaurants with combos see up to 20% higher order value — try &ldquo;Biryani + Lassi&rdquo;.</p><span className="tag">Do: create combos</span></div>
            </div>
            <div className="an-card">
              <span className="ic">🍽️</span>
              <div><h4>Tandoor drives sales</h4><p>28% of revenue comes from the Tandoor section. Add 1–2 new kebabs to grow your best category.</p><span className="tag">Do: expand menu</span></div>
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
