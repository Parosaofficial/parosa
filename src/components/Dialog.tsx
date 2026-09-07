"use client";

import { useEffect, useRef, useState } from "react";
import "./dialog.css";

export function Dialog({
  open,
  title,
  message,
  input = false,
  placeholder,
  defaultValue = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  requireMatch,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  input?: boolean;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requireMatch?: string;   // when set, confirm is enabled only if the input matches exactly
  busy?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setVal(defaultValue);
      setTimeout(() => ref.current?.focus(), 40);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const blocked =
    busy ||
    (input && !val.trim()) ||
    (requireMatch !== undefined && val.trim() !== requireMatch);

  const confirm = () => { if (!blocked) onConfirm(val.trim()); };

  return (
    <div className="pd-scrim" onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="pd-modal" role="dialog" aria-modal="true">
        <h3 className={danger ? "danger" : ""}>{title}</h3>
        {message && <p>{message}</p>}
        {input && (
          <input
            ref={ref}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
          />
        )}
        <div className="pd-acts">
          <button className="pd-cancel" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className={`pd-ok${danger ? " danger" : ""}`} onClick={confirm} disabled={blocked}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
