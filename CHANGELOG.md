# Parosa — release notes

Every release is pushed to GitHub (`main`), deploys automatically to
**https://parosa.vercel.app**, and is tagged `vX.Y.Z` in git.
Minor version = new features / redesigns · patch = fixes.

## v0.3.0 — 19 Sep 2026
Landing page refinements.
- **How it works** is now scroll-driven: the section pins in place and scrolling
  fills the line from *Create Your Menu* to *Receive Orders* (reverses on scroll up).
  Centred heading; steps show icon + title only.
- **Built for every food business**: side text removed — a full-width row of
  moving 9:16 photo frames.
- **Reviews**: centred heading; larger, pure-white review cards.
- Known: frame photos are low-res placeholders; the three reviews are sample text
  from the design mock-up and must be replaced with real owner quotes.

## v0.2.0 — 19 Sep 2026
New landing page from the Parosa design.
- Hero with the QR table-stand and phone-in-hand (backgrounds removed), serif
  headline, script accents; feature strip.
- How it works with animated progress; moving photo frames; moving review cards.
- Pricing with Monthly/Yearly (real plans: ₹99 / ₹299 / ₹499); FAQ.
- "Let's Build a More Connected Food India" banner with working buttons —
  Contact Sales opens a Gmail draft; footer with logo and social icons.

## v0.1.0 — 19 Sep 2026
First version live on Vercel.
- Owner dashboard (menu, tables & QR, orders & bills, customers, staff,
  analytics, templates, payments, settings) and staff order-taking (POS).
- Guest QR menu with five templates; live orders with sound; WhatsApp bills.
- UPI scan-to-pay QR on bills + guest pay page; Google review links.
- Every screen has its own URL (`/login`, `/signup/...`, `/templates`, ...).
- Supabase: full migration history, per-owner security, photo storage locked down.
