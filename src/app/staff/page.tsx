"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { Dialog } from "@/components/Dialog";
import { addStaff, deleteStaff, generateStaffCode, listStaff, updateStaff } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import type { Staff } from "@/lib/types";
import "../dash.css";
import "./staff.css";

const localToday = () => new Date().toLocaleDateString("en-CA");
type Form = { id: string | null; name: string; phone: string; email: string; dob: string; aadhaar: string };
const blank = (): Form => ({ id: null, name: "", phone: "", email: "", dob: "", aadhaar: "" });

export default function StaffPage() {
  const { restaurant, ready, reload } = useOwner();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [codeToday, setCodeToday] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Staff | null>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const load = async () => { if (restaurant) { setStaff(await listStaff(restaurant.id)); setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [restaurant]);
  useEffect(() => {
    if (!restaurant) return;
    setCode(restaurant.staff_code ?? null);
    setCodeToday(restaurant.staff_code_date === localToday());
  }, [restaurant]);

  const genCode = async () => {
    if (!restaurant) return;
    setGenBusy(true);
    try { const c = await generateStaffCode(restaurant.id); setCode(c); setCodeToday(true); await reload(); showToast("Today's code is ready"); }
    catch { showToast("Could not generate — try again"); }
    finally { setGenBusy(false); }
  };

  const save = async () => {
    if (!form || !restaurant) return;
    if (!form.name.trim()) { showToast("Enter the staff member's name"); return; }
    if (!form.phone.trim()) { showToast("Enter their phone number (their login ID)"); return; }
    setBusy(true);
    try {
      if (form.id) await updateStaff(form.id, { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, dob: form.dob || null, aadhaar: form.aadhaar.trim() || null });
      else await addStaff({ restaurantId: restaurant.id, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), dob: form.dob, aadhaar: form.aadhaar.trim() });
      await load(); setForm(null); showToast(form.id ? "Staff updated" : "Staff added");
    } catch { showToast("Could not save — try again"); }
    finally { setBusy(false); }
  };

  const toggle = async (s: Staff) => {
    setStaff((list) => list.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    await updateStaff(s.id, { active: !s.active });
  };
  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try { await deleteStaff(del.id); await load(); setDel(null); showToast("Staff removed"); }
    catch { showToast("Could not remove — try again"); }
    finally { setBusy(false); }
  };

  if (!ready || !restaurant) return <AppLoading label="Loading staff…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Staff &amp; Admin</h1><p>You&apos;re the admin. Add floor staff — they log in with their phone &amp; today&apos;s code to take orders.</p></div>
          <div className="db-acts"><button className="db-btn prime" onClick={() => setForm(blank())}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Add staff</button></div>
        </div>
        <div className="db-content">
          {/* today's code */}
          <div className="st-code">
            <div className="l">
              <div className="lbl">Today&apos;s staff code</div>
              <div className="hint">Share this with your staff so they can log in today. It resets each day — generate a fresh one every morning.</div>
            </div>
            <div className="r">
              <div className={`st-codeval${codeToday && code ? "" : " off"}`}>{codeToday && code ? code : "— — — — — —"}</div>
              <button className="db-btn prime" onClick={genCode} disabled={genBusy}>{genBusy ? "…" : codeToday && code ? "New code" : "Generate today's code"}</button>
            </div>
          </div>

          <div className="st-adminrow">
            <span className="tag">Admin</span>
            <div><b>{restaurant.owner_name || "Owner"}</b><span>{restaurant.owner_email}</span></div>
            <span className="st-badge">Full access</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
          ) : staff.length === 0 ? (
            <div className="st-empty"><h3>No staff yet</h3><p>Add your waiters/cashiers so they can take orders on the POS. Toggle a person off any time to block their access.</p><button className="db-btn prime" onClick={() => setForm(blank())}>+ Add your first staff</button></div>
          ) : (
            <div className="st-list">
              <div className="st-hd"><span>Name</span><span>Phone (login)</span><span>Details</span><span>Access</span><span></span></div>
              {staff.map((s) => (
                <div key={s.id} className={`st-row${s.active ? "" : " off"}`}>
                  <div className="st-name"><span className="av">{s.name.trim().slice(0, 1).toUpperCase()}</span><b>{s.name}</b></div>
                  <div className="st-ph">{s.phone}</div>
                  <div className="st-det">{[s.email, s.dob ? `DOB ${s.dob}` : "", s.aadhaar ? `Aadhaar ••${s.aadhaar.slice(-4)}` : ""].filter(Boolean).join(" · ") || "—"}</div>
                  <div className="st-acc"><span className="sl">{s.active ? "Active" : "Blocked"}</span><button className={`db-switch${s.active ? " on" : ""}`} onClick={() => toggle(s)} /></div>
                  <div className="st-ib">
                    <button onClick={() => setForm({ id: s.id, name: s.name, phone: s.phone, email: s.email ?? "", dob: s.dob ?? "", aadhaar: s.aadhaar ?? "" })} title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                    <button className="del" onClick={() => setDel(s)} title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 30 }} />
        </div>
      </main>

      {/* add/edit staff modal */}
      <div className={`st-backdrop${form ? " show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setForm(null); }}>
        {form && (
          <div className="st-modal">
            <div className="st-mh"><h3>{form.id ? "Edit staff" : "Add staff"}</h3><button className="st-x" onClick={() => setForm(null)}>×</button></div>
            <div className="st-mb">
              <div className="db-frow two">
                <div className="db-field"><label>Full name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ramesh Kumar" /></div>
                <div className="db-field"><label>Phone <span className="opt">· login ID</span></label><input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" /></div>
              </div>
              <div className="db-field"><label>Email <span className="opt">· optional</span></label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" /></div>
              <div className="db-frow two">
                <div className="db-field"><label>Date of birth <span className="opt">· optional</span></label><input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                <div className="db-field"><label>Aadhaar number <span className="opt">· optional</span></label><input inputMode="numeric" value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} placeholder="XXXX XXXX XXXX" /></div>
              </div>
            </div>
            <div className="st-mf"><button className="st-ghost" onClick={() => setForm(null)}>Cancel</button><button className="st-save" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save staff"}</button></div>
          </div>
        )}
      </div>

      <Dialog open={!!del} title="Remove staff?" message={del ? `${del.name} will no longer be able to log in. This can't be undone.` : ""} confirmLabel="Remove" danger busy={busy} onConfirm={confirmDelete} onCancel={() => setDel(null)} />

      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
