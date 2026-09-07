// Parosa — customer-menu templates (single source of truth).
// Each template re-skins the whole menu by overriding the CSS design tokens
// that menu.css already consumes, so no per-template markup is needed.

import type { CSSProperties } from "react";

export type TemplateDef = {
  id: string;
  name: string;
  hi?: string;
  blurb: string;
  swatches: [string, string, string]; // preview dots
  vars: Record<string, string>;        // CSS custom-property overrides applied on .pm-app
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: "virasat", name: "Virasat", hi: "विरासत", blurb: "Heritage · oxblood & brass",
    swatches: ["#6E1618", "#EFE6D1", "#CBA24E"],
    vars: {
      "--parch": "#efe6d1", "--parch-hi": "#f5efdd", "--parch-2": "#e5d8bc", "--cream-card": "#f8f1df",
      "--oxblood": "#6e1618", "--maroon": "#8c1c1c", "--maroon-deep": "#531012",
      "--gold": "#a9823a", "--gold-hi": "#cba24e", "--gold-soft": "#e7d6a6",
      "--line": "#d8c299", "--line-gold": "#c9a24b",
      "--ink": "#3e1012", "--ink-2": "#79302a", "--muted": "#9a7c55",
      "--font-display": "var(--font-rozha), Georgia, serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "noir", name: "Noir Maison", blurb: "Fine dining · charcoal & gold",
    swatches: ["#12100E", "#C79A45", "#F3EAD8"],
    vars: {
      "--parch": "#f6f2e9", "--parch-hi": "#efe9dc", "--parch-2": "#e3dbc8", "--cream-card": "#fbf8f0",
      "--oxblood": "#191510", "--maroon": "#2c261e", "--maroon-deep": "#0d0b08",
      "--gold": "#b58f42", "--gold-hi": "#d8b25e", "--gold-soft": "#ecdcb4",
      "--line": "#ddd3bf", "--line-gold": "#c2a24b",
      "--ink": "#1c1712", "--ink-2": "#4a4235", "--muted": "#8c8069",
      "--font-display": "Georgia, 'Times New Roman', serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "masala", name: "Masala Market", hi: "मसाला", blurb: "Dhaba · mustard & warmth",
    swatches: ["#FFF3D6", "#E4761B", "#5A3A12"],
    vars: {
      "--parch": "#fff3d6", "--parch-hi": "#ffecbf", "--parch-2": "#f6dfab", "--cream-card": "#fff8e6",
      "--oxblood": "#b1560f", "--maroon": "#c4661a", "--maroon-deep": "#7c3a06",
      "--gold": "#e4761b", "--gold-hi": "#ffe8b0", "--gold-soft": "#ffd98a",
      "--line": "#e9cf9a", "--line-gold": "#dda94f",
      "--ink": "#5a3a12", "--ink-2": "#7a5320", "--muted": "#a5814a",
      "--font-display": "var(--font-rozha), Georgia, serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "tandoor", name: "Tandoor", hi: "तंदूर", blurb: "Street food · bold red",
    swatches: ["#B3160F", "#FFC533", "#FFF3E0"],
    vars: {
      "--parch": "#fff4ea", "--parch-hi": "#ffe9d6", "--parch-2": "#ffd9bf", "--cream-card": "#fff8f2",
      "--oxblood": "#b3160f", "--maroon": "#cc2018", "--maroon-deep": "#7c0d08",
      "--gold": "#f0a01a", "--gold-hi": "#ffc533", "--gold-soft": "#ffe0a0",
      "--line": "#f2c9a8", "--line-gold": "#f0a838",
      "--ink": "#4a1108", "--ink-2": "#7a2a18", "--muted": "#b07a5a",
      "--font-display": "var(--font-rozha), Georgia, serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "blanc", name: "Blanc", blurb: "Café · minimal black & white",
    swatches: ["#FFFFFF", "#111111", "#8A8A8A"],
    vars: {
      "--parch": "#ffffff", "--parch-hi": "#f6f6f4", "--parch-2": "#ededea", "--cream-card": "#ffffff",
      "--oxblood": "#141414", "--maroon": "#2a2a2a", "--maroon-deep": "#000000",
      "--gold": "#8a8a8a", "--gold-hi": "#f2f2f0", "--gold-soft": "#cfcfcf",
      "--line": "#e6e6e3", "--line-gold": "#dad8d2",
      "--ink": "#141414", "--ink-2": "#4a4a4a", "--muted": "#8a8a8a",
      "--font-display": "Georgia, 'Times New Roman', serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "midnight", name: "Midnight", blurb: "Bar · navy & mint",
    swatches: ["#0C1116", "#31E0C4", "#E6EEF2"],
    vars: {
      "--parch": "#eef3f4", "--parch-hi": "#e3ebec", "--parch-2": "#d3e0e1", "--cream-card": "#f7fafa",
      "--oxblood": "#0c1116", "--maroon": "#16222a", "--maroon-deep": "#05080b",
      "--gold": "#12a08c", "--gold-hi": "#31e0c4", "--gold-soft": "#bff0e6",
      "--line": "#cfe0df", "--line-gold": "#7fb6ad",
      "--ink": "#0c1116", "--ink-2": "#37474f", "--muted": "#7a8a90",
      "--font-display": "var(--font-mukta), system-ui, sans-serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "gelato", name: "Gelato Bar", blurb: "Dessert · playful pink",
    swatches: ["#FDEAF0", "#F26E9A", "#5A2A3E"],
    vars: {
      "--parch": "#fdeaf0", "--parch-hi": "#fbdfe8", "--parch-2": "#f6cdda", "--cream-card": "#fff5f8",
      "--oxblood": "#7a2a44", "--maroon": "#9a3557", "--maroon-deep": "#5a1f33",
      "--gold": "#f26e9a", "--gold-hi": "#ffd1e0", "--gold-soft": "#ffe3ec",
      "--line": "#f3ccd9", "--line-gold": "#ef9ab4",
      "--ink": "#5a2a3e", "--ink-2": "#8a4a60", "--muted": "#b57a90",
      "--font-display": "var(--font-mukta), system-ui, sans-serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "bento", name: "Bento Fresh", blurb: "QSR · slate & orange",
    swatches: ["#F5F6F8", "#FF5A1F", "#151A20"],
    vars: {
      "--parch": "#f5f6f8", "--parch-hi": "#eceef1", "--parch-2": "#dde1e6", "--cream-card": "#ffffff",
      "--oxblood": "#151a20", "--maroon": "#262d36", "--maroon-deep": "#0b0e12",
      "--gold": "#ff5a1f", "--gold-hi": "#ff8a5c", "--gold-soft": "#ffd9c7",
      "--line": "#dfe3e8", "--line-gold": "#c9ccd1",
      "--ink": "#151a20", "--ink-2": "#41474f", "--muted": "#8a9199",
      "--font-display": "var(--font-mukta), system-ui, sans-serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
  {
    id: "coastal", name: "Coastal Catch", blurb: "Seafood · teal & aqua",
    swatches: ["#E4F1F2", "#0E8C93", "#123840"],
    vars: {
      "--parch": "#e6f1f2", "--parch-hi": "#dcecec", "--parch-2": "#c8e0e0", "--cream-card": "#f4fafa",
      "--oxblood": "#123840", "--maroon": "#1a4c54", "--maroon-deep": "#0a262c",
      "--gold": "#0e8c93", "--gold-hi": "#58c9cd", "--gold-soft": "#bfeaea",
      "--line": "#cfe4e3", "--line-gold": "#6fb6b3",
      "--ink": "#123840", "--ink-2": "#35606a", "--muted": "#7aa0a2",
      "--font-display": "Georgia, 'Times New Roman', serif", "--font-caps": "var(--font-cinzel), Georgia, serif",
    },
  },
];

export const templateById = (id?: string | null) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** CSS custom-property style object to spread onto the menu root. */
export function templateStyle(id?: string | null): CSSProperties {
  return templateById(id).vars as CSSProperties;
}
