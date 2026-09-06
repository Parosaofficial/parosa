"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { updateRestaurant } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import "../dash.css";
import "./templates.css";

type Tpl = { id: string; name: string; hi?: string; best: string; font: string; bg: string; text: string; acc: string; dish: string; pr: string; dots: string[] };

const T: Tpl[] = [
  { id: "virasat", name: "Virasat", hi: "विरासत", best: "Heritage · your brand", font: "var(--font-display)", bg: "#6E1618", text: "#F0E4C8", acc: "#CBA24E", dish: "तंदूरी चिकन", pr: "₹320", dots: ["#6E1618", "#EFE6D1", "#CBA24E"] },
  { id: "noir", name: "Noir Maison", best: "Fine dining · dark", font: "Georgia, serif", bg: "#12100E", text: "#F3EAD8", acc: "#C79A45", dish: "Coal-fired Lamb", pr: "₹740", dots: ["#12100E", "#C79A45", "#F3EAD8"] },
  { id: "masala", name: "Masala Market", best: "Dhaba · warm", font: "var(--font-body)", bg: "#FFF3D6", text: "#5A3A12", acc: "#E4761B", dish: "Chole Bhature", pr: "₹120", dots: ["#FFF3D6", "#E4761B", "#5A3A12"] },
  { id: "tandoor", name: "Tandoor", best: "Street food · bold", font: "var(--font-body)", bg: "#B3160F", text: "#FFF3E0", acc: "#FFC533", dish: "TANDOORI CHICKEN", pr: "₹320", dots: ["#B3160F", "#FFC533", "#FFF3E0"] },
  { id: "blanc", name: "Blanc", best: "Cafe · minimal", font: "Georgia, serif", bg: "#FFFFFF", text: "#111", acc: "#111", dish: "Flat White", pr: "₹190", dots: ["#FFFFFF", "#111111", "#8A8A8A"] },
  { id: "midnight", name: "Midnight", best: "Bar · nightlife", font: "var(--font-body)", bg: "#0C1116", text: "#E6EEF2", acc: "#31E0C4", dish: "Smoked Negroni", pr: "₹550", dots: ["#0C1116", "#31E0C4", "#E6EEF2"] },
  { id: "gelato", name: "Gelato Bar", best: "Dessert · playful", font: "var(--font-body)", bg: "#FDEAF0", text: "#5A2A3E", acc: "#F26E9A", dish: "Pistachio Gelato", pr: "₹180", dots: ["#FDEAF0", "#F26E9A", "#5A2A3E"] },
  { id: "bento", name: "Bento Fresh", best: "QSR · app-style", font: "var(--font-body)", bg: "#F5F6F8", text: "#151A20", acc: "#FF5A1F", dish: "Teriyaki Bowl", pr: "₹260", dots: ["#F5F6F8", "#FF5A1F", "#151A20"] },
  { id: "coastal", name: "Coastal Catch", best: "Seafood · fresh", font: "Georgia, serif", bg: "#E4F1F2", text: "#123840", acc: "#0E8C93", dish: "Prawn Ghee Roast", pr: "₹420", dots: ["#E4F1F2", "#0E8C93", "#123840"] },
];

export default function Templates() {
  const { restaurant, ready, reload } = useOwner();
  const [current, setCurrent] = useState("virasat");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  useEffect(() => { if (restaurant?.template) setCurrent(restaurant.template); }, [restaurant]);

  const apply = async (id: string, label: string) => {
    if (!restaurant) return;
    setCurrent(id);
    await updateRestaurant(restaurant.id, { template: id });
    await reload();
    showToast(`Template set to “${label}”`);
  };

  if (!ready || !restaurant) return <AppLoading label="Loading templates…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar"><div><h1>Templates</h1><p>Pick the look your diners see. Switch any time, free.</p></div></div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><b>Virasat is live now</b> — the heritage look your diners see today. More themes are rolling out; your saved choice applies automatically as each one goes live. Your menu &amp; prices never change, only the look.</span>
          </div>
          <div className="tp-grid">
            {T.map((t) => {
              const on = t.id === current;
              return (
                <div key={t.id} className={`tp-card${on ? " active" : ""}`}>
                  {on && <span className="tp-badge">✓ Active</span>}
                  <div className="tp-prev" style={{ background: t.bg, color: t.text, fontFamily: t.font }}>
                    <div className="tp-pn" style={{ fontFamily: t.font }}>{t.name}{t.hi ? ` ${t.hi}` : ""}</div>
                    <div className="tp-chips"><span className="tp-chip" style={{ background: t.acc, color: t.bg }}>Menu</span><span className="tp-chip" style={{ background: "#ffffff33", color: t.text }}>Drinks</span></div>
                    <div className="tp-drow"><span className="e">🍛</span><span className="dn" style={{ fontFamily: t.font }}>{t.dish}</span><span className="pr">{t.pr}</span><span className="add" style={{ background: t.acc, color: t.bg }}>ADD</span></div>
                  </div>
                  <div className="tp-meta">
                    <div className="tp-tn">{t.name}</div>
                    <div className="tp-tb">{t.best}</div>
                    <div className="tp-dots">{t.dots.map((d, i) => <span key={i} className="tp-dot" style={{ background: d }} />)}</div>
                    <div className="tp-row">
                      <button onClick={() => showToast(`Opening “${t.name}” preview…`)}>Preview</button>
                      <button className="apply" onClick={() => apply(t.id, t.name)}>{on ? "Applied" : "Apply"}</button>
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
