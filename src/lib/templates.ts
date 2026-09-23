// Parosa — customer-menu templates (single source of truth).
//
// A template is NOT just a colour swap: each one drives a genuinely different
// LAYOUT via `data-tpl` in menu.css (photo-grid, editorial, fast-list, …).
// `vars` supplies the design tokens the menu is built on.

import type { CSSProperties } from "react";

export type TemplateDef = {
  id: string;
  name: string;
  hi?: string;
  blurb: string;
  /** Who it suits best — shown on the Templates page. */
  best: string;
  /** The two Parosa signature designs. */
  flagship?: boolean;
  swatches: [string, string, string];
  /** Dark designs only take a theme's brand colours, never its light tints. */
  dark?: boolean;
  vars: Record<string, string>;
};

/**
 * A theme recolours any template: the template owns the layout and fonts,
 * the theme owns the brand colours. "default" keeps the template's own palette.
 */
export type ThemeDef = {
  id: string;
  name: string;
  hint: string;
  chrome: string; chromeInk: string;   // header / cart bar / hero
  accent: string; accentInk: string;   // Add buttons, prices, highlights
  bg: string; surface2: string; line: string;  // light tints (skipped on dark templates)
};

export const THEMES: ThemeDef[] = [
  { id: "default", name: "As designed", hint: "the template's own colours", chrome: "", chromeInk: "", accent: "", accentInk: "", bg: "", surface2: "", line: "" },
  { id: "saffron", name: "Saffron", hint: "warm orange", chrome: "#8A3B0B", chromeInk: "#FFF3E4", accent: "#E2761B", accentInk: "#2E1503", bg: "#FFF9F1", surface2: "#FBEEDF", line: "#F1E0CB" },
  { id: "chilli", name: "Chilli", hint: "classic red", chrome: "#8C1D18", chromeInk: "#FFF1EF", accent: "#D7342A", accentInk: "#FFF4F2", bg: "#FFF7F5", surface2: "#FBE7E3", line: "#F2D9D4" },
  { id: "ocean", name: "Ocean", hint: "blue & white", chrome: "#0F3D5C", chromeInk: "#EAF5FC", accent: "#1E7FB8", accentInk: "#FFFFFF", bg: "#F6FAFD", surface2: "#E8F1F8", line: "#D9E7F1" },
  { id: "emerald", name: "Emerald", hint: "fresh green", chrome: "#12523A", chromeInk: "#EDF9F2", accent: "#1E9160", accentInk: "#FFFFFF", bg: "#F6FBF8", surface2: "#E6F4EC", line: "#D7EADF" },
  { id: "grape", name: "Grape", hint: "deep purple", chrome: "#43225E", chromeInk: "#F6EEFD", accent: "#8250B8", accentInk: "#FFFFFF", bg: "#FAF7FD", surface2: "#F0E8F8", line: "#E4D9EF" },
  { id: "rose", name: "Rose", hint: "soft pink", chrome: "#7A1540", chromeInk: "#FFF0F5", accent: "#D94F7E", accentInk: "#FFFFFF", bg: "#FFF7FA", surface2: "#FBE7EE", line: "#F3D8E2" },
  { id: "charcoal", name: "Charcoal", hint: "black & gold", chrome: "#232323", chromeInk: "#FBF7EC", accent: "#C9A227", accentInk: "#241B02", bg: "#FAF9F7", surface2: "#EFEDEA", line: "#E2DFD9" },
];

export const themeById = (id?: string | null) => THEMES.find((t) => t.id === id) ?? THEMES[0];

const SANS = "var(--font-mukta), system-ui, -apple-system, sans-serif";
const ARCHIVO = "var(--font-archivo), system-ui, sans-serif";
const CINZEL = "var(--font-cinzel), Georgia, serif";
const ROZHA = "var(--font-rozha), Georgia, serif";

