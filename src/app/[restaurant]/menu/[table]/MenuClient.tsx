"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Seal } from "@/components/Logo";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { UpiPay } from "@/components/UpiPay";
import { createOrder } from "@/lib/db";
import { isValidUpi, payNote } from "@/lib/upi";
import { resolveTemplateId, templateStyle } from "@/lib/templates";
import type { Category, Dish, Restaurant } from "@/lib/types";
import "./menu.css";

export function MenuClient({
  restaurant,
  categories,
  dishes,
  table,
  template,
  theme,
}: {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  table: string;
  template?: string;
  theme?: string;
}) {
  const tpl = resolveTemplateId(template ?? restaurant.template);

  const [active, setActive] = useState(categories[0]?.id ?? "");
  const [vegOnly, setVegOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  // the order just placed — drives the success screen and the optional "pay now"
  const [placed, setPlaced] = useState<{ no: string; total: number } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [err, setErr] = useState("");
  const [bump, setBump] = useState(0); // cart-bar pop on add

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const byId = useMemo(() => Object.fromEntries(dishes.map((d) => [d.id, d])), [dishes]);

  /* group dishes under their category, honouring the veg filter + search */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((c) => ({
        cat: c,
        items: dishes.filter(
          (d) =>
            d.category_id === c.id &&
            (!vegOnly || d.is_veg) &&
            (!q || d.name.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, dishes, vegOnly, query]);

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

  /* scroll-spy: highlight the category you're reading */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = top?.target.getAttribute("data-cat");
        if (id) setActive(id);
      },
      { rootMargin: "-150px 0px -65% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [groups.length]);

  const goTo = (id: string) => {
    setActive(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const add = (id: string) => { setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 })); setBump((b) => b + 1); };
  const dec = (id: string) => setCart((c) => { const q = (c[id] || 0) - 1; const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });

  const canPay = !!restaurant.upi_id && isValidUpi(restaurant.upi_id);
  // "Get the bill on WhatsApp" opens a chat WITH the restaurant, so the owner gets the guest's number to send the bill to.
  const waNum = (restaurant.whatsapp || restaurant.phone || "").replace(/\D/g, "");
  const billChat = waNum.length >= 10
    ? (no: string, total: number) => {
        const text = `Hi ${restaurant.name}! Please send my bill 🙏\nOrder #${no} · Table ${table} · ₹${total}`;
        return `https://wa.me/${waNum.length === 10 ? "91" + waNum : waNum}?text=${encodeURIComponent(text)}`;
      }
    : null;

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
      setPlaced({ no: order.order_no ?? "", total: order.total });
      setCart({}); // the order is in — an empty cart means "add more" starts a fresh order
      setCartOpen(false);
    } catch (e) {
      setErr("Sorry, we couldn't place your order. Please try again.");
      setTimeout(() => setErr(""), 3500);
      console.error(e);
    } finally {
      setPlacing(false);
    }
  };

  const Action = ({ d }: { d: Dish }) => {
    const q = cart[d.id] || 0;
    if (!d.available) return <span className="pm-soldout">Sold out</span>;
    if (q > 0)
      return (
        <div className="pm-stepper">
          <button onClick={() => dec(d.id)} aria-label="Remove one">−</button>
          <span className="q">{q}</span>
          <button onClick={() => add(d.id)} aria-label="Add one">+</button>
        </div>
      );
    return <button className="pm-add" onClick={() => add(d.id)}>+ Add</button>;
  };

  return (
    <div className="pm-app" data-tpl={tpl} style={templateStyle(template ?? restaurant.template, theme ?? restaurant.theme)}>
      {/* ---------- sticky chrome ---------- */}
      <header className="pm-top">
        <div className="pm-head">
          <RestaurantLogo restaurant={restaurant} size={42} />
          <div className="pm-id">
            <div className="rn">{restaurant.name}</div>
            <div className="tb">Table {table} · Scan &amp; order</div>
          </div>
          <button className={`pm-icon${searchOpen ? " on" : ""}`} onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setQuery(""); }} aria-label="Search the menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
          </button>
          <button className={`pm-vsw${vegOnly ? " on" : ""}`} onClick={() => setVegOnly((v) => !v)} aria-label="Veg only" title="Veg only">
            <span className="dot" /><span className="lbl">Veg</span>
          </button>
        </div>

        {searchOpen && (
          <div className="pm-search">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes…" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear">×</button>}
          </div>
        )}

        {groups.length > 0 && (
          <nav className="pm-rail">
            {groups.map((g) => (
              <button key={g.cat.id} className={`pm-pill${g.cat.id === active ? " on" : ""}`} onClick={() => goTo(g.cat.id)}>
                {g.cat.name}<span className="n">{g.items.length}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* ---------- body ---------- */}
      <main className="pm-body">
        {hero && !query && (
          <section className={`pm-hero${hero.photo_url ? "" : " noimg"}`}>
            {hero.photo_url && <div className="pm-hero-img" style={{ backgroundImage: `url(${hero.photo_url})` }} />}
            <div className="pm-hero-in">
              <span className="flag">★ Chef&apos;s special</span>
              <h2>{hero.name}</h2>
              {hero.description && <p>{hero.description}</p>}
              <div className="r"><span className="pr">₹{hero.price}</span><Action d={hero} /></div>
            </div>
          </section>
        )}

        {groups.length === 0 ? (
          <div className="pm-empty">
            <b>Nothing matches</b>
            <span>{query ? `No dish called “${query}”.` : "No dishes here yet."}</span>
          </div>
        ) : (
          groups.map((g) => (
            <section
              key={g.cat.id}
              data-cat={g.cat.id}
              ref={(el) => { sectionRefs.current[g.cat.id] = el; }}
              className="pm-sec"
            >
              <div className="pm-sechead"><h3>{g.cat.name}</h3><span className="ln" /><span className="cnt">{g.items.length}</span></div>

              <div className="pm-list">
                {g.items.map((d) => (
                  <article key={d.id} className={`pm-dish${d.photo_url ? "" : " noimg"}${d.available ? "" : " out"}${cart[d.id] ? " in" : ""}`}>
                    {d.photo_url && (
                      <div className="pm-thumb" style={{ backgroundImage: `url(${d.photo_url})` }}>
                        {d.tag === "best" && <span className="badge best">Bestseller</span>}
                        {d.tag === "new" && <span className="badge new">New</span>}
                      </div>
                    )}
                    <div className="pm-mid">
                      <div className="pm-dtop">
                        <span className={`pm-vd${d.is_veg ? "" : " nv"}`} aria-label={d.is_veg ? "Veg" : "Non-veg"} />
                        <span className="pm-dn">{d.name}</span>
                        {/* with no photo there is no thumb to pin the badge to — sit it after the name */}
                        {!d.photo_url && d.tag === "best" && <span className="pm-tag best">Bestseller</span>}
                        {!d.photo_url && d.tag === "new" && <span className="pm-tag new">New</span>}
                      </div>
                      {d.description && <p className="pm-dd">{d.description}</p>}
                      <div className="pm-dbot">
                        <span className="pm-price">₹{d.price}</span>
                        <Action d={d} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}

        <p className="pm-endnote">❖ End of menu ❖<br />Tap <b>+ Add</b> on a dish — it goes straight to your order.</p>
      </main>

      {/* ---------- cart bar ---------- */}
      <div className={`pm-cartbar${count > 0 ? " show" : ""}`} key={`bar-${bump > 0}`}>
        <div className="l">
          <span className="cb">{count}</span>
          <div><div className="lbl">Your order</div><div className="tot">₹{grand}</div></div>
        </div>
        <button className="go" onClick={() => setCartOpen(true)}>View order →</button>
      </div>

      {err && <div className="pm-toast">{err}</div>}

      <div className={`pm-scrim${cartOpen ? " show" : ""}`} onClick={() => setCartOpen(false)} />

      {/* ---------- cart sheet ---------- */}
      <div className={`pm-sheet${cartOpen ? " show" : ""}`} role="dialog" aria-label="Your order">
        <div className="pm-grab" />
        <div className="pm-sh"><h3>Your order</h3><button className="x" onClick={() => setCartOpen(false)} aria-label="Close">×</button></div>
        <div className="pm-sb">
          {cartEntries.length === 0 ? (
            <p className="pm-empty2">Your order is empty.</p>
          ) : cartEntries.map(({ d, q }) => (
            <div key={d.id} className="pm-cline">
              {d.photo_url && <span className="ce" style={{ backgroundImage: `url(${d.photo_url})` }} />}
              <div className="ci"><div className="cn">{d.name}</div><div className="cp">₹{d.price} each</div></div>
              <div className="pm-stepper sm"><button onClick={() => dec(d.id)}>−</button><span className="q">{q}</span><button onClick={() => add(d.id)}>+</button></div>
              <div className="pm-clt">₹{q * d.price}</div>
            </div>
          ))}
          {cartEntries.length > 0 && (
            <div className="pm-totals">
              <div className="pm-tr"><span>Item total</span><span>₹{sub}</span></div>
              <div className="pm-tr"><span>GST (5%)</span><span>₹{gst}</span></div>
              <div className="pm-tr grand"><b>Total</b><span>₹{grand}</span></div>
            </div>
          )}
        </div>
        <div className="pm-sf">
          <button className="pm-place" onClick={placeOrder} disabled={count === 0 || placing}>
            {placing ? "Placing…" : `Place order · ₹${grand}`}
          </button>
        </div>
      </div>

      {/* ---------- success ---------- */}
      {placed && (
        <div className="pm-success">
          <div className="tick">✓</div>
          <h2>Order placed!</h2>
          <div className="oid">#{placed.no} · Table {table} · ₹{placed.total.toLocaleString("en-IN")}</div>
          <p className="msg">{restaurant.name} has your order — the kitchen is on it. Sit back and relax.</p>
          <div className="acts">
            {canPay && <button className="pm-paynow" onClick={() => setPayOpen(true)}>Pay ₹{placed.total.toLocaleString("en-IN")} now · UPI</button>}
            {billChat && <a className="pm-wa" href={billChat(placed.no, placed.total)} target="_blank" rel="noopener noreferrer">Get the bill on WhatsApp</a>}
            <button className="pm-more" onClick={() => { setPlaced(null); setPayOpen(false); }}>+ Add more items</button>
          </div>
          {canPay && <p className="pm-later">Rather pay at the end? That&apos;s fine — pay at the counter.</p>}
          <Seal size={54} className="ds" />
        </div>
      )}

      {/* ---------- pay now (over the success screen) ---------- */}
      {placed && canPay && (
        <>
          <div className={`pm-scrim pm-payscrim${payOpen ? " show" : ""}`} onClick={() => setPayOpen(false)} />
          <div className={`pm-sheet pm-paysheet${payOpen ? " show" : ""}`} role="dialog" aria-label="Pay by UPI">
            <div className="pm-grab" />
            <div className="pm-sh"><h3>Pay ₹{placed.total.toLocaleString("en-IN")}</h3><button className="x" onClick={() => setPayOpen(false)} aria-label="Close">×</button></div>
            <div className="pm-sb">
              <UpiPay upi={restaurant.upi_id!} name={restaurant.name} amount={placed.total} note={payNote(restaurant.name, placed.no, table)} />
              <p className="pm-payafter">After paying, show the payment screen to the staff.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
