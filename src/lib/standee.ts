// Parosa — "Heritage" table standee (the tent card from the brand photo).
//
// One layout feeds both outputs so the card on screen and the printed PNG match:
//   • artSvg()  — everything except lettering (background, borders, ornaments,
//                 QR, skyline, bottom band) as a standalone SVG. On screen it's
//                 inlined; for the PNG it's rasterised onto a canvas.
//   • TEXTS     — the lettering. Inline SVG <text> on screen, ctx.fillText in
//                 the PNG (an SVG drawn into a canvas can't use the page's fonts).
//   • SEAL      — the real parosa-seal.png, drawn on top in both.

import QRCode from "qrcode";

export const W = 600;
export const H = 1000;
export const SEAL = { src: "/brand/parosa-seal.png", x: 222, y: 30, size: 156 };

const MAROON = "#6B1416";
const MAROON_DEEP = "#4E0E10";
const GOLD = "#B8893C";
const GOLD_HI = "#D6AE5C";
const SEPIA = "#8A5B36";
const SEPIA_FILL = "#EBD6B3";
const QR_INK = "#1E1512";

/* ---------------- QR ---------------- */
const QR = { x: 140, y: 330, size: 320, pad: 24 }; // pad keeps a white quiet zone for scanners

function qrPath(url: string): { d: string; cell: number } {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const cell = (QR.size - QR.pad * 2) / n;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return { d, cell };
}

