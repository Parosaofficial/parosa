import { RestaurantLogo } from "@/components/RestaurantLogo";
import { rewardText } from "@/lib/loyalty";
import "./stampcard.css";

/**
 * The stamp card itself — a wallet-style card with one circle per visit.
 * Filled circles get an inked stamp; the last circle is the reward.
 */
export function StampCard({
  name,
  logoUrl,
  goal,
  stamps,
  reward,
  phoneTail,
  animateLast = false,
}: {
  name: string;
  logoUrl?: string | null;
  goal: number;
  stamps: number;
  reward?: string | null;
  phoneTail?: string;
  /** pop the most recent stamp in (guest page) */
  animateLast?: boolean;
}) {
  const g = Math.max(2, goal);
  const have = Math.min(stamps, g);
  const ready = stamps >= g;
  const left = Math.max(0, g - stamps);
  return (
    <div className={`sc-card${ready ? " ready" : ""}`}>
      <div className="sc-head">
        <RestaurantLogo restaurant={{ name, logo_url: logoUrl ?? null }} size={40} />
        <div className="sc-id">
          <b>{name}</b>
          <span>Stamp card{phoneTail ? ` · ••${phoneTail}` : ""}</span>
        </div>
        <span className="sc-count">{have}<i>/{g}</i></span>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: `repeat(${g <= 6 ? g : Math.ceil(g / 2)}, 1fr)` }}>
        {Array.from({ length: g }, (_, i) => {
          const on = i < have;
          const last = i === g - 1;
          return (
            <span
              key={i}
              className={`sc-dot${on ? " on" : ""}${last ? " gift" : ""}${animateLast && on && i === have - 1 ? " pop" : ""}`}
              style={on ? { animationDelay: `${i * 0.05}s` } : undefined}
            >
              {on ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              ) : last ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12M12 9c-2-4-7-4-6-1 1 2 6 1 6 1Zm0 0c2-4 7-4 6-1-1 2-6 1-6 1Z" /></svg>
              ) : (
                <em>{i + 1}</em>
              )}
            </span>
          );
        })}
      </div>

      <div className="sc-foot">
        {ready ? (
          <><b>🎉 Reward unlocked!</b><span>Show this at the counter for {rewardText(reward)}.</span></>
        ) : (
          <><b>{left} more visit{left === 1 ? "" : "s"}</b><span>to {rewardText(reward)}</span></>
        )}
      </div>
    </div>
  );
}
