"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { updateRestaurant } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import { TEMPLATES } from "@/lib/templates";
import "../dash.css";
import "./templates.css";

const DEMO: Record<string, { dish: string; pr: string }> = {
  virasat: { dish: "तंदूरी चिकन", pr: "₹320" },
  noir: { dish: "Coal-fired Lamb", pr: "₹740" },
  masala: { dish: "Chole Bhature", pr: "₹120" },
  tandoor: { dish: "Tandoori Chicken", pr: "₹320" },
  blanc: { dish: "Flat White", pr: "₹190" },
  midnight: { dish: "Smoked Negroni", pr: "₹550" },
  gelato: { dish: "Pistachio Gelato", pr: "₹180" },
  bento: { dish: "Teriyaki Bowl", pr: "₹260" },
  coastal: { dish: "Prawn Ghee Roast", pr: "₹420" },
};

export default function Templates() {
  const { restaurant, ready, reload } = useOwner();
  const [current, setCurrent] = useState("virasat");
  const [saving, setSaving] = useState("");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => { if (restaurant?.template) setCurrent(restaurant.template); }, [restaurant]);

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
        <div className="db-topbar"><div><h1>Templates</h1><p>Pick the look your diners see. Preview any theme on your real menu, then apply — your dishes &amp; prices never change.</p></div></div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><b>These are live.</b> <b>Preview</b> opens your real menu in that theme in a new tab; <b>Apply</b> makes it what every customer sees instantly. Only the look changes — never your dishes or prices.</span>
          </div>
          <div className="tp-grid">
            {TEMPLATES.map((t) => {
              const on = t.id === current;
              const bg = t.vars["--oxblood"];
              const text = t.vars["--gold-soft"];
              const acc = t.vars["--gold-hi"];
              const body = t.vars["--parch"];
              const demo = DEMO[t.id] ?? { dish: "Signature Dish", pr: "₹—" };
              return (
                <div key={t.id} className={`tp-card${on ? " active" : ""}`}>
                  {on && <span className="tp-badge">✓ Live</span>}
                  <div className="tp-prev" style={{ background: bg, color: text, fontFamily: t.vars["--font-display"] }}>
                    <div className="tp-pn" style={{ fontFamily: t.vars["--font-display"] }}>{t.name}{t.hi ? ` ${t.hi}` : ""}</div>
                    <div className="tp-chips"><span className="tp-chip" style={{ background: acc, color: bg }}>Menu</span><span className="tp-chip" style={{ background: "#ffffff2e", color: text }}>Drinks</span></div>
                    <div className="tp-drow" style={{ background: body }}><span className="dn" style={{ fontFamily: t.vars["--font-display"], color: t.vars["--ink"] }}>{demo.dish}</span><span className="pr" style={{ color: t.vars["--ink"] }}>{demo.pr}</span><span className="add" style={{ background: bg, color: acc }}>ADD</span></div>
                  </div>
                  <div className="tp-meta">
                    <div className="tp-tn">{t.name}</div>
                    <div className="tp-tb">{t.blurb}</div>
                    <div className="tp-dots">{t.swatches.map((d, i) => <span key={i} className="tp-dot" style={{ background: d }} />)}</div>
                    <div className="tp-row">
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