/* ---------------- ornaments ---------------- */
// Corner flourish: a maroon diamond with four gold petals, mirrored per corner.
function cornerFlourish(x: number, y: number, flip: boolean): string {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${s} 1)">
    <ellipse cx="12" cy="0" rx="10" ry="4.2" fill="${GOLD}" transform="rotate(-35 12 0)"/>
    <ellipse cx="0" cy="12" rx="4.2" ry="10" fill="${GOLD}" transform="rotate(-35 0 12)"/>
    <ellipse cx="24" cy="14" rx="7" ry="3" fill="${GOLD_HI}" transform="rotate(30 24 14)"/>
    <ellipse cx="14" cy="24" rx="3" ry="7" fill="${GOLD_HI}" transform="rotate(30 14 24)"/>
    <rect x="6" y="6" width="12" height="12" fill="${MAROON}" transform="rotate(45 12 12)"/>
    <circle cx="12" cy="12" r="2.2" fill="${GOLD_HI}"/>
    <circle cx="30" cy="28" r="2" fill="${MAROON}"/>
    <circle cx="36" cy="6" r="1.6" fill="${GOLD}"/><circle cx="6" cy="36" r="1.6" fill="${GOLD}"/>
  </g>`;
}

// Vertical "· ◆ ·" on the side borders.
function sideOrnament(x: number, y: number): string {
  return `<g fill="${MAROON}">
    <circle cx="${x}" cy="${y - 20}" r="2"/><circle cx="${x}" cy="${y - 12}" r="1.4"/>
    <rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" transform="rotate(45 ${x} ${y})"/>
    <circle cx="${x}" cy="${y + 12}" r="1.4"/><circle cx="${x}" cy="${y + 20}" r="2"/>
  </g>`;
}

// Small "—◆—" divider under the wordmark.
function divider(cx: number, y: number): string {
  return `<g>
    <path d="M${cx - 44} ${y}H${cx - 10}M${cx + 10} ${y}H${cx + 44}" stroke="${GOLD}" stroke-width="1.4"/>
    <rect x="${cx - 5}" y="${y - 5}" width="10" height="10" fill="${MAROON}" transform="rotate(45 ${cx} ${y})"/>
    <circle cx="${cx - 48}" cy="${y}" r="1.8" fill="${GOLD}"/><circle cx="${cx + 48}" cy="${y}" r="1.8" fill="${GOLD}"/>
  </g>`;
}

/* ---------------- skyline (sepia line art) ---------------- */
function arches(x0: number, y: number, count: number, w: number, h: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = x0 + i * w;
    d += `M${x + w * 0.18} ${y + h}V${y + w * 0.32}A${w * 0.32} ${w * 0.32} 0 0 1 ${x + w * 0.82} ${y + w * 0.32}V${y + h}`;
  }
  return `<path d="${d}" fill="none" stroke="${SEPIA}" stroke-width="1.1"/>`;
}

function dome(cx: number, base: number, w: number, h: number, finial = 10): string {
  const l = cx - w / 2, r = cx + w / 2;
  return `<path d="M${l} ${base}C${l} ${base - h * 0.55} ${cx - w * 0.18} ${base - h * 0.8} ${cx} ${base - h}C${cx + w * 0.18} ${base - h * 0.8} ${r} ${base - h * 0.55} ${r} ${base}Z" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.4"/>
    <path d="M${cx} ${base - h}v-${finial}" stroke="${SEPIA}" stroke-width="1.4"/><circle cx="${cx}" cy="${base - h - finial - 2}" r="2" fill="${SEPIA}"/>
    <path d="M${cx - w * 0.22} ${base - h * 0.25}Q${cx} ${base - h * 0.35} ${cx + w * 0.22} ${base - h * 0.25}" fill="none" stroke="${SEPIA}" stroke-width="0.9"/>`;
}

function tower(x: number, top: number, w: number, base: number): string {
  return `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.3"/>
    <path d="M${x - 3} ${top}h${w + 6}M${x - 2} ${top + 30}h${w + 4}M${x - 2} ${top + 62}h${w + 4}" stroke="${SEPIA}" stroke-width="1.2"/>
    ${arches(x + 1, top + 6, 1, w - 2, 20)}${arches(x + 1, top + 38, 1, w - 2, 20)}
    ${dome(x + w / 2, top, w + 4, 18, 7)}`;
}

function skyline(): string {
  const G = 922; // ground line
  const hatch = Array.from({ length: 9 }, (_, i) => `M${38 + i * 9} ${G - 4}l6 -6`).join("");
  return `<g stroke-linejoin="round" stroke-linecap="round">
    <!-- far hills + sun -->
    <circle cx="456" cy="${G - 8}" r="62" fill="#EFCF9F" opacity=".75"/>
    <path d="M330 ${G}C370 ${G - 30} 400 ${G - 40} 432 ${G - 26}C462 ${G - 12} 480 ${G - 44} 520 ${G - 48}C548 ${G - 50} 570 ${G - 34} 590 ${G - 28}V${G}Z" fill="#E6CBA1" opacity=".8"/>
    <path d="M300 ${G}C340 ${G - 14} 380 ${G - 18} 420 ${G - 8}" fill="none" stroke="${SEPIA}" stroke-width="1" opacity=".55"/>

    <!-- birds -->
    <path d="M440 806q5 -5 10 0q5 -5 10 0M470 790q4 -4 8 0q4 -4 8 0M418 822q4 -4 8 0q4 -4 8 0" fill="none" stroke="${SEPIA}" stroke-width="1.4"/>

    <!-- palace (left) -->
    ${tower(34, 812, 26, G)}
    <rect x="66" y="842" width="180" height="${G - 842}" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.4"/>
    <path d="M62 842h188M64 868h184" stroke="${SEPIA}" stroke-width="1.2"/>
    ${arches(70, 846, 9, 19.5, 20)}
    ${arches(70, 874, 9, 19.5, 46)}
    <rect x="118" y="808" width="76" height="34" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.4"/>
    ${arches(122, 812, 4, 17, 28)}
    ${dome(156, 808, 74, 60, 12)}
    ${dome(92, 842, 30, 26, 8)}
    ${dome(220, 842, 30, 26, 8)}
    <path d="M118 808v-10M194 808v-10" stroke="${SEPIA}" stroke-width="1.4"/>
    ${dome(118, 798, 10, 10, 5)}${dome(194, 798, 10, 10, 5)}
    ${tower(252, 832, 20, G)}

    <!-- town (middle) -->
    <rect x="280" y="874" width="44" height="${G - 874}" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.2"/>
    ${arches(282, 880, 2, 20, 30)}
    ${dome(302, 874, 34, 24, 7)}
    <rect x="328" y="890" width="34" height="${G - 890}" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.2"/>
    ${arches(330, 896, 2, 15, 18)}
    <path d="M370 ${G}v-40h6v40" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.2"/>${dome(373, 882, 10, 9, 4)}
    <rect x="384" y="900" width="28" height="${G - 900}" fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.1"/>
    ${arches(386, 904, 2, 12, 12)}

    <!-- camel -->
    <path d="M478 ${G - 2}l2 -22c-6 -2 -9 -8 -8 -14c1 -9 9 -15 17 -14c6 -6 14 -5 18 1c4 -3 10 -2 13 3l6 -12c1 -4 4 -6 8 -6l6 2c2 1 2 3 0 4l-6 1l-5 14c-2 4 -6 7 -10 8l-1 13l3 22h-5l-3 -20l-14 0l-3 20h-5l1 -20c-4 1 -8 0 -11 -2l-2 22z" fill="${SEPIA}"/>

    <!-- tree (right edge) -->
    <path d="M556 ${G}c2 -30 0 -60 -4 -96M553 860c-12 -10 -22 -12 -34 -10M552 842c10 -12 22 -16 34 -14" fill="none" stroke="${SEPIA}" stroke-width="3"/>
    <g fill="${SEPIA_FILL}" stroke="${SEPIA}" stroke-width="1.3">
      <circle cx="520" cy="842" r="18"/><circle cx="546" cy="818" r="22"/><circle cx="574" cy="826" r="18"/>
      <circle cx="534" cy="796" r="18"/><circle cx="566" cy="792" r="20"/><circle cx="584" cy="808" r="13"/>
      <circle cx="552" cy="772" r="17"/><circle cx="508" cy="818" r="12"/>
    </g>
    <g fill="${SEPIA}" opacity=".5"><circle cx="530" cy="830" r="2"/><circle cx="560" cy="806" r="2"/><circle cx="548" cy="784" r="2"/><circle cx="574" cy="816" r="2"/></g>

    <!-- ground -->
    <path d="M26 ${G}H574" stroke="${SEPIA}" stroke-width="1.6"/>
    <path d="${hatch}" stroke="${SEPIA}" stroke-width="1" opacity=".6"/>
    <path d="M430 ${G}q8 -10 16 0M600 ${G}" fill="none" stroke="${SEPIA}" stroke-width="1.2"/>
  </g>`;
}

/* ---------------- bottom band ---------------- */
const BAND = { y: 936, h: 64 };

function band(): string {
  let pat = "";
  for (let x = 22; x < W; x += 28) {
    pat += `<rect x="${x - 5}" y="${BAND.y + BAND.h / 2 - 5}" width="10" height="10" fill="${GOLD_HI}" transform="rotate(45 ${x} ${BAND.y + BAND.h / 2})"/>`;
    pat += `<circle cx="${x + 14}" cy="${BAND.y + BAND.h / 2}" r="2" fill="${GOLD}"/>`;
  }
  return `<rect x="0" y="${BAND.y}" width="${W}" height="${BAND.h}" fill="${MAROON_DEEP}"/>
    <path d="M0 ${BAND.y + 7}H${W}M0 ${BAND.y + BAND.h - 7}H${W}" stroke="${GOLD}" stroke-width="1.4"/>
    ${pat}
    <rect x="${W / 2 - 74}" y="${BAND.y + 12}" width="148" height="${BAND.h - 24}" rx="20" fill="${MAROON_DEEP}" stroke="${GOLD_HI}" stroke-width="1.6"/>`;
}

/* ---------------- full art ---------------- */
export function artSvg(url: string): string {
  const { d, cell } = qrPath(url);
  const B = 20; // outer border inset
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="pg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#FAF1DE"/><stop offset=".7" stop-color="#F2E3C4"/><stop offset="1" stop-color="#E4CDA2"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#pg)"/>
  <rect x="${B}" y="${B}" width="${W - B * 2}" height="${BAND.y - B - 8}" fill="none" stroke="${GOLD}" stroke-width="2"/>
  <rect x="${B + 7}" y="${B + 7}" width="${W - B * 2 - 14}" height="${BAND.y - B - 22}" fill="none" stroke="${GOLD}" stroke-width="0.9"/>
  ${cornerFlourish(B + 14, B + 14, false)}
  ${cornerFlourish(W - B - 14, B + 14, true)}
  ${sideOrnament(B + 3.5, 330)}${sideOrnament(W - B - 3.5, 330)}
  ${divider(W / 2, 300)}

  <rect x="${QR.x - 6}" y="${QR.y - 6}" width="${QR.size + 12}" height="${QR.size + 12}" rx="26" fill="none" stroke="${GOLD}" stroke-width="1.2"/>
  <rect x="${QR.x}" y="${QR.y}" width="${QR.size}" height="${QR.size}" rx="22" fill="#FFFDF8" stroke="${GOLD_HI}" stroke-width="3"/>
  <path d="${d}" transform="translate(${QR.x + QR.pad} ${QR.y + QR.pad}) scale(${cell})" fill="${QR_INK}" shape-rendering="crispEdges"/>

  ${skyline()}
  ${band()}
</svg>`;
}

