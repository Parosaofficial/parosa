# Parosa — website (Next.js app)

Bilingual (Hindi + English) QR-menu SaaS for Indian restaurants & dhabas.

## Stack
- Next.js 16 (App Router, `src/` dir, TypeScript), Tailwind v4, ESLint.
- Planned: Supabase (Postgres + Auth + Storage + Realtime), deployed on Vercel.

## Design system — Virasat theme (heritage / vintage-desi)
All tokens live in `src/app/globals.css`. Use the Tailwind utilities they expose:
- Colors: `oxblood #6E1618`, `maroon #8C1C1C`, `parch #EFE6D1`, `cream #F8F1DF`,
  `gold/gold-hi #B58A3C/#CBA24E`, `ink #3E1012`. e.g. `bg-oxblood text-gold-hi`.
- Fonts (loaded via `next/font` in `layout.tsx`): `--font-display` (Rozha One),
  `--font-caps` (Cinzel), `--font-body` (Mukta). Use `font-display` etc. or the
  CSS vars. Devanagari renders in Rozha One + Mukta.
- Motifs: `var(--paisley)` and `var(--grain)` background-image tokens.
- The logo is `src/components/Logo.tsx` — `<Seal />` and `<Logo />` (client comp).

## Conventions
- Menus/dishes are bilingual: keep an English + Hindi name for every dish.
- Prices in ₹, numbers in the body font (not the display serif).
- Customer flow rule: **no dish detail pages** — add-to-cart happens inline on the card.

## Commands
- `npm run dev` — local dev at http://localhost:3000
- `npm run build` / `npm start` — production build & serve
- `npm run lint` — eslint
