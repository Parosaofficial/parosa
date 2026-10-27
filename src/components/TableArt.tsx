import type { TableShape } from "@/lib/tables";
import "./tableart.css";

/**
 * A table seen from above: chairs (or an L-sofa) around a tabletop with its name.
 * Used by the live floor, Seat Reserve and the customer booking page; the
 * parent colours it through the .fl-top / .fl-ch / .fl-sofa classes.
 */
export function TableArt({ shape, name, seated = false }: { shape: TableShape; name: string; seated?: boolean }) {
  const ch = `fl-ch${seated ? " on" : ""}`;
  if (shape === "sofa") {
    return (
      <svg viewBox="0 0 220 120" aria-hidden="true">
        <path className={`fl-sofa${seated ? " on" : ""}`} d="M14 14h192a8 8 0 0 1 8 8v12h-178v64h-14a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z" />
        <rect className={ch} x="78" y="98" width="24" height="14" rx="5" /><rect className={ch} x="118" y="98" width="24" height="14" rx="5" /><rect className={ch} x="158" y="98" width="24" height="14" rx="5" />
        <rect className="fl-top" x="44" y="40" width="160" height="52" rx="10" />
        <text x="124" y="71">{name}</text>
      </svg>
    );
  }
  if (shape === "two") {
    return (
      <svg viewBox="0 0 140 100" aria-hidden="true">
        <rect className={ch} x="22" y="38" width="16" height="24" rx="5" /><rect className={ch} x="102" y="38" width="16" height="24" rx="5" />
        <rect className="fl-top" x="44" y="28" width="52" height="44" rx="8" />
        <text x="70" y="55">{name}</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 140 100" aria-hidden="true">
      <rect className={ch} x="46" y="6" width="20" height="14" rx="5" /><rect className={ch} x="74" y="6" width="20" height="14" rx="5" />
      <rect className={ch} x="46" y="80" width="20" height="14" rx="5" /><rect className={ch} x="74" y="80" width="20" height="14" rx="5" />
      <rect className="fl-top" x="38" y="24" width="64" height="52" rx="8" />
      <text x="70" y="55">{name}</text>
    </svg>
  );
}
