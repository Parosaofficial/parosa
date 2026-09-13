"use client";

import { useMemo, useState } from "react";
import { Seal } from "@/components/Logo";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { createOrder } from "@/lib/db";
import { templateStyle } from "@/lib/templates";
import type { Category, Dish, Restaurant } from "@/lib/types";
import "./menu.css";

function ThumbPlaceholder() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6" opacity="0.55" aria-hidden>
      <path d="M7 3v7a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9" />
    </svg>
  );
}

export function MenuClient({
  restaurant,
  categories,
  dishes,
  table,
  template,
}: {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  table: string;
  template?: string;
}) {
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [err, setErr] = useState("");

  const byId = useMemo(() => Object.fromEntries(dishes.map((d) => [d.id, d])), [dishes]);
  const items = useMemo(
    () => dishes.filter((d) => d.category_id === active && (!vegOnly || d.is_veg)),
    [dishes, active, vegOnly]
  );
  const hero = useMemo(
    () => dishes.find((d) => d.tag === "best" && d.available) ?? dishes.find((d) => d.available) ?? null,
    [dishes]
  );

  const { count, sub, gst, grand } = useMemo(() => {
    let c = 0, s = 0;
    for (const id in cart) { const d = byId[id]; if (d) { c += cart[id]; s += cart[id] * d.price; } }
    const g = Math.round(s * 0.05);
    return { count: c, sub: s, gst: g, grand: s + g };
  }, [cart, byId]);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) => setCart((c) => { const q = (c[id] || 0) - 1; const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });

  const cartEntries = Object.keys(cart).map((id) => ({ d: byId[id], q: cart[id] })).filter((e) => e.d);

  const placeOrder = async () => {
    if (count === 0 || placing) return;
    setPlacing(true);
    try {
      const order = await createOrder({
        restaurantId: restaurant.id,
        table,
        subtotal: sub, gst, total: grand,
        items: cartEntries.map(({ d, q }) => ({ dish_id: d.id, name: d.name, qty: q, price: d.price })),
      });
      setOrderNo(order.order_no ?? "");
      setCartOpen(false);
      setSuccess(true);
    } catch (e) {
      setErr("Sorry, we couldn't place your order. Please try again.");
      setTimeout(() => setErr(""), 3500);
      console.error(e);
    } finally {
      setPlacing(false);
    }
  };

  const activeCat = categories.find((c) => c.id === active);

  return (
    <div className="pm-app" style={templateStyle(template ?? restaurant.template)}>
      <div className="pm-top">
        <div className="pm-head">
          <div className="top">
            <RestaurantLogo restaurant={restaurant} size={40} />
            <div className="rn">{restaurant.name}<small>मेज़ {table}</small></div>
            <div className="pm-veg">
              <span className="vl">शाकाहारी</span>
              <button className={`pm-vsw${vegOnly ? " on" : ""}`} onClick={() => setVegOnly((v) => !v)} aria-label="Veg only" />
            </div>
          </div>
        </div>

        <div className="pm-rail">
          {categories.map((c) => (
            <button key={c.id} className={`pm-pill${c.id === active ? " on" : ""}`} onClick={() => setActive(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pm-body">
        {hero && (
          <div className="pm-hero">
            <div className="pat" />
            <div className="in">
              <div className="art" style={hero.photo_url ? { backgroundImage: `url(${hero.photo_url})`, backgroundSize: "cover" } : undefined}>
                {!hero.photo_url && "🍽️"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flag">★ आज का ख़ास · Chef&apos;s Special</div>
                <h3>{hero.name}</h3>
                {hero.description && <div className="en">{hero.description}</div>}
                <div className="r">
                  <span className="pr">₹{hero.price}</span>
                  <button className="pm-add" style={{ background: "var(--gold)", color: "var(--maroon-deep)" }} onClick={() => add(hero.id)}>+ जोड़ें</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pm-sect">
          <h2>{activeCat?.name ?? "Menu"}</h2>
          <span className="ln" />
          <span className="cnt">{items.length} dishes</span>
        </div>

        {items.map((d) => {
          const q = cart[d.id] || 0;
          return (
            <div key={d.id} className={`pm-dish${d.available ? "" : " out"}`}>
              <div className="pm-thumb" style={d.photo_url ? { backgroundImage: `url(${d.photo_url})`, backgroundSize: "cover", fontSize: 0 } : undefined}>
                {d.tag === "best" && <span className="best">बेस्टसेलर</span>}
                {!d.photo_url && <ThumbPlaceholder />}
              </div>
              <div className="pm-mid">
                <div className="pm-dtop"><span className={`pm-vd${d.is_veg ? "" : " nv"}`} /></div>
                <div className="pm-dn">{d.name}</div>
                {d.description && <div className="pm-dd">{d.description}</div>}
                <div className="pm-dbot">
                  <span className="pm-price">₹{d.price}</span>
                  {!d.available ? (
                    <span className="pm-soldout">आज नहीं · Sold out</span>
                  ) : q > 0 ? (
                    <div className="pm-stepper"><button onClick={() => dec(d.id)}>−</button><span className="q">{q}</span><button onClick={() => add(d.id)}>+</button></div>
                  ) : (
                    <button className="pm-add" onClick={() => add(d.id)}>+ जोड़ें</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, padding: "16px 10px 6px" }}>
          ❖ मेन्यू समाप्त ❖<br />Tap a dish to add — it goes straight to your order.
        </p>
      </div>

      <div className={`pm-cartbar${count > 0 ? " show" : ""}`}>
        <div className="l">
          <div className="cb">🛒<span className="n">{count}</span></div>
          <div><div className="lbl">आपका ऑर्डर</div><div className="tot">₹{grand}</div></div>
        </div>
        <button className="go" onClick={() => setCartOpen(true)}>ऑर्डर देखें →</button>
      </div>

      {err && <div className="pm-toast">{err}</div>}

      <div className={`pm-scrim${cartOpen || waOpen ? " show" : ""}`} onClick={() => { setCartOpen(false); setWaOpen(false); }} />

      <div className={`pm-sheet${cartOpen ? " show" : ""}`}>
        <div className="pm-sh"><h3>आपका ऑर्डर</h3><button className="x" onClick={() => setCartOpen(false)}>×</button></div>
        <div className="pm-sb">
          {cartEntries.map(({ d, q }) => (
            <div key={d.id} className="pm-cline">
              <div className="ce">{d.photo_url ? <span className="pm-cthumb" style={{ backgroundImage: `url(${d.photo_url})` }} /> : "🍽️"}</div>
              <div className="ci"><div className="cn">{d.name}</div><div className="cp">₹{d.price} each</div></div>
              <div className="pm-cstep"><button onClick={() => dec(d.id)}>−</button><span className="q">{q}</span><button onClick={() => add(d.id)}>+</button></div>
              <div className="pm-clt">₹{q * d.price}</div>
            </div>
          ))}
          <div className="pm-totals">
            <div className="pm-tr"><span>Item total</span><span>₹{sub}</span></div>
            <div className="pm-tr"><span>GST (5%)</span><span>₹{gst}</span></div>
            <div className="pm-tr grand"><b>कुल · Total</b><span>₹{grand}</span></div>
          </div>
        </div>
        <div className="pm-sf">
          <button className="pm-place" onClick={placeOrder} disabled={count === 0 || placing}>
            {placing ? "Placing…" : "ऑर्डर दें · Place order"}
          </button>
        </div>
      </div>

      <div className={`pm-sheet pm-waview${waOpen ? " show" : ""}`}>
        <div className="pm-sh"><h3>WhatsApp बिल</h3><button className="x" onClick={() => setWaOpen(false)}>×</button></div>
        <div className="pm-sb">
          <div className="pm-wabubble">
            <div className="wh"><div className="wl">प</div><div><div className="wn">{restaurant.name} · Parosa</div><div className="ws">Bill · मेज़ {table}</div></div></div>
            <div className="wc">
              <div>नमस्ते! 🙏 आपके ऑर्डर का बिल:</div>
              <div style={{ margin: "8px 0" }}>
                {cartEntries.map(({ d, q }) => (<div key={d.id} className="li"><span>{q}× {d.name}</span><span>₹{q * d.price}</span></div>))}
                <div className="li" style={{ color: "#777", marginTop: 4 }}><span>GST (5%)</span><span>₹{gst}</span></div>
              </div>
              <div className="tot"><span>कुल Total</span><span>₹{grand}</span></div>
              <div className="pay">UPI से भुगतान करें 👉 tap to pay</div>
              <div style={{ marginTop: 9, fontSize: 11, color: "#555" }}>Order #{orderNo} · धन्यवाद! फिर आइएगा 🌹</div>
            </div>
          </div>
        </div>
        <div className="pm-sf"><p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>In the live app this opens WhatsApp with the bill ready to send.</p></div>
      </div>

      {success && (
        <div className="pm-success">
          <Seal size={96} className="ds" />
          <h2>ऑर्डर हो गया!</h2>
          <div className="on">Your order is on its way to the kitchen 🔥</div>
          <div className="oid">Order #{orderNo} · मेज़ {table}</div>
          <div className="msg">{restaurant.name} received your order. The kitchen is preparing it now — sit back and relax.</div>
          <div className="acts">
            <button className="pm-wa" onClick={() => { setSuccess(false); setWaOpen(true); }}>बिल WhatsApp पर पाएँ</button>
            <button className="pm-more" onClick={() => { setSuccess(false); setCart({}); }}>और जोड़ें · Add more items</button>
          </div>
        </div>
      )}
    </div>
  );
}
