"use client";

import { useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cleanUpi, iosUpiApps, upiLink } from "@/lib/upi";
import "./upipay.css";

type Platform = "android" | "ios" | "desktop";

const detect = (): Platform => {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop";
};
const noSubscribe = () => () => {};

/**
 * Guest-side "pay this bill" block. On a phone the guest can't scan a QR on
 * their own screen, so the main action is a button that opens their UPI app
 * with the amount filled in; the QR is there for paying from a second phone
 * (and is the main action on a laptop).
 */
export function UpiPay({ upi, name, amount, note }: { upi: string; name: string; amount: number; note?: string }) {
  // The user agent never changes, so read it once on the client ("android" while server-rendering).
  const platform = useSyncExternalStore(noSubscribe, detect, (): Platform => "android");
  const [qrToggled, setQrToggled] = useState<boolean | null>(null);
  const showQr = qrToggled ?? platform === "desktop"; // a laptop can't open a UPI app, so lead with the QR
  const [copied, setCopied] = useState(false);

  const input = { upi, name, amount, note };
  const link = upiLink(input);
  const vpa = cleanUpi(upi);

  const copy = async () => {
    try { await navigator.clipboard.writeText(vpa); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  return (
    <div className="up">
      {platform === "ios" ? (
        <>
          <div className="up-lbl">Pay ₹{amount.toLocaleString("en-IN")} with</div>
          <div className="up-apps">
            {iosUpiApps(input).map((a) => <a key={a.name} className="up-app" href={a.href}>{a.name}</a>)}
          </div>
          <a className="up-other" href={link}>Other UPI app</a>
        </>
      ) : platform === "android" ? (
        <a className="up-btn" href={link}>
          <UpiMark /> Pay ₹{amount.toLocaleString("en-IN")} with UPI
        </a>
      ) : null}

      {platform !== "desktop" && (
        <button className="up-toggle" onClick={() => setQrToggled(!showQr)}>
          {showQr ? "Hide QR" : "Paying from another phone? Show QR"}
        </button>
      )}

      {showQr && (
        <div className="up-qr">
          <QRCodeSVG value={link} size={176} level="M" marginSize={1} fgColor="#2A1414" bgColor="#FFFFFF" />
          <div className="up-qrcap">Scan with any UPI app · ₹{amount.toLocaleString("en-IN")} is filled in</div>
        </div>
      )}

      <div className="up-vpa">
        <span>UPI ID <b>{vpa}</b></span>
        <button onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <p className="up-note">Paid straight to {name}&apos;s bank — Parosa never holds your money.</p>
    </div>
  );
}

function UpiMark() {
  return (
    <svg className="up-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.2 3 18 12l-4.8 9h-3.1L15 12 10.1 3z" fill="currentColor" opacity=".55" />
      <path d="M8.3 3 13 12l-4.7 9H5.2L10 12 5.2 3z" fill="currentColor" />
    </svg>
  );
}
