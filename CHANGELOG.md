# Parosa — release notes

Every release is pushed to GitHub (`main`), deploys automatically to
**https://parosa.vercel.app**, and is tagged `vX.Y.Z` in git.
Minor version = new features / redesigns · patch = fixes.

## v0.4.3 — 19 Sep 2026
Hero corrections.
- The semicircle arch behind the visuals is moved down, so it no longer rises
  behind the header's Get Started button.
- Script reads "For" on the first line and "Food Businesses" on the second.
- Stand and phone restored to their v0.4.1 positions (v0.4.2 had moved the phone
  over the stand); the phone is now the front-most layer.
- The arrow under "Scan · Order · Enjoy" is nudged slightly left.

## v0.4.2 — 19 Sep 2026
Header and hero alignment.
- **Header**: logo left, Home / Features / Pricing / FAQ's centred, Login and
  Get Started right. The "For Food Businesses" script in the header is removed.
- **Hero script**: stacked "For / Food / Businesses", placed behind the phone
  layer and above it, clear of the header buttons at every screen width.
- **Arrow** under "Scan · Order · Enjoy": smaller, with a gap under the words
  and before the stand, so it reads as a pointer.
- On wide screens (1920px) the phone and arch now stay with the page content,
  so the phone overlaps the stand instead of drifting to the screen edge.

## v0.4.1 — 19 Sep 2026
Hero fixes.
- The script beside the phone now reads "For Food Businesses" (was "Good Food
  More People") and sits further left, above the gap between stand and phone.
- The arrow under "Scan · Order · Enjoy" is redrawn to sweep right and point
  into the QR stand (it used to curl downward).

## v0.4.0 — 19 Sep 2026
Pricing and FAQ redesign.
- **Pricing**: side text removed — centred "Simple, Transparent Pricing" heading,
  then the Monthly/Yearly switch, then the three plans.
- **FAQ's**: centred "Frequently Asked Questions" heading only (extra line removed);
  numbered questions with answers on a deep maroon background with a faint gold
  jaali pattern; the open question is highlighted in gold.

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
