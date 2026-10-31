// Parosa — the shared dish photo library.
//
// Square photos of common dishes (public/dishes/<slug>.webp), all under
// the Pexels licence (free for commercial use).
// When an owner adds "Paneer Butter Masala", the matching photo is attached
// automatically; they can still upload their own. Credits: /photo-credits.

import library from "./dishLibrary.json";

export type LibraryDish = {
  slug: string;
  name: string;
  aliases: string[];
  credit: { by: string; license: string; license_url: string | null; source: string | null };
};

export const DISH_LIBRARY = library as LibraryDish[];

// stored as a full address so the Parosa mobile app can show it too
const SITE = "https://www.parosa.food";
export const libraryPhotoUrl = (slug: string) => `${SITE}/dishes/${slug}.webp`;
export const isLibraryPhoto = (url: string | null | undefined) => !!url && /\/dishes\/[a-z0-9-]+\.webp$/.test(url);

// words that don't change which dish it is
const NOISE = new Set(["special", "spl", "full", "half", "plate", "portion", "regular", "large", "small", "medium", "pc", "pcs", "piece", "pieces", "with", "and", "the", "of", "a", "style", "house", "chef", "s", "fresh", "hot"]);
const SPELL: Record<string, string> = {
  kadhai: "kadai", karahi: "kadai", kadhi: "kadhi", chhole: "chole", chholey: "chole", choley: "chole",
  makhni: "makhani", mutter: "matar", mattar: "matar", gobhi: "gobi", aloo: "aloo", alu: "aloo",
  biriyani: "biryani", briyani: "biryani", birayani: "biryani", panner: "paneer", paner: "paneer",
  tikki: "tikki", golgappe: "golgappa", pakoda: "pakora", pakodas: "pakora", pakoras: "pakora",
  momo: "momos", noodle: "noodles", fries: "fries", dosai: "dosa", idly: "idli", vadai: "vada",
  roti: "roti", rotis: "roti", naans: "naan", parantha: "paratha", parotta: "paratha", prantha: "paratha",
  laddoo: "ladoo", laddu: "ladoo", lassi: "lassi", chai: "chai", tea: "chai", shake: "shake", milkshake: "shake",
};

function tokens(s: string): string[] {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter((w) => w && !NOISE.has(w)).map((w) => SPELL[w] ?? w);
}

// every name and alias as a token list, longest first so "paneer butter masala" beats "butter"
const KEYS = DISH_LIBRARY.flatMap((d) => [d.name, ...d.aliases].map((n) => ({ d, t: tokens(n) })))
  .filter((k) => k.t.length > 0)
  .sort((a, b) => b.t.length - a.t.length);

/** The library dish for an owner's dish name, or null. "Spl. Paneer Butter Masala (Half)" → Paneer Butter Masala. */
export function matchDish(name: string): LibraryDish | null {
  const have = tokens(name);
  if (have.length === 0) return null;
  const joined = have.join(" ");
  const exact = KEYS.find((k) => k.t.join(" ") === joined);
  if (exact) return exact.d;
  const set = new Set(have);
  // every word of the library name appears in the owner's name (in any order)
  const contained = KEYS.find((k) => k.t.every((w) => set.has(w)) && (k.t.length >= 2 || have.length <= 2));
  return contained?.d ?? null;
}