/* ---------------- lettering ---------------- */
export type Family = "caps" | "body" | "script";
export type TextSpec = {
  t: string; x: number; y: number; size: number; family: Family; weight: number;
  ls?: number; fill: string; anchor?: "middle" | "start"; rotate?: number;
};

export function texts(table: number): TextSpec[] {
  return [
    { t: "PAROSA", x: 300, y: 252, size: 62, family: "caps", weight: 700, ls: 12, fill: MAROON, anchor: "middle" },
    { t: "SERVE  ·  SAVOUR", x: 300, y: 282, size: 19, family: "caps", weight: 700, ls: 5, fill: MAROON, anchor: "middle" },
    { t: "SCAN  ·  ORDER  ·  ENJOY", x: 300, y: 708, size: 23, family: "body", weight: 700, ls: 4, fill: MAROON_DEEP, anchor: "middle" },
    { t: "Good", x: 232, y: 778, size: 40, family: "script", weight: 400, fill: MAROON, anchor: "start", rotate: -12 },
    { t: "Food", x: 252, y: 814, size: 40, family: "script", weight: 400, fill: MAROON, anchor: "start", rotate: -12 },
    { t: "Brighter", x: 266, y: 852, size: 40, family: "script", weight: 400, fill: MAROON, anchor: "start", rotate: -12 },
    { t: "People", x: 300, y: 890, size: 40, family: "script", weight: 400, fill: MAROON, anchor: "start", rotate: -12 },
    { t: `TABLE ${table}`, x: 300, y: BAND.y + BAND.h / 2 + 7, size: 19, family: "caps", weight: 700, ls: 3, fill: GOLD_HI, anchor: "middle" },
  ];
}

