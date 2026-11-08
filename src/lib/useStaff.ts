"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffSession } from "./types";

const KEY = "parosa-staff";

export function readStaffSession(): StaffSession | null {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as StaffSession) : null; } catch { return null; }
}
export function saveStaffSession(s: StaffSession) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
export function clearStaffSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Guards the POS / kitchen screen: sends staff to the staff login if there's no session (then back to `next`). */
export function useStaff(next?: string) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = readStaffSession();
    if (!s) { router.replace(next ? `/login/staff?next=${encodeURIComponent(next)}` : "/login/staff"); return; }
    setStaff(s);
    setReady(true);
  }, [router, next]);
  return { staff, ready };
}
