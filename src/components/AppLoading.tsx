"use client";

import { Seal } from "@/components/Logo";

/** Full-screen branded loader shown while the owner's session/restaurant loads: white, with a big clear Parosa seal. */
export function AppLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FFFFFF", padding: 16 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, animation: "appfade .6s ease" }}>
          <Seal size={128} />
        </div>
        <div
          style={{
            margin: "0 auto",
            height: 28,
            width: 28,
            borderRadius: "50%",
            border: "3px solid #F1DFE0",
            borderTopColor: "#5C0F14",
            animation: "appspin .8s linear infinite",
          }}
        />
        <p style={{ marginTop: 16, fontSize: 15, fontWeight: 600, color: "#6E5557", fontFamily: "var(--font-body)" }}>
          {label}
        </p>
      </div>
      <style>{`@keyframes appspin{to{transform:rotate(360deg)}}@keyframes appfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){*{animation-duration:2s!important}}`}</style>
    </div>
  );
}
