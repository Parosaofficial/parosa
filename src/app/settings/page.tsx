"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Seal } from "@/components/Logo";
import "../dash.css";
import "./settings.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Settings() {
  const [toast, setToast] = useState("");
  const [days, setDays] = useState([true, true, true, true, true, true, true]);
  const [breakOn, setBreakOn] = useState(true);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };
  const toggleDay = (i: number) => setDays((d) => d.map((v, k) => (k === i ? !v : v)));

  return (
    <div className="db-app">
      <Sidebar />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Settings</h1><p>Your restaurant profile, hours and account.</p></div>
          <div className="db-acts"><button className="db-btn prime" onClick={() => showToast("Settings saved ✓")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg> Save changes</button></div>
        </div>
        <div className="db-content">
          <div className="db-panel">
            <div className="db-ph"><h3>Restaurant profile</h3></div>
            <div className="db-pb">
              <div className="set-logo"><div className="set-logoem"><Seal size={52} /></div><div><div className="set-lu">Restaurant logo</div><div className="set-ls">PNG/JPG, square, max 1MB</div><button className="set-upl">Upload logo</button></div></div>
              <div className="db-frow two">
                <div className="db-field"><label>Name (English)</label><input type="text" defaultValue="Raj Darbar" /></div>
                <div className="db-field"><label>नाम (हिंदी)</label><input type="text" defaultValue="राज दरबार" /></div>
              </div>
              <div className="db-field"><label>Tagline</label><input type="text" defaultValue="Royal North-Indian since 1994" /></div>
              <div className="db-field"><label>Short description</label><textarea defaultValue="Slow-cooked curries, clay-oven kebabs and dum biryani, served the royal way." /></div>
            </div>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Contact &amp; location</h3></div>
            <div className="db-pb">
              <div className="db-frow two">
                <div className="db-field"><label>Phone</label><input type="text" defaultValue="+91 98765 43210" /></div>
                <div className="db-field"><label>WhatsApp number</label><input type="text" defaultValue="+91 98765 43210" /></div>
              </div>
              <div className="db-field"><label>Address</label><input type="text" defaultValue="NH-48, Kherki Daula, Gurugram, Haryana 122004" /></div>
              <div className="db-frow three">
                <div className="db-field"><label>City</label><input type="text" defaultValue="Gurugram" /></div>
                <div className="db-field"><label>GSTIN</label><input type="text" defaultValue="06ABCDE1234F1Z5" /></div>
                <div className="db-field"><label>FSSAI</label><input type="text" defaultValue="10012345000123" /></div>
              </div>
            </div>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Opening hours</h3></div>
            <div className="db-pb">
              <div className="db-field"><label>Open on</label>
                <div className="set-days">{DAYS.map((d, i) => <button key={d} className={`set-day${days[i] ? " on" : ""}`} onClick={() => toggleDay(i)}>{d[0]}</button>)}</div>
              </div>
              <div className="db-frow two set-timegrid" style={{ marginTop: 4 }}>
                <div className="db-field" style={{ marginBottom: 0 }}><label>Opens at</label><input type="time" defaultValue="11:00" /></div>
                <div className="db-field" style={{ marginBottom: 0 }}><label>Closes at</label><input type="time" defaultValue="23:30" /></div>
              </div>
              <div className="db-togrow" style={{ marginTop: 8 }}>
                <div><div className="tt">Break time (kitchen closed)</div><div className="ts">Afternoon break between lunch &amp; dinner service</div></div>
                <button className={`db-switch${breakOn ? " on" : ""}`} onClick={() => setBreakOn((v) => !v)} />
              </div>
              {breakOn && (
                <div className="db-frow two set-timegrid" style={{ marginTop: 14 }}>
                  <div className="db-field" style={{ marginBottom: 0 }}><label>Break from</label><input type="time" defaultValue="15:30" /></div>
                  <div className="db-field" style={{ marginBottom: 0 }}><label>Break to</label><input type="time" defaultValue="18:00" /></div>
                </div>
              )}
            </div>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Account</h3></div>
            <div className="db-pb">
              <div className="db-field"><label>Owner email</label><input type="text" defaultValue="parosa.app@gmail.com" readOnly style={{ opacity: 0.75 }} /></div>
              <div className="set-plan"><div className="pn"><b>Parosa Free</b><div>1 restaurant · up to 15 tables · WhatsApp bills</div></div><button className="set-up" onClick={() => showToast("Opening upgrade… (₹399/mo)")}>Upgrade ₹399/mo</button></div>
            </div>
          </div>

          <div className="db-panel set-danger">
            <div className="db-ph"><h3>Danger zone</h3></div>
            <div className="db-pb" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>Delete restaurant</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Permanently removes your menu, QRs and data.</div></div>
              <button className="set-del" onClick={() => showToast("(Demo) deletion is disabled here")}>Delete राज दरबार</button>
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
