"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { KitchenSession } from "./kitchen";

const KEY = "parosa-kitchen";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const subscribe = (cb: () => void) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); };

/** Guards the kitchen screen: no kitchen sign-in on this tablet → /kitchen/login. */
export function useKitchenSession() {
  const router = useRouter();
  // undefined on the server / first paint, then the stored value (or null)
  const raw = useSyncExternalStore(subscribe, read, () => undefined);
  const session = useMemo<KitchenSession | null>(() => {
    if (!raw) return null;
    try { return JSON.parse(raw) as KitchenSession; } catch { return null; }
  }, [raw]);
  useEffect(() => {
    if (raw === null || (raw !== undefined && !session)) router.replace("/kitchen/login");
  }, [raw, session, router]);
  return { session, ready: raw !== undefined && !!session };
}