export const TEMPLATES: TemplateDef[] = [
  /* ---------------- FLAGSHIP 0b — Transparent (glass) ---------------- */
  {
    id: "transparent",
    name: "Transparent",
    hi: "पारदर्शी",
    blurb: "Frosted glass cards on a soft gradient. Round photos, a price chip and a two-across grid.",
    best: "Cafes, juice bars, modern kitchens",
    swatches: ["#E9ECF7", "#FFFFFF", "#1B1D28"],
    vars: {
      "--m-bg": "#E9ECF6", "--m-surface": "rgba(255,255,255,.62)", "--m-surface-2": "rgba(255,255,255,.45)",
      "--m-chrome": "#1B1D28", "--m-chrome-ink": "#FFFFFF",
      "--m-accent": "#1B1D28", "--m-accent-ink": "#FFFFFF",
      "--m-ink": "#171923", "--m-ink-2": "#7B8094", "--m-muted": "#9AA0B4",
      "--m-line": "rgba(255,255,255,.75)",
      "--m-radius": "24px", "--m-radius-sm": "18px",
      "--m-shadow": "0 18px 40px -26px rgba(40,45,80,.45)",
      "--m-font-display": SANS, "--m-font-body": SANS,
      "--oxblood": "#1B1D28", "--gold-hi": "#8C93B5", "--font-display": SANS,
    },
  },

  /* ---------------- FLAGSHIP 0 — the Parosa design ---------------- */
  {
    id: "parosa",
    name: "Parosa",
    hi: "परोसा",
    blurb: "Our own design. Centred brand header, category pills, big photo cards and a warm closing banner.",
    best: "Signature · the Parosa look",
    flagship: true,
    swatches: ["#6E1618", "#F7F1E5", "#C9A24B"],
    vars: {
      "--m-bg": "#F8F3EA", "--m-surface": "#FFFFFF", "--m-surface-2": "#F2EADD",
      "--m-chrome": "#6E1618", "--m-chrome-ink": "#FFF4E6",
      "--m-accent": "#6E1618", "--m-accent-ink": "#FFF4E6",
      "--m-ink": "#231512", "--m-ink-2": "#6A554B", "--m-muted": "#9C8A7E",
      "--m-line": "#EADFCE",
      "--m-radius": "18px", "--m-radius-sm": "14px",
      "--m-shadow": "0 10px 26px -18px rgba(70,35,20,.35)",
      "--m-font-display": SANS, "--m-font-body": SANS,
      "--oxblood": "#6E1618", "--gold-hi": "#C9A24B", "--font-display": SANS,
    },
  },

  /* ---------------- FLAGSHIP 1 — the face of Parosa ---------------- */
  {
    id: "aurora",
    name: "Aurora",
    hi: "ऑरोरा",
    blurb: "Parosa's signature. Soft, warm and effortless — the one we'd put our name on.",
    best: "Signature · any restaurant",
    flagship: true,
    swatches: ["#5C1A17", "#E08A2B", "#FCF8F3"],
    vars: {
      "--m-bg": "#FCF8F3", "--m-surface": "#FFFFFF", "--m-surface-2": "#F6EEE4",
      "--m-chrome": "#5C1A17", "--m-chrome-ink": "#FFF4E8",
      "--m-accent": "#E08A2B", "--m-accent-ink": "#3A1D06",
      "--m-ink": "#241713", "--m-ink-2": "#6B564C", "--m-muted": "#A5948A",
      "--m-line": "#EFE4DA",
      "--m-radius": "22px", "--m-radius-sm": "14px",
      "--m-shadow": "0 14px 34px -20px rgba(70,35,20,.45)",
      "--m-font-display": ARCHIVO, "--m-font-body": SANS,
      "--oxblood": "#5C1A17", "--gold-hi": "#E08A2B", "--font-display": ARCHIVO,
    },
  },

  /* ---------------- FLAGSHIP 2 — dark, luxe ---------------- */
  {
    id: "noir",
    name: "Noir",
    hi: "नॉयर",
    blurb: "Parosa after dark. A fine-dining menu card — full-bleed hero, gold hairlines, quiet luxury.",
    best: "Signature · fine dining & bars",
    flagship: true,
    swatches: ["#12100E", "#D9A441", "#F4EBDD"],
    dark: true,
    vars: {
      "--m-bg": "#12100E", "--m-surface": "#1B1815", "--m-surface-2": "#241F1A",
      "--m-chrome": "#0C0A09", "--m-chrome-ink": "#F4EBDD",
      "--m-accent": "#D9A441", "--m-accent-ink": "#14100B",
      "--m-ink": "#F4EBDD", "--m-ink-2": "#C3B4A1", "--m-muted": "#8C7E6D",
      "--m-line": "#332B24",
      "--m-radius": "16px", "--m-radius-sm": "12px",
      "--m-shadow": "0 20px 44px -22px rgba(0,0,0,.85)",
      "--m-font-display": CINZEL, "--m-font-body": SANS,
      "--oxblood": "#0C0A09", "--gold-hi": "#D9A441", "--font-display": CINZEL,
    },
  },

  /* ---------------- Photo-first grid ---------------- */
  {
    id: "gallery",
    name: "Gallery",
    blurb: "Big, appetising photos in a two-up grid. Let the food do the selling.",
    best: "Cafés & places with great photos",
    swatches: ["#1A1A1A", "#FF5A1F", "#F7F7F5"],
    vars: {
      "--m-bg": "#F6F6F4", "--m-surface": "#FFFFFF", "--m-surface-2": "#EFEFEC",
      "--m-chrome": "#1A1A1A", "--m-chrome-ink": "#FFFFFF",
      "--m-accent": "#FF5A1F", "--m-accent-ink": "#FFFFFF",
      "--m-ink": "#191919", "--m-ink-2": "#4A4A4A", "--m-muted": "#8A8A8A",
      "--m-line": "#E8E8E6",
      "--m-radius": "18px", "--m-radius-sm": "12px",
      "--m-shadow": "0 12px 28px -18px rgba(0,0,0,.35)",
      "--m-font-display": ARCHIVO, "--m-font-body": SANS,
      "--oxblood": "#1A1A1A", "--gold-hi": "#FF5A1F", "--font-display": ARCHIVO,
    },
  },

  /* ---------------- Fast, text-first ---------------- */
  {
    id: "express",
    name: "Express",
    hi: "एक्सप्रेस",
    blurb: "No photos needed. A crisp price list built for speed — order in seconds.",
    best: "Dhabas, QSR & busy counters",
    swatches: ["#B3160F", "#1A1A1A", "#FFFDF7"],
    vars: {
      "--m-bg": "#FFFDF7", "--m-surface": "#FFFFFF", "--m-surface-2": "#FBF3E6",
      "--m-chrome": "#B3160F", "--m-chrome-ink": "#FFF3E0",
      "--m-accent": "#B3160F", "--m-accent-ink": "#FFFFFF",
      "--m-ink": "#1A1A1A", "--m-ink-2": "#454545", "--m-muted": "#8C8C8C",
      "--m-line": "#EDE4D4",
      "--m-radius": "10px", "--m-radius-sm": "8px",
      "--m-shadow": "0 8px 20px -16px rgba(0,0,0,.3)",
      "--m-font-display": SANS, "--m-font-body": SANS,
      "--oxblood": "#B3160F", "--gold-hi": "#FFFFFF", "--font-display": SANS,
    },
  },

  /* ---------------- Heritage ---------------- */
  {
    id: "virasat",
    name: "Virasat",
    hi: "विरासत",
    blurb: "The heritage card — oxblood, parchment and brass, with ornate Devanagari.",
    best: "Traditional Indian restaurants",
    swatches: ["#6E1618", "#CBA24E", "#EFE6D1"],
    vars: {
      "--m-bg": "#EFE6D1", "--m-surface": "#F8F1DF", "--m-surface-2": "#E5D8BC",
      "--m-chrome": "#6E1618", "--m-chrome-ink": "#F5EFDD",
      "--m-accent": "#CBA24E", "--m-accent-ink": "#4A0C0D",
      "--m-ink": "#3E1012", "--m-ink-2": "#79302A", "--m-muted": "#9A7C55",
      "--m-line": "#D8C299",
      "--m-radius": "14px", "--m-radius-sm": "11px",
      "--m-shadow": "0 12px 26px -18px rgba(94,17,19,.5)",
      "--m-font-display": ROZHA, "--m-font-body": SANS,
      "--oxblood": "#6E1618", "--gold-hi": "#CBA24E", "--font-display": ROZHA,
    },
  },
];

