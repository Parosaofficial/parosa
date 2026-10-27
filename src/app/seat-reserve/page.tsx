"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { TableArt } from "@/components/TableArt";
import { ENTRY_LABEL, SkyHall, SkySlot } from "@/components/SkyFloor";
import { setTablesCount } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { TABLE_KINDS, addTable, listTables, nextCode, tableLabel, updateTable, type RestaurantTable } from "@/lib/tables";
import {
  DEFAULT_HALL, bookUrl, dayLabel, groupHalls, listReservations, saveReserveSettings, seatReservation, setReservationStatus, timeLabel,
  type Entry, type Hall, type Reservation,
} from "@/lib/reserve";
import { useOwner } from "@/lib/useOwner";
import "../dash.css";
import "./reserve.css";

/*
 * Seat Reserve (migration 0016): the owner builds a sky-grid floor of halls.
 * Each hall has an Entry side and its tables sit in equal slots; the + tile
 * makes a new table right there. Customers book from one permanent link and
 * see the same floor. Bookings land in the list on the second tab.
 */

const STATUS: Record<Reservation["status"], string> = { booked: "Booked", seated: "Seated", cancelled: "Cancelled", noshow: "No-show" };
const ENTRIES: Entry[] = ["top", "bottom", "left", "right"];
const HOLDS = [90, 120, 150];
const DAYS = [3, 7, 14];

/** T7 / F3: the next free number for that letter. */
function nextName(tables: RestaurantTable[], letter: string) {
  const used = new Set(tables.map((t) => t.name.trim().toUpperCase()));
  let n = 1;
  while (used.has(`${letter}${n}`)) n++;
  return `${letter}${n}`;
}

