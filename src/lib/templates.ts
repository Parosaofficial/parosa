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
  vars: Record<string, string>;
};

const SANS = "var(--font-mukta), system-ui, -apple-system, sans-serif";
const ARCHIVO = "var(--font-archivo), system-ui, sans-serif";
const CINZEL = "var(--font-cinzel), Georgia, serif";
const ROZHA = "var(--font-rozha), Georgia, serif";

export const TEMPLATES: TemplateDef[] = [
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

/** CSS custom-property style object to spread onto the menu root. */
export function templateStyle(id?: string | null): CSSProperties {
  return templateById(id).vars as CSSProperties;
}
