"use client";

// Guards every owner-facing page: if there's no session it sends the visitor to
// /login; if they're signed in but have no restaurant yet it sends them to the
// create flow; otherwise it hands back their restaurant.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserId } from "./auth";
import { getRestaurantByOwner } from "./db";
import type { Restaurant } from "./types";

export function useOwner() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const uid = await getCurrentUserId();
    if (!uid) {
      router.replace("/login");
      return;
    }
    const r = await getRestaurantByOwner(uid);
    if (!r) {
      router.replace("/signup");
      return;
    }
    setRestaurant(r);
    setReady(true);
  }, [router]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { restaurant, ready, reload };
}