export default function SeatReservePage() {
  const { restaurant, ready, reload } = useOwner();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [halls, setHalls] = useState<Hall[] | null>(null); // null = use the restaurant's saved halls
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<"floor" | "bookings">("floor");
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);      // hall whose + menu is open
  const [hallForm, setHallForm] = useState<{ mode: "new" | "rename"; old?: string; name: string } | null>(null);
  const [price, setPrice] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [range, setRange] = useState<"today" | "tomorrow" | "week">("today");
  const [busy, setBusy] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    if (!restaurant) return;
    listTables(restaurant.id)
      .then((t) => { setTables(t); setMissing(t.length > 0 && t[0].on_floor === undefined); })
      .catch(() => setMissing(true))
      .finally(() => setLoaded(true));
  }, [restaurant]);

  const loadBookings = useCallback(() => {
    if (!restaurant) return;
    const from = new Date(); from.setHours(0, 0, 0, 0);
    if (range === "tomorrow") from.setDate(from.getDate() + 1);
    const to = new Date(from); to.setDate(to.getDate() + (range === "week" ? 7 : 1));
    listReservations(restaurant.id, from, to).then(setBookings).catch(() => {});
  }, [restaurant, range]);

  useEffect(() => {
    if (!restaurant) return;
    loadBookings();
    const ch = supabase
      .channel(`resv-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `restaurant_id=eq.${restaurant.id}` }, loadBookings)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurant, loadBookings]);

  const savedHalls = halls ?? restaurant?.floor_halls ?? null;
  const floor = useMemo(
    () => groupHalls(savedHalls, tables.filter((t) => t.active && t.on_floor), (t) => t.floor_slot ?? 0),
    [savedHalls, tables],
  );
  const offFloor = useMemo(() => tables.filter((t) => t.active && !t.on_floor), [tables]);
  const selected = tables.find((t) => t.id === sel) ?? null;
  const upcoming = bookings.filter((b) => b.status === "booked").length;

  if (!ready || !restaurant || !loaded) return <AppLoading label="Loading Seat Reserve…" />;

  const link = bookUrl(window.location.origin, restaurant.slug); // rendered only on the client, after sign-in
  const on = !!restaurant.reserve_on;
  const onFloorCount = floor.reduce((a, g) => a + g.tables.length, 0);

  /* ---------- saving ---------- */
  const patch = async (t: RestaurantTable, p: Partial<RestaurantTable>, msg?: string) => {
    setTables((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...p } : x)));
    try { await updateTable(t.id, p); if (msg) showToast(msg); }
    catch { setTables((ts) => ts.map((x) => (x.id === t.id ? t : x))); showToast("Couldn't save — try again"); }
  };

  const saveHalls = async (next: Hall[], msg: string) => {
    setHalls(next);
    try { await saveReserveSettings(restaurant.id, { floor_halls: next }); showToast(msg); }
    catch { showToast("Couldn't save the halls — try again"); }
  };
  const hallList = () => floor.map((g) => g.hall);

  const setting = async (p: Parameters<typeof saveReserveSettings>[1], msg: string) => {
    try { await saveReserveSettings(restaurant.id, p); await reload(); showToast(msg); }
    catch { showToast("Couldn't save — try again"); }
  };

  /** Put the hall's tables in this order, slots 1…n (equal spacing comes from the grid). */
  const reorder = (ordered: RestaurantTable[], area: string) => {
    ordered.forEach((t, i) => {
      if (t.floor_slot !== i + 1 || (t.area ?? "") !== area) patch(t, { floor_slot: i + 1, area });
    });
  };

  /* ---------- tables ---------- */
  const select = (t: RestaurantTable | null) => { setSel(t?.id ?? null); setPrice(t ? String(t.book_price ?? 0) : ""); setAdding(null); };

  const createTable = async (hall: string, k: (typeof TABLE_KINDS)[number]) => {
    const inHall = floor.find((g) => g.hall.name === hall)?.tables ?? [];
    const name = nextName(tables, k.shape === "sofa" ? "F" : "T");
    setBusy("add");
    try {
      const row = await addTable(restaurant.id, {
        code: nextCode(tables, restaurant.table_code_hi ?? 0), name, kind: k.kind, seats: k.seats, shape: k.shape,
        area: hall, sort: tables.length + 1, on_floor: true, floor_slot: inHall.length + 1,
      });
      const next = [...tables, row];
      setTables(next);
      setTablesCount(restaurant.id, next.length).catch(() => {});
      setAdding(null);
      select(row);
      showToast(`${name} added to ${hall} — its QR is ready in Tables & QR`);
    } catch { showToast("Couldn't add the table — try again"); }
    finally { setBusy(""); }
  };

  const placeExisting = (t: RestaurantTable, hall: string) => {
    const inHall = floor.find((g) => g.hall.name === hall)?.tables ?? [];
    patch(t, { on_floor: true, area: hall, floor_slot: inHall.length + 1 }, `${tableLabel(t)} placed in ${hall}`);
    setAdding(null);
  };

  /** Move a table to `hall` at position `index` (drag-drop, arrows, or the hall picker). */
  const moveTo = (t: RestaurantTable, hall: string, index: number) => {
    const from = floor.find((g) => g.tables.some((x) => x.id === t.id));
    const target = (floor.find((g) => g.hall.name === hall)?.tables ?? []).filter((x) => x.id !== t.id);
    target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...t, area: hall });
    reorder(target, hall);
    if (from && from.hall.name !== hall) reorder(from.tables.filter((x) => x.id !== t.id), from.hall.name);
  };
  const nudge = (t: RestaurantTable, dir: -1 | 1) => {
    const g = floor.find((x) => x.tables.some((y) => y.id === t.id));
    if (!g) return;
    const i = g.tables.findIndex((y) => y.id === t.id);
    if (i + dir < 0 || i + dir >= g.tables.length) return;
    moveTo(t, g.hall.name, i + dir);
  };
  const drop = (hall: string, index: number) => {
    const t = tables.find((x) => x.id === dragId);
    setDragId(null);
    if (t) moveTo(t, hall, index);
  };

  const savePrice = () => {
    if (!selected) return;
    const n = Math.max(0, Math.min(100000, Math.round(Number(price) || 0)));
    setPrice(String(n));
    if (n !== (selected.book_price ?? 0)) patch(selected, { book_price: n }, n ? `${tableLabel(selected)} booking price ₹${n}` : `${tableLabel(selected)} is free to book`);
  };

  /* ---------- halls ---------- */
  const submitHall = () => {
    if (!hallForm) return;
    const name = hallForm.name.trim().replace(/\s+/g, " ").slice(0, 30);
    if (!name) { showToast("Give the hall a name"); return; }
    const list = hallList();
    if (list.some((h) => h.name.toLowerCase() === name.toLowerCase() && h.name !== hallForm.old)) { showToast(`There's already a hall called ${name}`); return; }
    if (hallForm.mode === "new") {
      saveHalls([...list, { name, entry: "bottom" }], `${name} added — tap + inside it to add tables`);
    } else if (hallForm.old && hallForm.old !== name) {
      saveHalls(list.map((h) => (h.name === hallForm.old ? { ...h, name } : h)), `Renamed to ${name}`);
      floor.find((g) => g.hall.name === hallForm.old)?.tables.forEach((t) => patch(t, { area: name }));
    }
    setHallForm(null);
  };
  const setEntry = (name: string, entry: Entry) => saveHalls(hallList().map((h) => (h.name === name ? { ...h, entry } : h)), `${name}: entry on the ${entry}`);
  const moveHall = (i: number, dir: -1 | 1) => {
    const list = hallList();
    if (i + dir < 0 || i + dir >= list.length) return;
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    saveHalls(list, "Halls reordered");
  };
  const deleteHall = (name: string) => {
    if (!window.confirm(`Delete the hall “${name}”?`)) return;
    saveHalls(hallList().filter((h) => h.name !== name), `${name} deleted`);
  };

  /* ---------- link + bookings ---------- */
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); showToast("Booking link copied"); }
    catch { showToast(link); }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`Book your table at ${restaurant.name}: ${link}`)}`;

  const bookingAct = async (b: Reservation, what: "seat" | "cancel") => {
    if (what === "cancel" && !window.confirm(`Cancel ${b.guest_name}'s booking for ${timeLabel(b.starts_at)}?`)) return;
    setBusy(b.id);
    try {
      if (what === "seat") { await seatReservation(b.id); showToast(`${b.guest_name} seated — booking charge added to the table bill`); }
      else { await setReservationStatus(b.id, "cancelled"); showToast("Booking cancelled"); }
      loadBookings();
    } catch { showToast("Couldn't update the booking — try again"); }
    finally { setBusy(""); }
  };
  const tableName = (id: string) => { const t = tables.find((x) => x.id === id); return t ? `${t.name} · ${t.kind}` : "—"; };

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Seat Reserve</h1><p>Build your floor, set a price per table, and let guests book from one link.</p></div>
          <div className="db-acts">
            <button className={`sr-onoff${on ? " on" : ""}`} disabled={missing} onClick={() => setting({ reserve_on: !on }, on ? "Bookings paused — the link shows “not taking bookings”" : "Bookings are open")}>
              <span className="k" aria-hidden="true" />{on ? "Bookings on" : "Bookings off"}
            </button>
          </div>
        </div>

        <div className="db-content">
          {missing && (
            <div className="sr-missing"><b>One-time database update needed</b><span>Seat Reserve needs migration 0016. Your tables and QR codes keep working meanwhile.</span></div>
          )}

          {/* ---- the permanent booking link ---- */}
          <div className="sr-link">
            <div className="sr-lt">
              <span className="sr-lk">Your booking link <i>🔒 Permanent</i></span>
              <code>{link.replace(/^https?:\/\//, "")}</code>
            </div>
            <div className="sr-la">
              <button className="db-btn" onClick={copy}>Copy</button>
              <a className="db-btn" href={wa} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
              <a className="db-btn" href={link} target="_blank" rel="noopener noreferrer">Open</a>
            </div>
          </div>

          <div className="sr-tabs">
            <button className={tab === "floor" ? "on" : ""} onClick={() => setTab("floor")}>Floor plan</button>
            <button className={tab === "bookings" ? "on" : ""} onClick={() => setTab("bookings")}>Bookings{upcoming ? ` · ${upcoming}` : ""}</button>
          </div>

          {tab === "floor" ? (
            <div className="sr-editor">
              <div className="db-panel sr-floorp">
                <div className="db-ph">
                  <h3>Floor plan · {onFloorCount} tables · {floor.length} {floor.length === 1 ? "hall" : "halls"}</h3>
                  <button className="db-btn prime" onClick={() => setHallForm({ mode: "new", name: "" })}>＋ Add hall</button>
                </div>
                <div className="sr-halls">
                  {hallForm && (
                    <form className="sr-hallform" onSubmit={(e) => { e.preventDefault(); submitHall(); }}>
                      <label>{hallForm.mode === "new" ? "New hall name" : `Rename ${hallForm.old}`}
                        <input autoFocus value={hallForm.name} maxLength={30} placeholder="Rooftop, AC hall, Garden…" onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })} />
                      </label>
                      <button className="db-btn prime" type="submit">{hallForm.mode === "new" ? "Add hall" : "Save"}</button>
                      <button className="db-btn" type="button" onClick={() => setHallForm(null)}>Cancel</button>
                    </form>
                  )}

                  {floor.map((g, hi) => (
                    <SkyHall
                      key={g.hall.name}
                      name={g.hall.name}
                      entry={g.hall.entry}
                      head={
                        <span className="sr-hctl">
                          <span className="sr-hn">{g.tables.length} {g.tables.length === 1 ? "table" : "tables"}</span>
                          <label className="sr-entry">🚪 Entry
                            <select value={g.hall.entry} onChange={(e) => setEntry(g.hall.name, e.target.value as Entry)} aria-label={`${g.hall.name} entry side`}>
                              {ENTRIES.map((x) => <option key={x} value={x}>{ENTRY_LABEL[x]}</option>)}
                            </select>
                          </label>
                          <button onClick={() => setHallForm({ mode: "rename", old: g.hall.name, name: g.hall.name })} aria-label={`Rename ${g.hall.name}`}>✎</button>
                          <button onClick={() => moveHall(hi, -1)} disabled={hi === 0} aria-label={`Move ${g.hall.name} up`}>↑</button>
                          <button onClick={() => moveHall(hi, 1)} disabled={hi === floor.length - 1} aria-label={`Move ${g.hall.name} down`}>↓</button>
                          {g.tables.length === 0 && floor.length > 1 && <button onClick={() => deleteHall(g.hall.name)} aria-label={`Delete ${g.hall.name}`}>🗑</button>}
                        </span>
                      }
                    >
                      {g.tables.map((t, i) => (
                        <SkySlot
                          key={t.id}
                          wide={t.shape === "sofa"}
                          className={`${sel === t.id ? "sel" : ""}${t.bookable === false ? " walkin" : ""}${dragId === t.id ? " dragging" : ""}`}
                          draggable
                          onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; }}
                          onDragEnd={() => setDragId(null)}
                          onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                          onDrop={(e) => { e.preventDefault(); drop(g.hall.name, i); }}
                          onClick={() => select(sel === t.id ? null : t)}
                          aria-pressed={sel === t.id}
                          aria-label={`${tableLabel(t)}, ${t.kind}, booking ₹${t.book_price ?? 0}`}
                        >
                          <TableArt shape={t.shape} name={t.name} />
                          <span className="sky-pr">{t.bookable === false ? "Walk-in" : t.book_price ? `₹${t.book_price}` : "Free"}</span>
                        </SkySlot>
                      ))}
                      <button
                        type="button"
                        className={`sr-plus${adding === g.hall.name ? " on" : ""}`}
                        onClick={() => { setSel(null); setAdding(adding === g.hall.name ? null : g.hall.name); }}
                        onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                        onDrop={(e) => { e.preventDefault(); drop(g.hall.name, g.tables.length); }}
                        aria-expanded={adding === g.hall.name}
                      >
                        <span aria-hidden="true">+</span>Add table
                      </button>
                      {adding === g.hall.name && (
                        <div className="sr-addmenu">
                          <b>New table in {g.hall.name}</b>
                          <div className="sr-kinds">
                            {TABLE_KINDS.map((k) => (
                              <button key={k.kind} disabled={busy === "add"} onClick={() => createTable(g.hall.name, k)}>
                                <span className="sr-ka"><TableArt shape={k.shape} name="" /></span>
                                <span>{k.kind}<small>{k.seats} seats · named {nextName(tables, k.shape === "sofa" ? "F" : "T")}</small></span>
                              </button>
                            ))}
                          </div>
                          {offFloor.length > 0 && (
                            <>
                              <b className="sr-or">Or place a table you already made</b>
                              <div className="sr-exist">
                                {offFloor.map((t) => <button key={t.id} onClick={() => placeExisting(t, g.hall.name)}>{t.name} <small>{t.kind}</small></button>)}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </SkyHall>
                  ))}
                  <button className="sr-addhall" onClick={() => setHallForm({ mode: "new", name: "" })}>＋ Add a hall — Rooftop, AC hall, Garden…</button>
                </div>
              </div>

              <div className="sr-side">
                {selected ? (
                  <div className="db-panel sr-box sr-selbox">
                    <div className="sr-bh"><b>{tableLabel(selected)}</b><span>{selected.kind} · {selected.seats} seats</span></div>
                    <label className="sr-price">Booking price
                      <span className="sr-rs"><i>₹</i><input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} onBlur={savePrice} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /></span>
                    </label>
                    <p className="sr-muted">₹0 = free to book. The charge is added to the table bill when you seat the guests.</p>
                    <div className="sr-chips">
                      <button className={selected.bookable !== false ? "on" : ""} onClick={() => patch(selected, { bookable: true }, `${tableLabel(selected)} can be booked`)}>Bookable</button>
                      <button className={selected.bookable === false ? "on" : ""} onClick={() => patch(selected, { bookable: false }, `${tableLabel(selected)} is walk-in only`)}>Walk-in only</button>
                    </div>
                    <div className="sr-rule"><span>Position</span>
                      <div className="sr-chips">
                        <button onClick={() => nudge(selected, -1)}>← Move left</button>
                        <button onClick={() => nudge(selected, 1)}>Move right →</button>
                      </div>
                    </div>
                    {floor.length > 1 && (
                      <label className="sr-rule">Hall
                        <select className="sr-sel" value={(floor.find((g) => g.tables.some((x) => x.id === selected.id))?.hall.name) ?? DEFAULT_HALL}
                          onChange={(e) => { moveTo(selected, e.target.value, 999); showToast(`${tableLabel(selected)} moved to ${e.target.value}`); }}>
                          {floor.map((g) => <option key={g.hall.name} value={g.hall.name}>{g.hall.name}</option>)}
                        </select>
                      </label>
                    )}
                    <button className="sr-remove" onClick={() => { patch(selected, { on_floor: false }, `${tableLabel(selected)} removed from the floor`); select(null); }}>Remove from floor</button>
                  </div>
                ) : (
                  <div className="db-panel sr-box">
                    <div className="sr-bh"><b>How it works</b></div>
                    <ol className="sr-how">
                      <li>Tap <b>+</b> in a hall to make a table: 2-seater, 4-seater or Family sofa.</li>
                      <li>Pick each hall&apos;s <b>🚪 Entry</b> side, so guests know where the door is.</li>
                      <li>Drag a table onto another to swap places, or tap it and use ← →.</li>
                      <li>Tap a table to set its booking price, then share the link.</li>
                    </ol>
                  </div>
                )}

                <div className="db-panel sr-box">
                  <div className="sr-bh"><b>Booking rules</b></div>
                  <div className="sr-rule"><span>Hold each booking for</span>
                    <div className="sr-chips">{HOLDS.map((m) => <button key={m} className={(restaurant.reserve_hold_min ?? 120) === m ? "on" : ""} onClick={() => setting({ reserve_hold_min: m }, `Bookings held ${m / 60} hours`)}>{m / 60} h</button>)}</div>
                  </div>
                  <div className="sr-rule"><span>Guests can book up to</span>
                    <div className="sr-chips">{DAYS.map((d) => <button key={d} className={(restaurant.reserve_days ?? 7) === d ? "on" : ""} onClick={() => setting({ reserve_days: d }, `Bookings up to ${d} days ahead`)}>{d} days</button>)}</div>
                  </div>
                  <div className="sr-rule"><span>Booking times</span>
                    <div className="sr-times">
                      <input type="time" step={1800} defaultValue={restaurant.reserve_from ?? "12:00"} onBlur={(e) => e.target.value && e.target.value !== restaurant.reserve_from && setting({ reserve_from: e.target.value }, "Booking times saved")} aria-label="First booking time" />
                      <span>to</span>
                      <input type="time" step={1800} defaultValue={restaurant.reserve_to ?? "22:30"} onBlur={(e) => e.target.value && e.target.value !== restaurant.reserve_to && setting({ reserve_to: e.target.value }, "Booking times saved")} aria-label="Last booking time" />
                    </div>
                  </div>
                  <p className="sr-muted">No-shows free their table 20 minutes after the booking time.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="db-panel">
              <div className="db-ph">
                <h3>Bookings</h3>
                <div className="sr-chips">
                  {(["today", "tomorrow", "week"] as const).map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r === "today" ? "Today" : r === "tomorrow" ? "Tomorrow" : "Next 7 days"}</button>)}
                </div>
              </div>
              {bookings.length === 0 ? (
                <p className="sr-none">No bookings {range === "today" ? "today" : range === "tomorrow" ? "tomorrow" : "this week"} yet. Share your link to get some.</p>
              ) : (
                <div className="sr-list">
                  {bookings.map((b) => (
                    <div key={b.id} className={`sr-row ${b.status}`}>
                      <span className="sr-when"><b>{timeLabel(b.starts_at)}</b>{range !== "today" && <small>{dayLabel(b.starts_at)}</small>}</span>
                      <span className="sr-tb">{tableName(b.table_id)}</span>
                      <span className="sr-g"><b>{b.guest_name}</b><a href={`tel:${b.phone}`}>{b.phone}</a>{b.note && <em>✎ {b.note}</em>}</span>
                      <span className="sr-ppl">{b.people} {b.people === 1 ? "guest" : "guests"}</span>
                      <span className="sr-amt">{b.price ? `₹${b.price}` : "Free"}</span>
                      <span className={`sr-st ${b.status}`}>{STATUS[b.status]}</span>
                      <span className="sr-ra">
                        {b.status === "booked" && <>
                          <button className="db-btn prime" disabled={busy === b.id} onClick={() => bookingAct(b, "seat")}>Seat now</button>
                          <button className="db-btn" disabled={busy === b.id} onClick={() => bookingAct(b, "cancel")}>Cancel</button>
                        </>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
