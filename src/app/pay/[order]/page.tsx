"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPayInfo, type PayInfo } from "@/lib/db";
import { PayCard } from "./PayCard";
import "./pay.css";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ok"; info: PayInfo };

/** Guest pay page — opened from the "Pay via UPI" link in the WhatsApp bill. */
export default function PayPage() {
  const { order } = useParams<{ order: string }>();
  const [s, setS] = useState<State>({ kind: "loading" });

  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    let live = true;
    getPayInfo(order)
      .then((info) => { if (live) setS(info ? { kind: "ok", info } : { kind: "missing" }); })
      // a failed re-check keeps the bill on screen; only a failed first load shows the error
      .catch(() => { if (live) setS((p) => (p.kind === "ok" ? p : { kind: "error" })); });
    return () => { live = false; };
  }, [order, tick]);

  // Back from the UPI app → re-check, so "Paid ✓" shows once the restaurant confirms it.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (s.kind === "loading") return <main className="py-wrap"><div className="py-card py-center"><div className="py-spin" /></div></main>;
  if (s.kind !== "ok") {
    return (
      <main className="py-wrap">
        <div className="py-card py-center">
          <div className="py-x">!</div>
          <h1 className="py-h">{s.kind === "missing" ? "Bill not found" : "Couldn’t load this bill"}</h1>
          <p className="py-p">{s.kind === "missing" ? "This link may be incomplete. Please ask the restaurant to send the bill again." : "Check your connection and try again — or pay at the counter."}</p>
          {s.kind === "error" && <button className="py-retry" onClick={load}>Try again</button>}
        </div>
      </main>
    );
  }

  return <PayCard info={s.info} />;
}
