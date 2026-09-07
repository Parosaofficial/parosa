import type { Restaurant } from "@/lib/types";

function initials(name?: string | null) {
  if (!name) return "•";
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

/**
 * The restaurant's own identity mark — their uploaded logo if present, otherwise
 * a neutral monogram. Never falls back to the Parosa seal (that's our brand, not theirs).
 */
export function RestaurantLogo({ restaurant, size = 44 }: { restaurant: Pick<Restaurant, "name" | "logo_url">; size?: number }) {
  if (restaurant.logo_url) {
    return (
      <span
        style={{ width: size, height: size, borderRadius: size * 0.24, backgroundImage: `url(${restaurant.logo_url})`, backgroundSize: "cover", backgroundPosition: "center", display: "inline-block", flex: "none", boxShadow: "inset 0 0 0 1px #0000001a" }}
        aria-label={restaurant.name}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, borderRadius: size * 0.24, background: "var(--oxblood)", color: "var(--gold-hi)", display: "inline-grid", placeItems: "center", flex: "none", fontFamily: "var(--font-display)", fontSize: size * 0.42, lineHeight: 1 }}
      aria-label={restaurant.name}
    >
      {initials(restaurant.name)}
    </span>
  );
}
