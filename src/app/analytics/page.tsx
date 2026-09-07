"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { getMenu, getOrderItems, listOrders } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import type { Category, Dish, Order } from "@/lib/types";
import "../dash.css";
import "./analytics.css";

type Seg = { n: string; pct: number; color: string };
type Item = { order_id: string; dish_id: string | null; name: string; qty: number; price: number };

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

const PALETTE = ["#8C2A28", "#C25A1E", "#C9821B", "#0FA39A", "#F0468A", "#7C55D6"];
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const kfmt = (n: number) => (n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`);
const fmtHour = (h: number) => (h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`);
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function Analytics() {
  const { restaurant, ready } = useOwner();
  const [range, setRange] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    (async () => {
      if (!restaurant) return;
      const os = await listOrders(restaurant.id);
      const [its, menu] = await Promise.all([getOrderItems(os.map((o) => o.id)), getMenu(restaurant.slug)]);
      setOrders(os);
      setItems(its);
      setCats(menu?.categories ?? []);
      setDishes(menu?.dishes ?? []);
      setLoading(false);
    })();
  }, [restaurant]);

  const A = useMemo(() => {
    const now = new Date();
    const days = range === "week" ? 7 : 30;
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
    const prevCutoff = cutoff - days * 86400000;

    const inRange = orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
    const prevRange = orders.filter((o) => { const t = new Date(o.created_at).getTime(); return t >= prevCutoff && t < cutoff; });
    const ids = new Set(inRange.map((o) => o.id));
    const rItems = items.filter((it) => ids.has(it.order_id));

    const paid = inRange.filter((o) => o.payment_status === "paid");
    const revenue = paid.reduce((a, o) => a + o.total, 0);
    const prevRevenue = prevRange.filter((o) => o.payment_status === "paid").reduce((a, o) => a + o.total, 0);
    const aov = paid.length ? Math.round(revenue / paid.length) : 0;

    const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
    const revDelta = pct(revenue, prevRevenue);
    const ordDelta = pct(inRange.length, prevRange.length);

    // repeat guests
    const phoneCounts: Record<string, number> = {};
    inRange.forEach((o) => { if (o.customer_phone) phoneCounts[o.customer_phone] = (phoneCounts[o.customer_phone] || 0) + 1; });
    const distinct = Object.keys(phoneCounts).length;
    const repeat = distinct ? Math.round((Object.values(phoneCounts).filter((c) => c > 1).length / distinct) * 100) : 0;

    // revenue trend (paid, by day)
    const dayRev: Record<string, number> = {};
    paid.forEach((o) => { const k = dayKey(new Date(o.created_at)); dayRev[k] = (dayRev[k] || 0) + o.total; });
    const rawBars = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const v = dayRev[dayKey(d)] || 0;
      const showLabel = days <= 7 || i % 5 === 0;
      rawBars.push({ label: showLabel ? (days <= 7 ? d.toLocaleDateString("en-IN", { weekday: "short" }) : String(d.getDate())) : "", v });
    }
    const maxRev = Math.max(1, ...rawBars.map((b) => b.v));
    const trend = rawBars.map((b) => ({ label: b.label, v: b.v, h: Math.round((b.v / maxRev) * 100), tip: kfmt(b.v) }));

    // category split by revenue
    const dishById: Record<string, Dish> = Object.fromEntries(dishes.map((d) => [d.id, d]));
    const catById: Record<string, Category> = Object.fromEntries(cats.map((c) => [c.id, c]));
    const catRev: Record<string, number> = {};
    rItems.forEach((it) => {
      const d = it.dish_id ? dishById[it.dish_id] : null;
      const cname = d ? catById[d.category_id]?.name || "Other" : "Other";
      catRev[cname] = (catRev[cname] || 0) + it.qty * it.price;
    });
    const catTotal = Object.values(catRev).reduce((a, b) => a + b, 0) || 1;
    const catSegs: Seg[] = Object.entries(catRev).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([n, v], i) => ({ n, pct: Math.round((v / catTotal) * 100), color: PALETTE[i % PALETTE.length] }));

    // top dishes by qty
    const dishQty: Record<string, number> = {};
    const dishRev: Record<string, number> = {};
    rItems.forEach((it) => { dishQty[it.name] = (dishQty[it.name] || 0) + it.qty; dishRev[it.name] = (dishRev[it.name] || 0) + it.qty * it.price; });
    const topArr = Object.entries(dishQty).sort((a, b) => b[1] - a[1]);
    const topMax = topArr[0]?.[1] || 1;
    const top = topArr.slice(0, 6).map(([name, c]) => ({ name, c, w: Math.round((c / topMax) * 100) }));

    // payment split
    const payRev = { UPI: 0, Cash: 0, Other: 0 };
    paid.forEach((o) => { const m = (o.payment_method || "").toLowerCase(); if (m.includes("upi")) payRev.UPI += o.total; else if (m.includes("cash")) payRev.Cash += o.total; else payRev.Other += o.total; });
    const payTotal = payRev.UPI + payRev.Cash + payRev.Other || 1;
    const paySegs: Seg[] = ([["UPI", payRev.UPI, "#0d6b39"], ["Cash", payRev.Cash, "#B07A16"], ["Other", payRev.Other, "#9a7c55"]] as const)
      .filter(([, v]) => v > 0).map(([n, v, color]) => ({ n, pct: Math.round((v / payTotal) * 100), color }));
    const upiPct = Math.round((payRev.UPI / payTotal) * 100);

    // busiest hours (11am–11pm)
    const hourCount: Record<number, number> = {};
    inRange.forEach((o) => { const h = new Date(o.created_at).getHours(); hourCount[h] = (hourCount[h] || 0) + 1; });
    const hoursRaw = []; for (let h = 11; h <= 23; h++) hoursRaw.push({ h, c: hourCount[h] || 0 });
    const hrMax = Math.max(1, ...hoursRaw.map((x) => x.c));
    const peak = hoursRaw.reduce((a, b) => (b.c > a.c ? b : a), { h: -1, c: -1 });
    const hours = hoursRaw.map((x) => ({ label: fmtHour(x.h), h: Math.round((x.c / hrMax) * 100), hi: x.h === peak.h && peak.c > 0 }));

    const star = topArr[0] ? { name: topArr[0][0], qty: topArr[0][1], rev: dishRev[topArr[0][0]] || 0 } : null;
    // slow mover: an available dish that sold least (or not at all)
    const soldSet = new Set(rItems.map((it) => it.name));
    const slow = dishes.filter((d) => d.available).map((d) => ({ name: d.name, qty: dishQty[d.name] || 0 }))
      .sort((a, b) => a.qty - b.qty)[0] || null;

    return {
      hasAny: orders.length > 0, hasRange: inRange.length > 0,
      revenue, orders: inRange.length, aov, repeat, revDelta, ordDelta,
      trend, catSegs, top, paySegs, upiPct, hours,
      peakLabel: peak.c > 0 ? fmtHour(peak.h) : "—",
      star, topCat: catSegs[0]?.n, slow, soldCount: soldSet.size,
    };
  }, [orders, items, cats, dishes, range]);

  if (!ready || !restaurant) return <AppLoading label="Loading analytics…" />;

  const delta = (d: number | null) => (d === null ? <span className="db-kd flat">— new</span> : <span className={`db-kd ${d >= 0 ? "up" : "down"}`}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}% <span style={{ color: "var(--muted)", fontWeight: 500 }}>vs last {range}</span></span>);

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
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Crunching your numbers…</div>
          ) : !A.hasAny ? (
            <div className="an-empty">
              <div className="an-emptyicon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3v18h18" /><path d="M7 14l3-4 4 3 4-6" /></svg></div>
              <h3>No data yet</h3>
              <p>Your revenue trends, bestsellers, busy hours and smart suggestions all appear here automatically as customers place orders.</p>
              <Link href="/tables" className="db-btn prime">Set up your tables &amp; QR →</Link>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="db-kpis">
                <div className="db-kpi">
                  <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
                  <div className="db-kl">Revenue (paid)</div><div className="db-kv">{inr(A.revenue)}</div>{delta(A.revDelta)}
                </div>
                <div className="db-kpi">
                  <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2l1.5 3h9L18 2M4 7h16l-1.5 13a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8Z" /></svg></div>
                  <div className="db-kl">Orders</div><div className="db-kv">{A.orders}</div>{delta(A.ordDelta)}
                </div>
                <div className="db-kpi">
                  <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="M7 14l3-4 4 3 4-6" /></svg></div>
                  <div className="db-kl">Avg Order Value</div><div className="db-kv">{inr(A.aov)}</div><div className="db-kd flat">per paid bill</div>
                </div>
                <div className="db-kpi">
                  <div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></svg></div>
                  <div className="db-kl">Repeat Guests</div><div className="db-kv">{A.repeat}%</div><div className="db-kd flat">by phone number</div>
                </div>
              </div>

              {!A.hasRange && (
                <div className="db-note" style={{ marginTop: 16 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
                  <span>No orders in this {range} yet — you have earlier orders though. Switch the range or check back after today&apos;s service.</span>
                </div>
              )}

              {/* Revenue trend + Category */}
              <div className="an-two">
                <div className="db-panel">
                  <div className="db-ph"><h3>Revenue trend</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{inr(A.revenue)} total</span></div>
                  <div className="db-pb">
                    <div className="an-bars">
                      {A.trend.map((b, i) => (
                        <div key={i} className={`an-col${b.v > 0 && b.h >= 100 ? " hi" : ""}`}><div className="an-bk" style={{ height: `${Math.max(b.h, 2)}%` }}>{b.v > 0 && <span className="v">{b.tip}</span>}</div><span className="an-dl">{b.label}</span></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="db-panel">
                  <div className="db-ph"><h3>Sales by category</h3></div>
                  <div className="db-pb">
                    {A.catSegs.length === 0 ? (
                      <div style={{ padding: "24px 4px", color: "var(--muted)", fontSize: 13 }}>No sales in this period yet.</div>
                    ) : (
                      <div className="an-donutwrap">
                        <Donut data={A.catSegs} top={A.topCat ?? "—"} bottom="Top category" />
                        <div className="an-legend">
                          {A.catSegs.map((c) => (
                            <div className="an-leg" key={c.n}><span className="dot" style={{ background: c.color }} /><span className="nm">{c.n}</span><span className="pct">{c.pct}%</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top items + Payment split */}
              <div className="an-two">
                <div className="db-panel">
                  <div className="db-ph"><h3>Top-selling dishes</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>by quantity</span></div>
                  <div className="db-pb">
                    {A.top.length === 0 ? (
                      <div style={{ padding: "24px 4px", color: "var(--muted)", fontSize: 13 }}>No dishes sold in this period yet.</div>
                    ) : (
                      <div className="an-top">
                        {A.top.map((t, i) => (
                          <div className="an-ti" key={t.name}>
                            <span className="rk">{i + 1}</span>
                            <div className="bd"><div className="bn"><span>{t.name}</span><span className="c">{t.c}</span></div><div className="bar"><span style={{ width: `${t.w}%` }} /></div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="db-panel">
                  <div className="db-ph"><h3>How guests pay</h3></div>
                  <div className="db-pb">
                    {A.paySegs.length === 0 ? (
                      <div style={{ padding: "24px 4px", color: "var(--muted)", fontSize: 13 }}>No paid bills in this period yet.</div>
                    ) : (
                      <div className="an-donutwrap">
                        <Donut data={A.paySegs} top={`${A.upiPct}%`} bottom="via UPI" />
                        <div className="an-legend">
                          {A.paySegs.map((c) => (
                            <div className="an-leg" key={c.n}><span className="dot" style={{ background: c.color }} /><span className="nm">{c.n}</span><span className="pct">{c.pct}%</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Busiest hours */}
              <div className="db-panel">
                <div className="db-ph"><h3>Busiest hours</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Peak {A.peakLabel}</span></div>
                <div className="db-pb">
                  <div className="an-bars">
                    {A.hours.map((x, i) => (
                      <div key={i} className={`an-col${x.hi ? " hi" : ""}`}><div className="an-bk" style={{ height: `${Math.max(x.h, 2)}%` }} /><span className="an-dl">{x.label}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Smart suggestions (data-driven) */}
              {(A.star || A.slow) && (
                <>
                  <div className="db-rule"><span className="t">Smart suggestions</span><span className="ln" /></div>
                  <div className="an-insights">
                    {A.star && (
                      <div className="an-card star">
                        <span className="ic">⭐</span>
                        <div><h4>Star product — {A.star.name}</h4><p>{A.star.qty} sold this {range}, {inr(A.star.rev)} in revenue. Feature it at the top of your menu and build a combo around it.</p><span className="tag">Do: pin to top</span></div>
                      </div>
                    )}
                    {A.peakLabel !== "—" && (
                      <div className="an-card">
                        <span className="ic">🕐</span>
                        <div><h4>Rush around {A.peakLabel}</h4><p>This is your busiest hour. Make sure the kitchen and staff are fully stocked and ready before the rush hits.</p><span className="tag">Do: staff up</span></div>
                      </div>
                    )}
                    {A.topCat && (
                      <div className="an-card">
                        <span className="ic">🍽️</span>
                        <div><h4>{A.topCat} drives sales</h4><p>It&apos;s your top category by revenue this {range}. Add one or two new dishes here to grow your strongest section.</p><span className="tag">Do: expand menu</span></div>
                      </div>
                    )}
                    {A.slow && A.slow.qty === 0 && (
                      <div className="an-card">
                        <span className="ic">🐢</span>
                        <div><h4>Slow mover — {A.slow.name}</h4><p>No orders this {range}. Bundle it into a combo, improve its photo, or rotate it out to keep the menu tight.</p><span className="tag">Do: combo or cut</span></div>
                      </div>
                    )}
                    <div className="an-card">
                      <span className="ic">💡</span>
                      <div><h4>Lift your order value</h4><p>Your average paid bill is {inr(A.aov)}. Restaurants with combo meals see up to 20% higher order value — try pairing a bestseller with a drink.</p><span className="tag">Do: create combos</span></div>
                    </div>
                    <div className="an-card">
                      <span className="ic">📲</span>
                      <div><h4>Turn bills into reviews</h4><p>Add your Google review QR from Tables &amp; QR to every bill — happy guests leave 5-star reviews that bring new customers.</p><span className="tag">Do: add review QR</span></div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
