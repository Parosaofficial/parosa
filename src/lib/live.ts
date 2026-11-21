// Parosa — live updates (0021). The database sends a tiny "something changed"
// signal on a private topic; the screen then refetches through its usual
// checked function. No order data travels in the signal.
//   live:<restaurant live key>  — kitchen screen, staff phones
//   session:<table session id>  — guests' phones at that table
import { supabase } from "./supabase";

/**
 * Listen on a topic; `onChange` runs (at most every 400 ms) when something changes.
 * `onLive(true)` once connected, `onLive(false)` if the connection drops — use it to
 * slow down / speed up the fallback check. Returns a function that stops listening.
 */
export function listenLive(topic: string, onChange: () => void, onLive?: (live: boolean) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const fire = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; onChange(); }, 400);
  };
  const ch = supabase
    .channel(topic, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "change" }, fire)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") { onLive?.(true); onChange(); } // catch up on anything missed while connecting
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onLive?.(false);
    });
  return () => { if (timer) clearTimeout(timer); onLive?.(false); supabase.removeChannel(ch); };
}

/** The staff phone's live key (today's code checked). null = not available (older database). */
export async function staffLiveKey(restaurantId: string, code: string, staffId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("staff_live_key", { p_restaurant: restaurantId, p_code: code, p_staff: staffId });
  if (error || !data) return null;
  return String(data);
}
