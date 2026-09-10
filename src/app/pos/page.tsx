"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { AppLoading } from "@/components/AppLoading";
import { createOrder, getMenu, staffCustomerLookup } from "@/lib/db";
import { clearStaffSession, useStaff } from "@/lib/useStaff";
import type { Category, Dish, Restaurant } from "@/lib/types";
import "./pos.css";

export default function POS() {
  const router = useRouter();
  const { staff, ready } = useStaff();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const [table, setTable] = useState("");
  const [phone, setPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [looking, setLooking] = useState(false);
  const [activeCat, setActiveCat] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [doneNo, setDoneNo] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    (async () => {
      if (!staff) return;
      const m = await getMenu(staff.slug);
      if (m) { setRestaurant(m.restaurant); setCats(m.categories); setDishes(m.dishes); setActiveCat(m.categories[0]?.id ?? ""); }
      setLoading(false);
    })();
  }, [staff]);

  const byId = useMemo(() => Object.fromEntries(dishes.map((d) => [d.id, d])), [dishes]);
  const shown = useMemo(
    () => dishes.filter((d) => d.available && (search ? d.name.toLowerCase().includes(search.toLowerCase()) : d.category_id === activeCat)),
    [dishes, search, activeCat]
  );
  const { count, sub, gst, grand } = useMemo(() => {
    let c = 0, s = 0;
    for (const id in cart) { const d = byId[id]; if (d) { c += cart[id]; s += cart[id] * d.price; } }
    const g = Math.round(s * 0.05);
    return { count: c, sub: s, gst: g, grand: s + g };
  }, [cart, byId]);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) => setCart((c) => { const q = (c[id] || 0) - 1; const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });
  const cartLines = Object.keys(cart).map((id) => ({ d: byId[id], q: cart[id] })).filter((e) => e.d);

  const lookup = async () => {
    if (!staff || !phone.trim()) return;
    setLooking(true);
    try {
      const name = await staffCustomerLookup(staff.restaurant_id, staff.code, phone);
      if (name) { setCustName(name); showToast(`Welcome back, ${name}`); }
      else showToast("New customer — add their name");
    } catch { /* ignore */ }
    finally { setLooking(false); }
  };

  const place = async () => {
    if (!staff || !restaurant) return;
    if (!table.trim()) { showToast("Enter a table number"); return; }
    if (count === 0) { showToast("Add at least one item"); return; }
    setPlacing(true);
    try {
      const items = Object.keys(cart).map((id) => ({ dish_id: id, name: byId[id].name, qty: cart[id], price: byId[id].price }));
      const order = await createOrder({
        restaurantId: restaurant.id, table: table.trim(), items, subtotal: sub, gst, total: grand,
        phone: phone.trim() || undefined, customerName: custName.trim() || undefined, staffName: staff.staff_name,
      });
      setDoneNo(order.order_no ?? "");
    } catch { showToast("Could not place order — try again"); }
    finally { setPlacing(false); }
  };

  const newOrder = () => { setDoneNo(null); setCart({}); setTable(""); setPhone(""); setCustName(""); setSearch(""); };
  const logout = () => { clearStaffSession(); router.replace("/login?staff=1"); };

  if (!ready || !staff) return <AppLoading label="Opening POS…" />;

  return (
    <div className="pos">
      <header className="pos-top">
        <div className="pos-brand">
          {restaurant ? <RestaurantLogo restaurant={restaurant} size={36} /> : <span className="pos-lg" />}
          <div><div className="rn">{staff.restaurant_name}</div><div className="sub">POS · Take orders</div></div>
        </div>
        <div className="pos-who">
          <span className="chip">👤 {staff.staff_name}</span>
          <button className="pos-out" onClick={logout} title="Log out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 50, textAlign: "center", color: "var(--muted)" }}>Loading menu…</div>
      ) : (
        <div className="pos-grid">
          {/* LEFT — order details + menu */}
          <div className="pos-main">
            <div className="pos-card pos-cust">
              <div className="pos-row3">
                <div className="pos-f"><label>Table</label><input className="pos-tbl" inputMode="numeric" placeholder="e.g. 5" value={table} onChange={(e) => setTable(e.target.value)} /></div>
                <div className="pos-f grow"><label>Customer phone</label><div className="pos-inline"><input inputMode="numeric" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} /><button onClick={lookup} disabled={looking || !phone.trim()}>{looking ? "…" : "Find"}</button></div></div>
                <div className="pos-f grow"><label>Customer name</label><input placeholder="Name (saved for next time)" value={custName} onChange={(e) => setCustName(e.target.value)} /></div>
              </div>
            </div>

            <div className="pos-menuhd">
              <div className="pos-cats">
                {cats.map((c) => <button key={c.id} className={`pos-pill${!search && c.id === activeCat ? " on" : ""}`} onClick={() => { setSearch(""); setActiveCat(c.id); }}>{c.name}</button>)}
              </div>
              <div className="pos-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg><input placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>

            <div className="pos-dishes">
              {shown.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13, gridColumn: "1/-1" }}>No dishes here.</div>
              ) : shown.map((d) => {
                const q = cart[d.id] || 0;
                return (
                  <button key={d.id} className={`pos-dish${q > 0 ? " in" : ""}`} onClick={() => add(d.id)}>
                    <span className={`pos-vd${d.is_veg ? "" : " nv"}`} />
                    <span className="dn">{d.name}</span>
                    <span className="pr">₹{d.price}</span>
                    {q > 0 && <span className="qb">{q}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — running order */}
          <aside className="pos-cartcol">
            <div className="pos-card pos-cart">
              <div className="pos-cart-hd"><h3>Current order</h3>{count > 0 && <button className="clear" onClick={() => setCart({})}>Clear</button>}</div>
              <div className="pos-cart-list">
                {cartLines.length === 0 ? (
                  <div className="pos-empty">Tap dishes to add them here.</div>
                ) : cartLines.map(({ d, q }) => (
                  <div key={d.id} className="pos-cline">
                    <div className="ci"><div className="cn">{d.name}</div><div className="cp">₹{d.price}</div></div>
                    <div className="pos-step"><button onClick={() => dec(d.id)}>−</button><span>{q}</span><button onClick={() => add(d.id)}>+</button></div>
                    <div className="clt">₹{q * d.price}</div>
                  </div>
                ))}
              </div>
              {count > 0 && (
                <div className="pos-tot">
                  <div className="tr"><span>Subtotal</span><span>₹{sub}</span></div>
                  <div className="tr"><span>GST (5%)</span><span>₹{gst}</span></div>
                  <div className="tr grand"><span>Total</span><span>₹{grand}</span></div>
                </div>
              )}
              <button className="pos-place" onClick={place} disabled={placing || count === 0}>{placing ? "Placing…" : `Place order · ₹${grand}`}</button>
            </div>
          </aside>
        </div>
      )}

      {/* mobile sticky bar */}
      {!loading && count > 0 && (
        <div className="pos-bottombar">
          <div><b>{count} item{count > 1 ? "s" : ""}</b><span>₹{grand}</span></div>
          <button onClick={place} disabled={placing}>{placing ? "Placing…" : "Place order →"}</button>
        </div>
      )}

      {doneNo && (
        <div className="pos-done">
          <div className="tick">✓</div>
          <h2>Order placed!</h2>
          <p>Order <b>#{doneNo}</b>{table ? ` · Table ${table}` : ""} is now on the kitchen board.</p>
          <button className="pos-place" onClick={newOrder}>+ New order</button>
        </div>
      )}

      <div className={`pos-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
