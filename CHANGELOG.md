# Parosa — release notes

Every release is pushed to GitHub (`main`), deploys automatically to
**https://parosa.vercel.app**, and is tagged `vX.Y.Z` in git.
Minor version = new features / redesigns · patch = fixes.

## v0.4.10 — 19 Sep 2026
- Phone-in-hand moved closer to the QR stand: 16px gap (was 44px), so it no
  longer sits in the screen corner.
- Phone kept at its full 390px on every laptop size — no shrinking.

## v0.4.9 — 19 Sep 2026
- Phone-in-hand image slightly larger: 390px (was 350px) on 1536px screens and
  wider; scales to ~366px on 1440px laptops so the phone body never clips.
  Same 44px gap to the stand; still the top layer.

## v0.4.8 — 19 Sep 2026
Phone on the top layer.
- The phone-in-hand image is now the top layer of the page (above the arch,
  scripts, stand and the feature strip); only the sticky header stays above it,
  so the menu is never covered while scrolling.
- It is no longer clipped at the bottom of the hero: it comes down 22px over the
  feature strip's empty top edge (no strip content is covered).
- The long bottom fade is replaced by a short one at the photo's cut wrist edge,
  so the phone looks crisp and in front.

## v0.4.7 — 19 Sep 2026
Hero corrections.
- QR stand moved 30px to the left.
- Phone-in-hand restored to its original size (350px) — v0.4.6 had shrunk it on
  narrower screens; the 44px gap to the stand is kept.
- Smaller arrow under "Scan · Order · Enjoy" (46px, was 66px), still pointing
  at the stand.

## v0.4.6 — 19 Sep 2026
Hero spacing.
- A constant 44px gap between the QR stand and the phone at every desktop width
  (the phone is now positioned from the stand's edge, not the screen's edge, and
  scales down a little on narrower laptops so it always fits). ~17px on phones.
- Semicircle moved slightly up (38px below the header buttons, was 55px).
- Left-side headline and text moved up slightly (44px).
- QR stand unchanged on the 1536px screen.

## v0.4.5 — 19 Sep 2026
QR stand shadow fix.
- The stand image carried the photo's grey studio haze and cast shadow, which
  showed as a grey box beside the stand with a hard edge, and the stand floated
  38px above that shadow. Re-cut the stand cleanly (no background at all).
- One soft contact shadow now sits directly under the stand's base; the old
  offset drop-shadow is removed.
- The stand stays in exactly the same place as before (within 1–2px).

## v0.4.4 — 19 Sep 2026
Arch and script placement.
- The semicircle arch now sits directly under the header's Login / Get Started
  (its right edge lines up with Get Started) with a 55px gap below them.
- "For / Food Businesses" is placed inside the arch's crown — fully within the
  curve and clear of the stand and the phone (checked at 1280, 1536, 1920 px
  and on phones).
- The QR stand is unchanged — same position as the first release.

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
