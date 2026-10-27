"use client";

import { useEffect, useMemo, useState } from "react";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { SkyHall, SkySlot } from "@/components/SkyFloor";
import { TableArt } from "@/components/TableArt";
import { cleanPhone } from "@/lib/loyalty";
import { createReservation, dayLabel, floorAt, groupHalls, slotsFor, timeLabel, type BookingDone, type FloorInfo, type FloorTable } from "@/lib/reserve";
import type { Restaurant } from "@/lib/types";
import "./book.css";

/*
 * Customer booking page (Seat Reserve, 0016). Pick a day and time, see the
 * owner's sky-grid floor — halls with their entry, tables free, occupied
 * right now or already booked — tap a free table, add
 * your details and book. No payment here: the booking price is added to the
 * table bill at the restaurant.
 */

const REFRESH_MS = 30000;
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function dayStart(offset: number) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d; }

export function BookClient({ restaurant }: { restaurant: Restaurant }) {
  const [info, setInfo] = useState<FloorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(0);
  const [chosen, setChosen] = useState<Date | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [step, setStep] = useState<"floor" | "details" | "done">("floor");
  const [people, setPeople] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<BookingDone | null>(null);
  const [now, setNow] = useState(0); // when the floor was last loaded

  const days = info ? Math.max(1, Math.min(info.days, 14)) : 7;
  const slots = useMemo(() => (info ? slotsFor(dayStart(day), info.from, info.to) : []), [info, day]);

  // the guest's time, or the day's first slot until they pick one
  const at = chosen && slots.some((s) => s.getTime() === chosen.getTime()) ? chosen : slots[0] ?? null;
  const atMs = at?.getTime() ?? 0;

  // the floor for that time; refreshes so "occupied" stays live
  useEffect(() => {
    let alive = true;
    const load = () => floorAt(restaurant.id, atMs ? new Date(atMs) : null).then((f) => { if (alive) { setInfo(f); setNow(Date.now()); setLoading(false); } });
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [restaurant.id, atMs]);

  const tables = info?.tables ?? [];
  // a table someone booked since it was picked drops out of the pick
  const picked = tables.find((t) => t.id === pick && t.bookable && !t.booked) ?? null;

  const stateOf = (t: FloorTable) => (!t.bookable ? "walkin" : t.booked ? "booked" : t.occupied && at && at.getTime() - now < (info?.hold_min ?? 120) * 60000 ? "occ" : pick === t.id ? "mine" : "free");

  const book = async () => {
    if (!picked || !at || busy) return;
    const p = cleanPhone(phone);
    if (name.trim().length < 2) { setErr("Please enter your name."); return; }
    if (!p || p.replace(/\D/g, "").length < 10) { setErr("Please enter a 10-digit mobile number."); return; }
    setBusy(true); setErr("");
    try {
      const d = await createReservation({ restaurantId: restaurant.id, tableId: picked.id, at, people, name: name.trim(), phone: p, note });
      setDone(d); setStep("done");
    } catch (e) {
      setErr((e as Error).message || "Couldn't book. Please try again.");
      floorAt(restaurant.id, at).then((f) => { if (f) setInfo(f); });
    } finally { setBusy(false); }
  };

  const header = (
    <header className="bk-top">
      <span className="bk-logo"><RestaurantLogo restaurant={restaurant} size={40} /></span>
      <div className="bk-id"><b>{restaurant.name}</b><span>Book a table</span></div>
    </header>
  );

  if (loading) return <div className="bk">{header}<div className="bk-body"><p className="bk-sub">Loading the floor…</p></div></div>;

  if (!info || !info.reserve_on || tables.length === 0) {
    return (
      <div className="bk">{header}
        <div className="bk-body bk-center">
          <span className="bk-ic" aria-hidden="true">🍽</span>
          <h1>Not taking bookings right now</h1>
          <p className="bk-sub">{restaurant.name} isn&apos;t accepting online bookings at the moment. Please call or walk in.</p>
          {restaurant.phone && <a className="bk-btn" href={`tel:${restaurant.phone}`}>Call {restaurant.name}</a>}
        </div>
      </div>
    );
  }

  /* ---------- booked! ---------- */
  if (step === "done" && done) {
    const when = new Date(done.starts_at);
    const maps = restaurant.latitude != null && restaurant.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`
      : restaurant.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}` : null;
    const end = new Date(when.getTime() + (info.hold_min || 120) * 60000);
    const g = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const cal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Table at ${restaurant.name}`)}&dates=${g(when)}/${g(end)}&details=${encodeURIComponent(`Booking #${done.code} · ${done.table_name} · ${done.people} guests`)}`;
    return (
      <div className="bk">{header}
        <div className="bk-body bk-center">
          <span className="bk-tick" aria-hidden="true">✓</span>
          <h1>{done.table_name} is yours at {timeLabel(when)}</h1>
          <p className="bk-sub">{dayLabel(when)} · {done.people} {done.people === 1 ? "guest" : "guests"} · Booking #{done.code}</p>
          <div className="bk-card">
            <span>Show this when you arrive. Your table is held for {Math.round((info.hold_min || 120) / 60 * 10) / 10} hours.</span>
            {done.price > 0 && <b>{rupees(done.price)} booking charge — added to your bill at the restaurant</b>}
          </div>
          <a className="bk-btn ghost" href={cal} target="_blank" rel="noopener noreferrer">Add to calendar</a>
          {maps && <a className="bk-btn ghost" href={maps} target="_blank" rel="noopener noreferrer">Get directions</a>}
          <p className="bk-fine">Running late? Tables free up 20 minutes after the booking time{restaurant.phone ? <> — call <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a></> : null}.</p>
        </div>
      </div>
    );
  }

  /* ---------- your details ---------- */
  if (step === "details" && picked && at) {
    return (
      <div className="bk">{header}
        <div className="bk-body">
          <button className="bk-back" onClick={() => { setStep("floor"); setErr(""); }}>← Change table or time</button>
          <div className="bk-sum">
            <span className="bk-sa"><TableArt shape={picked.shape} name={picked.name} /></span>
            <span><b>{picked.name} · {picked.kind}</b><small>{dayLabel(at)} · {timeLabel(at)} · up to {picked.seats} seats</small></span>
          </div>
          <div className="bk-ppl">
            <b>Guests</b>
            <button onClick={() => setPeople((n) => Math.max(1, n - 1))} aria-label="Fewer guests">−</button>
            <span>{people}</span>
            <button onClick={() => setPeople((n) => Math.min(Math.max(picked.seats, 2) + 2, n + 1))} aria-label="More guests">+</button>
          </div>
          <label className="bk-f">Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} /></label>
          <label className="bk-f">Mobile number<input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={14} /></label>
          <label className="bk-f">Note <i>(optional)</i><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Birthday, high chair…" maxLength={200} /></label>
          <div className="bk-amt"><span>Booking charge</span><b>{picked.price ? rupees(picked.price) : "Free"}</b></div>
          {picked.price > 0 && <p className="bk-fine">Nothing to pay now — it&apos;s added to your bill at the restaurant.</p>}
          {err && <p className="bk-err" role="alert">{err}</p>}
          <button className="bk-btn" onClick={book} disabled={busy}>{busy ? "Booking…" : `Book ${picked.name}${picked.price ? ` · ${rupees(picked.price)}` : ""}`}</button>
        </div>
      </div>
    );
  }

  /* ---------- pick a time and a table ---------- */
  const free = tables.filter((t) => stateOf(t) === "free" || stateOf(t) === "mine").length;
  return (
    <div className="bk">{header}
      <div className="bk-body">
        <div className="bk-chips" role="tablist" aria-label="Day">
          {Array.from({ length: days }, (_, i) => (
            <button key={i} className={day === i ? "on" : ""} onClick={() => { setDay(i); setPick(null); setChosen(null); }}>{dayLabel(dayStart(i))}</button>
          ))}
        </div>
        {slots.length === 0 ? (
          <p className="bk-sub">No more booking times {day === 0 ? "today" : "this day"}. Try another day.</p>
        ) : (
          <div className="bk-chips times" aria-label="Time">
            {slots.map((s) => (
              <button key={s.getTime()} className={at?.getTime() === s.getTime() ? "on" : ""} onClick={() => { setChosen(s); setPick(null); }}>{timeLabel(s)}</button>
            ))}
          </div>
        )}

        <div className="bk-floorhd"><b>Tap a free table</b><span>{free} free{at ? ` at ${timeLabel(at)}` : ""}</span></div>
        <div className="bk-halls">
          {groupHalls(info.halls, tables, (t) => t.slot).filter((g) => g.tables.length > 0).map((g) => (
            <SkyHall key={g.hall.name} name={g.hall.name} entry={g.hall.entry} compact>
              {g.tables.map((t) => {
                const st = stateOf(t);
                const can = st === "free" || st === "mine";
                return (
                  <SkySlot
                    key={t.id}
                    wide={t.shape === "sofa"}
                    className={`bk-t ${st}`}
                    disabled={!can || !at}
                    onClick={() => setPick(t.id)}
                    aria-pressed={st === "mine"}
                    aria-label={`${t.name}, ${t.kind}, ${t.seats} seats, ${st === "occ" ? "occupied now" : st === "booked" ? "booked" : st === "walkin" ? "walk-in only" : t.price ? `booking ${rupees(t.price)}` : "free to book"}`}
                  >
                    <TableArt shape={t.shape} name={t.name} seated={st === "occ"} />
                    <span className="sky-pr">{st === "occ" ? "Occupied" : st === "booked" ? "Booked" : st === "walkin" ? "Walk-in" : t.price ? rupees(t.price) : "Free"}</span>
                  </SkySlot>
                );
              })}
            </SkyHall>
          ))}
        </div>
        <div className="bk-legend">
          <span><i className="free" />Free</span><span><i className="occ" />Occupied now</span><span><i className="booked" />Booked</span><span><i className="mine" />Your pick</span>
        </div>

        {picked && at && (
          <div className="bk-bar">
            <span><b>{picked.name} · {picked.kind}</b><small>{dayLabel(at)} {timeLabel(at)} · {picked.seats} seats · {picked.price ? rupees(picked.price) : "Free"}</small></span>
            <button className="bk-btn" onClick={() => setStep("details")}>Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
