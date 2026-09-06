"use client";

import { useId } from "react";

/**
 * Parosa brass seal — the primary mark.
 * PAROSA · SCAN across the top, SERVE · SAVOUR across the bottom (both upright),
 * diamond separators at the sides, प centred. Pure SVG, scales sharp at any size.
 */
export function Seal({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const top = `ptop-${raw}`;
  const bot = `pbot-${raw}`;
  const R = 35;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Parosa"
    >
      <circle cx="50" cy="50" r="48" fill="#4A0C0D" stroke="#B58A3C" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#D8B25E" strokeWidth="1" strokeDasharray="2 3" opacity="0.85" />

      {/* invisible arcs for the two text bands (both travel left→right so text is upright) */}
      <path id={top} d={`M ${50 - R},50 A ${R},${R} 0 0 1 ${50 + R},50`} fill="none" />
      <path id={bot} d={`M ${50 - R},50 A ${R},${R} 0 0 0 ${50 + R},50`} fill="none" />

      <text fontFamily="var(--font-caps)" fontSize="7" fontWeight="600" letterSpacing="0.9" fill="#EAD8A8" textAnchor="middle">
        <textPath href={`#${top}`} startOffset="50%">PAROSA · SCAN</textPath>
      </text>
      <text fontFamily="var(--font-caps)" fontSize="7" fontWeight="600" letterSpacing="0.9" fill="#EAD8A8" textAnchor="middle">
        <textPath href={`#${bot}`} startOffset="50%">SERVE · SAVOUR</textPath>
      </text>

      {/* side diamonds */}
      <rect x={50 - R - 2} y="48" width="4" height="4" fill="#D8B25E" transform={`rotate(45 ${50 - R} 50)`} />
      <rect x={50 + R - 2} y="48" width="4" height="4" fill="#D8B25E" transform={`rotate(45 ${50 + R} 50)`} />

      {/* central प */}
      <text x="50" y="63" textAnchor="middle" fontFamily="var(--font-display)" fontSize="42" fill="#D8B25E">
        प
      </text>
    </svg>
  );
}

/**
 * Full lockup: seal + परोसा / PAROSA wordmark.
 */
export function Logo({
  size = 46,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Seal size={size} />
      <span className="leading-none">
        <span
          className="block text-oxblood"
          style={{ fontFamily: "var(--font-display)", fontSize: size * 0.62 }}
        >
          परोसा
        </span>
        <span
          className="block text-maroon"
          style={{
            fontFamily: "var(--font-caps)",
            fontWeight: 700,
            letterSpacing: "0.34em",
            fontSize: size * 0.2,
            marginTop: 3,
          }}
        >
          PAROSA
        </span>
      </span>
    </span>
  );
}
