"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { updateRestaurant } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import { TEMPLATES, resolveTemplateId } from "@/lib/templates";
import "../dash.css";
import "./templates.css";

const DEMO: Record<string, { dish: string; pr: string }> = {
  aurora: { dish: "Butter Chicken", pr: "₹340" },
  noir: { dish: "Coal-fired Lamb", pr: "₹740" },
  gallery: { dish: "Truffle Pasta", pr: "₹460" },
  express: { dish: "Chole Bhature", pr: "₹120" },
  virasat: { dish: "तंदूरी चिकन", pr: "₹320" },
};

export default function Templates() {
  const { restaurant, ready, reload } = useOwner();
  const [current, setCurrent] = useState("aurora");
  const [saving, setSaving] = useState("");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => { if (restaurant) setCurrent(resolveTemplateId(restaurant.template)); }, [restaurant]);

  const apply = async (id: string, label: string) => {
    if (!restaurant || id === current) return;
    setSaving(id);
    setCurrent(id);
    try {
      await updateRestaurant(restaurant.id, { template: id });
      await reload();
      showToast(`“${label}” is now live on your menu`);
    } catch { showToast("Could not switch — try again"); }
    finally { setSaving(""); }
  };

  const preview = (id: string) => {
    if (!restaurant) return;
    window.open(`/${restaurant.slug}/menu/1?preview=${id}`, "_blank");
  };

  if (!ready || !restaurant) return <AppLoading label="Loading templates…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar"><div><h1>Menu Templates</h1><p>Five designs — each a different layout, not just a colour. Preview any on your real menu, then apply.</p></div></div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><b>These are live.</b> <b>Preview</b> opens your real menu in that design; <b>Apply</b> makes it what every guest sees. Your dishes &amp; prices never change — only the layout and look.</span>
          </div>

          <div className="tp-grid">
            {TEMPLATES.map((t) => {
              const on = t.id === current;
              const chrome = t.vars["--m-chrome"];
              const chromeInk = t.vars["--m-chrome-ink"];
              const acc = t.vars["--m-accent"];
              const accInk = t.vars["--m-accent-ink"];
              const body = t.vars["--m-bg"];
              const ink = t.vars["--m-ink"];
              const line = t.vars["--m-line"];
              const font = t.vars["--m-font-display"];
              const demo = DEMO[t.id] ?? { dish: "Signature Dish", pr: "₹—" };
              return (
                <div key={t.id} className={`tp-card${on ? " active" : ""}`}>
                  {on && <span className="tp-badge">✓ Live</span>}
                  {t.flagship && !on && <span className="tp-flag">★ Parosa signature</span>}

                  {/* mini menu preview */}
                  <div className="tp-prev" style={{ background: body, fontFamily: font }}>
                    <div className="tp-bar" style={{ background: chrome, color: chromeInk }}>
                      <span className="tp-dot" style={{ background: acc }} />
                      <span className="tp-pn">{t.name}{t.hi ? ` · ${t.hi}` : ""}</span>
                    </div>
                    <div className="tp-pills">
                      <span style={{ background: chrome, color: chromeInk }}>Starters</span>
                      <span style={{ color: ink, border: `1px solid ${line}` }}>Mains</span>
                      <span style={{ color: ink, border: `1px solid ${line}` }}>Drinks</span>
                    </div>
                    <div className={`tp-rows tp-${t.id}`}>
                      <div className="tp-row" style={{ borderColor: line, color: ink }}>
                        <span className="tp-th" style={{ background: `color-mix(in srgb, ${acc} 22%, ${line})` }} />
                        <span className="tp-dn">{demo.dish}</span>
                        <span className="tp-pr">{demo.pr}</span>
                        <span className="tp-add" style={{ background: acc, color: accInk }}>+</span>
                      </div>
                      <div className="tp-row" style={{ borderColor: line, color: ink }}>
                        <span className="tp-th" style={{ background: `color-mix(in srgb, ${chrome} 16%, ${line})` }} />
                        <span className="tp-dn">Paneer Tikka</span>
                        <span className="tp-pr">₹240</span>
                        <span className="tp-add" style={{ background: acc, color: accInk }}>+</span>
                      </div>
                    </div>
                  </div>

                  <div className="tp-meta">
                    <div className="tp-tn">{t.name}{t.flagship && <span className="tp-star">★</span>}</div>
                    <div className="tp-tb">{t.best}</div>
                    <p className="tp-blurb">{t.blurb}</p>
                    <div className="tp-dots">{t.swatches.map((d, i) => <span key={i} className="tp-dot2" style={{ background: d }} />)}</div>
                    <div className="tp-row-btns">
                      <button onClick={() => preview(t.id)}>Preview</button>
                      <button className="apply" disabled={saving === t.id} onClick={() => apply(t.id, t.name)}>{on ? "Applied" : saving === t.id ? "Applying…" : "Apply"}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