/** Older/removed template ids degrade to the closest surviving design. */
const ALIASES: Record<string, string> = {
  masala: "virasat", tandoor: "express", blanc: "gallery",
  midnight: "noir", gelato: "gallery", bento: "gallery", coastal: "aurora",
};

export const templateById = (id?: string | null) => {
  const key = id ? (ALIASES[id] ?? id) : "";
  return TEMPLATES.find((t) => t.id === key) ?? TEMPLATES[0];
};

/** Resolve any stored id to a live template id (used by the menu route). */
export const resolveTemplateId = (id?: string | null) => templateById(id).id;

/**
 * CSS custom-property style object for the menu root: the template's tokens
 * with the chosen theme's colours layered on top.
 */
export function templateStyle(id?: string | null, themeId?: string | null): CSSProperties {
  const tpl = templateById(id);
  const theme = themeById(themeId);
  if (theme.id === "default") return tpl.vars as CSSProperties;
  const vars: Record<string, string> = {
    ...tpl.vars,
    "--m-chrome": theme.chrome, "--m-chrome-ink": theme.chromeInk,
    "--m-accent": theme.accent, "--m-accent-ink": theme.accentInk,
    "--oxblood": theme.chrome, "--gold-hi": theme.accent,
  };
  // dark designs keep their own dark backgrounds; light ones take the tint
  if (!tpl.dark) {
    vars["--m-bg"] = theme.bg;
    vars["--m-surface-2"] = theme.surface2;
    vars["--m-line"] = theme.line;
  }
  return vars as CSSProperties;
}
