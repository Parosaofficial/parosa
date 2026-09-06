"use client";

import { Seal } from "@/components/Logo";

/** Full-screen branded loader shown while the owner's session/restaurant loads. */
export function AppLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--parch)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, animation: "appfade .6s ease" }}>
          <Seal size={64} />
        </div>
        <div
          style={{
            margin: "0 auto",
            height: 26,
            width: 26,
            borderRadius: "50%",
            border: "2px solid rgba(169,130,58,0.28)",
            borderTopColor: "var(--gold)",
            animation: "appspin .8s linear infinite",
          }}
        />
        <p style={{ marginTop: 14, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-caps)" }}>
          {label}
        </p>
      </div>
      <style>{`@keyframes appspin{to{transform:rotate(360deg)}}@keyframes appfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