// The flourish under "People", part of the script lettering.
const SWASH = `M300 902c30 -4 70 -14 104 -30c10 -5 14 -2 8 4`;

/* ---------------- on-screen SVG ---------------- */
const CSS_FONT: Record<Family, string> = {
  caps: "var(--font-caps)",
  body: "var(--font-body)",
  script: "var(--font-script), cursive",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Full standee as inline SVG markup for the page (uses the page's fonts). */
export function standeeSvg(url: string, table: number): string {
  const art = artSvg(url).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const lettering = texts(table).map((s) =>
    `<text x="${s.x}" y="${s.y}" text-anchor="${s.anchor ?? "middle"}" fill="${s.fill}" font-size="${s.size}"`
    + ` style="font-family:${CSS_FONT[s.family]};font-weight:${s.weight};letter-spacing:${s.ls ?? 0}px"`
    + (s.rotate ? ` transform="rotate(${s.rotate} ${s.x} ${s.y})"` : "")
    + `>${esc(s.t)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Table ${table} QR standee">${art}`
    + `<image href="${SEAL.src}" x="${SEAL.x}" y="${SEAL.y}" width="${SEAL.size}" height="${SEAL.size}"/>`
    + lettering
    + `<path d="${SWASH}" fill="none" stroke="${MAROON}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

/* ---------------- printable PNG ---------------- */
function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

/** Resolve the page font behind a CSS variable (next/font gives each one a generated family name). */
function fontOf(el: Element, family: Family): string {
  const v = { caps: "--font-cinzel", body: "--font-mukta", script: "--font-script" }[family];
  const fallback = { caps: "Georgia, serif", body: "Arial, sans-serif", script: "cursive" }[family];
  const f = getComputedStyle(el).getPropertyValue(v).trim();
  return f ? `${f}, ${fallback}` : fallback;
}

/** A print-ready PNG (1200 × 2000) of the standee. `fontScope` is any element inside the page. */
export async function standeePng(url: string, table: number, fontScope: Element, scale = 2): Promise<string> {
  const specs = texts(table);
  await Promise.all(specs.map((s) => document.fonts.load(`${s.weight} ${s.size}px ${fontOf(fontScope, s.family)}`).catch(() => [])));

  const artUrl = URL.createObjectURL(new Blob([artSvg(url)], { type: "image/svg+xml" }));
  try {
    const [art, seal] = await Promise.all([load(artUrl), load(SEAL.src)]);
    const cv = document.createElement("canvas");
    cv.width = W * scale; cv.height = H * scale;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.scale(scale, scale);
    ctx.drawImage(art, 0, 0, W, H);
    ctx.drawImage(seal, SEAL.x, SEAL.y, SEAL.size, SEAL.size);

    const withLS = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    for (const s of specs) {
      ctx.save();
      ctx.font = `${s.weight} ${s.size}px ${fontOf(fontScope, s.family)}`;
      ctx.fillStyle = s.fill;
      ctx.textAlign = s.anchor === "start" ? "left" : "center";
      ctx.textBaseline = "alphabetic";
      const ls = s.ls ?? 0;
      try { withLS.letterSpacing = `${ls}px`; } catch { /* older browser */ }
      // Canvas adds spacing after the last letter too; shift centred text back by half of it.
      const x = s.anchor === "start" ? s.x : s.x + ls / 2;
      if (s.rotate) { ctx.translate(x, s.y); ctx.rotate((s.rotate * Math.PI) / 180); ctx.fillText(s.t, 0, 0); }
      else ctx.fillText(s.t, x, s.y);
      ctx.restore();
    }
    ctx.strokeStyle = MAROON; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.stroke(new Path2D(SWASH));
    return cv.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(artUrl);
  }
}
