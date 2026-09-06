"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { addCategory, deleteDish, getMenu, setDishAvailable, upsertDish, uploadPhoto } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import type { Category, Dish } from "@/lib/types";
import "../dash.css";
import "./editor.css";

type Form = { id: string | null; category_id: string; name: string; description: string; price: string; is_veg: boolean; tag: string; available: boolean; photo_url: string };
const blank = (cat: string): Form => ({ id: null, category_id: cat, name: "", description: "", price: "", is_veg: true, tag: "", available: true, photo_url: "" });

function PhIcon() {
  return <svg className="ph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 4h2l1-2h4l1 2h2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" /><circle cx="12" cy="12" r="3.5" /></svg>;
}

export default function MenuEditor() {
  const { restaurant, ready } = useOwner();
  const [cats, setCats] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const load = useCallback(async () => {
    if (!restaurant) return;
    const m = await getMenu(restaurant.slug);
    if (m) { setCats(m.categories); setDishes(m.dishes); setActive((a) => a || m.categories[0]?.id || ""); }
    setLoading(false);
  }, [restaurant]);
  useEffect(() => { load(); }, [load]);

  const catName = cats.find((c) => c.id === active);
  const items = useMemo(() => dishes.filter((d) => d.category_id === active), [dishes, active]);
  const shown = items.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !restaurant || !form) return;
    setUploading(true);
    try { const url = await uploadPhoto(restaurant.id, f); setForm((fm) => (fm ? { ...fm, photo_url: url } : fm)); }
    catch { showToast("Photo upload failed"); }
    finally { setUploading(false); }
  };

  const toggleAv = async (d: Dish) => {
    setDishes((ds) => ds.map((x) => (x.id === d.id ? { ...x, available: !x.available } : x)));
    await setDishAvailable(d.id, !d.available);
  };
  const del = async (d: Dish) => { if (confirm(`Delete “${d.name}”?`)) { await deleteDish(d.id); await load(); showToast("Dish deleted"); } };

  const save = async () => {
    if (!form || !restaurant) return;
    if (!form.name.trim()) { showToast("Please enter a dish name"); return; }
    setBusy(true);
    try {
      await upsertDish({
        ...(form.id ? { id: form.id } : {}),
        restaurant_id: restaurant.id, category_id: form.category_id,
        name: form.name.trim(), description: form.description.trim(),
        price: parseInt(form.price) || 0, is_veg: form.is_veg, tag: form.tag,
        available: form.available, photo_url: form.photo_url || null,
      });
      await load();
      setActive(form.category_id);
      setForm(null);
      showToast(form.id ? "Dish updated" : "Dish added");
    } catch { showToast("Could not save — try again"); }
    finally { setBusy(false); }
  };

  const addCat = async () => {
    const n = prompt("New category name:");
    if (n && restaurant) { const c = await addCategory(restaurant.id, n, cats.length + 1); await load(); setActive(c.id); showToast("Category added"); }
  };

  if (!ready || !restaurant) return <AppLoading label="Loading your menu…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Menu &amp; Dishes</h1><p>Add, edit and organise your dishes — changes go live on the menu instantly.</p></div>
          <div className="db-acts"><button className="db-btn prime" onClick={() => { if (!cats.length) { showToast("Add a category first (e.g. Starters)"); return; } setForm(blank(active || cats[0].id)); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Add dish</button></div>
        </div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><b>Live</b> — every change saves to your database and appears on the scanned menu instantly. Dish photos are optional.</span>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading your menu…</div>
          ) : (
            <div className="ed-wrap">
              <aside className="ed-cats">
                <div className="ed-ch"><h3>Categories</h3><span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{cats.length}</span></div>
                <div className="ed-clist">
                  {cats.map((c) => {
                    const cnt = dishes.filter((d) => d.category_id === c.id).length;
                    return (
                      <div key={c.id} className={`ed-cat${c.id === active ? " on" : ""}`} onClick={() => { setActive(c.id); setSearch(""); }}>
                        <div className="ed-cn"><div className="h">{c.name}</div></div>
                        <span className="ed-cc">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
                <button className="ed-addcat" onClick={addCat}>+ Add category</button>
              </aside>

              <section>
                <div className="ed-dhead">
                  <div className="ed-dt"><h2>{catName?.name ?? "Menu"}</h2><span>{items.length} dishes</span></div>
                  <div className="ed-search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg><input placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>

                {cats.length === 0 ? (
                  <div className="ed-empty"><div className="es">Let&apos;s build your menu</div><div>Start by adding a category like &ldquo;Starters&rdquo; or &ldquo;Main Course&rdquo;, then add dishes to it.</div><button className="ed-addcat" style={{ maxWidth: 240, margin: "16px auto 0" }} onClick={addCat}>+ Add your first category</button></div>
                ) : shown.length === 0 ? (
                  <div className="ed-empty"><div className="es">No dishes yet</div><div>Add your first dish to &ldquo;{catName?.name}&rdquo;.</div></div>
                ) : shown.map((d) => (
                  <div key={d.id} className={`ed-dish${d.available ? "" : " out"}`}>
                    <div className="ed-thumb" style={d.photo_url ? { backgroundImage: `url(${d.photo_url})` } : undefined}>{!d.photo_url && <PhIcon />}</div>
                    <div className="ed-main">
                      <div className="ed-top">
                        <span className={`ed-vd${d.is_veg ? "" : " nv"}`} />
                        <span className="ed-dn">{d.name}</span>
                        {d.tag === "best" && <span className="ed-tag best">Bestseller</span>}
                        {d.tag === "new" && <span className="ed-tag new">New</span>}
                      </div>
                      {d.description && <div className="ed-dd">{d.description}</div>}
                      <div className="ed-dmeta"><span className="ed-dprice">₹{d.price}</span></div>
                    </div>
                    <div className="ed-actions">
                      <div className="ed-switchrow"><span className="ed-sl">{d.available ? "" : "Sold out"}</span><button className={`db-switch${d.available ? " on" : ""}`} onClick={() => toggleAv(d)} /></div>
                      <div className="ed-ibs">
                        <button className="ed-ib" onClick={() => setForm({ id: d.id, category_id: d.category_id, name: d.name, description: d.description ?? "", price: String(d.price), is_veg: d.is_veg, tag: d.tag ?? "", available: d.available, photo_url: d.photo_url ?? "" })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                        <button className="ed-ib del" onClick={() => del(d)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}
          <div style={{ height: 30 }} />
        </div>
      </main>

      {/* modal */}
      <div className={`ed-backdrop${form ? " show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setForm(null); }}>
        {form && (
          <div className="ed-modal">
            <div className="ed-mh"><h3>{form.id ? "Edit dish" : "Add dish"}</h3><button className="ed-x" onClick={() => setForm(null)}>×</button></div>
            <div className="ed-mbody">
              <div className="db-field"><label>Dish name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tandoori Chicken" /></div>
              <div className="db-frow two">
                <div className="db-field"><label>Category</label><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="db-field"><label>Price (₹)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="320" /></div>
              </div>
              <div className="db-field"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Clay-oven charred, 24-hr marinade" /></div>
              <div className="db-frow two">
                <div className="db-field"><label>Veg / Non-veg</label><div className="db-seg">
                  <button className={form.is_veg ? "sel" : ""} onClick={() => setForm({ ...form, is_veg: true })} style={form.is_veg ? { background: "var(--veg)", borderColor: "var(--veg)", color: "#fff" } : {}}>🟢 Veg</button>
                  <button className={!form.is_veg ? "sel" : ""} onClick={() => setForm({ ...form, is_veg: false })} style={!form.is_veg ? { background: "var(--nonveg)", borderColor: "var(--nonveg)", color: "#fff" } : {}}>🔴 Non-veg</button>
                </div></div>
                <div className="db-field"><label>Tag</label><div className="db-seg">
                  {[["", "None"], ["best", "Bestseller"], ["new", "New"]].map(([v, l]) => <button key={v} className={form.tag === v ? "sel" : ""} onClick={() => setForm({ ...form, tag: v })}>{l}</button>)}
                </div></div>
              </div>
              <div className="db-field">
                <label>Dish photo <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label>
                {form.photo_url ? (
                  <div><div className="ed-prev" style={{ backgroundImage: `url(${form.photo_url})` }} /><button className="ed-remove" onClick={() => setForm({ ...form, photo_url: "" })}>Remove photo</button></div>
                ) : (
                  <label className="ed-drop"><input type="file" accept="image/*" hidden onChange={onPhoto} /><b>{uploading ? "Uploading…" : "Click to upload a photo"}</b><span>JPG/PNG · saved to your restaurant</span></label>
                )}
              </div>
            </div>
            <div className="ed-mfoot"><button className="ed-ghost" onClick={() => setForm(null)}>Cancel</button><button className="ed-save" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save dish"}</button></div>
          </div>
        )}
      </div>

      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
