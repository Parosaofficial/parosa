# Parosa — release notes

Every release is pushed to GitHub (`main`), deploys automatically to
**https://parosa.vercel.app**, and is tagged `vX.Y.Z` in git.
Minor version = new features / redesigns · patch = fixes.

## v0.7.1 - 24 Sep 2026
The dhaba's own logo on the table QR, and a second standee design.
- **Fixed:** the table QR standee showed the Parosa seal, not the restaurant's
  uploaded logo. It now shows the dhaba's own logo (a monogram if none is set).
- **Two standee designs**, picked from a toggle above the grid (choice remembered):
  - **Classic** - logo and name in a row on top, QR, table number, and a small
    "Powered by Parosa" line at the bottom.
  - **Branded** - the restaurant's logo large and centred with its name on top,
    the QR below, then a maroon "परोसा · PAROSA · Scan · Serve · Savour" band at
    the foot. Your identity up top, our branding underneath.

## v0.7.0 - 24 Sep 2026
Clear legal pages, a support address, and a POS built for a phone.
- **Terms and Privacy rewritten** in plain English. Each page now opens with an
  "In short" summary, then says exactly what happens: 0% commission, your content
  stays yours, food and payment are between you and your customer, row-level
  security keeps every restaurant's data apart, and how to get your data shown,
  corrected, exported or deleted. Added sections on governing law, what we will
  never do, your customers' data and what happens if Parosa ever shuts down.
- **One support address everywhere:** support.parosa@gmail.com, on both legal
  pages, in their footers and on the landing page.
- **Today's staff code** sits in a plain cream card now - the patterned maroon
  background is gone.
- **Staff POS rebuilt for phones.** Compact header, the table number always
  visible with the customer fields folded behind "+ Add customer details",
  a full-width search, two dishes across with a - 1 + stepper right on the tile,
  and a running total bar that opens the order as a bottom sheet where staff
  review, adjust and place it. Desktop is unchanged.
- Fixed: "+ New order" on the order-placed screen was maroon on maroon.

## v0.6.1 - 23 Sep 2026
Same category pills everywhere, and a header that gets out of the way.
- Every design now uses the Parosa category strip: soft rounded boxes, the one
  you're reading filled in the template's own colour, and an **All** chip in front
  that jumps back to the top. Virasat's square tabs and Transparent's underline
  are gone.
- The sticky header shrinks as soon as the guest scrolls - the logo and buttons
  get smaller, the "Table 1 - Scan & order" line folds away and the pills tighten,
  so about a third of the header comes back as menu. It grows again at the top.

## v0.6.0 — 23 Sep 2026
Two Parosa-made menu designs.
- **Parosa** (new default): our own signature look. Centred brand header with the
  restaurant's logo, name and a cart button that carries a live item count, a row
  of rounded category pills starting with **All**, an "Our Specialties" opener with
  a handwritten *Good Food Brighter People* accent, wide white photo cards with an
  **Add +** button, and a warm "Taste - A More Connected India" closing banner.
  No bottom navigation bar. New restaurants start on this design.
- **Transparent**: frosted-glass cards on a soft gradient. Logo and name, search
  and cart on top, a plain category strip with the active one underlined, and a
  two-across grid of glass cards with round photos and a floating price chip.
- Both work with every colour theme from v0.5.0.

## v0.5.0 — 23 Sep 2026
Menu colour themes.
- After choosing a template, owners pick a **colour** for their menu: As designed,
  Saffron (orange), Chilli (red), Ocean (blue & white), Emerald, Grape, Rose or
  Charcoal (black & gold). The template keeps the layout and fonts; the theme
  recolours the header, buttons, prices and background tints. Dark designs (Noir)
  take the brand colours but keep their dark background.
- Saved per restaurant (`restaurants.theme`, migration 0007) and applied to the
  live guest menu; "Preview on my menu" opens the real menu in the chosen colour.
- Already in place and verified: the guest menu header shows the restaurant's own
  logo and name, and tapping Add turns into a − 1 + stepper.

## v0.4.17 — 23 Sep 2026
- The avatar beside the notification bell now shows the restaurant's own
  uploaded logo (a round monogram of its initials until a logo is uploaded),
  with no dropdown arrow. It links to Settings, where the logo is uploaded.

## v0.4.16 — 22 Sep 2026
Customers page rebuilt.
- **Bug**: the page used .or-stat / .or-search from the Orders stylesheet without
  importing it, so the stat cards rendered as bare text and the search icon blew
  up to a giant magnifier. Customers now has its own complete stylesheet.
- Four stat cards: customers, repeat rate, lifetime collected, average per customer.
- Filter tabs (All / Regular / Repeat / New) with counts, search, and sort by
  recent visit, highest spend or most visits.
- Customer cards with a coloured initials avatar, tier badge, favourite dish,
  visits, spend (and any unpaid amount) and "3 days ago" style last visit.
- Expanding a customer shows WhatsApp and Call buttons, first-visit date and the
  full order history (items, table, staff/QR, amount, payment).
- Export CSV of the current list; friendlier empty and no-results states;
  responsive down to phones.

## v0.4.15 — 22 Sep 2026
- No scrollbar inside the app's own panels. The sidebar menu (and the
  notifications list, order picker and bill dialogs) still scroll with the
  wheel, trackpad, touch and keyboard, but no bar is drawn.

## v0.4.14 — 22 Sep 2026
- "Owner / Staff" tabs and "Welcome back" now use Mukta — the same font as
  "Restaurant Partner Portal" (v0.4.13's Playfair is dropped from the login).
- Pricing amounts on the homepage (₹99 / ₹299 / ₹499) use the same font.

## v0.4.13 — 22 Sep 2026
Login page.
- The whole sign-in view now fits one screen (no scrolling) down to ~700px-tall
  windows and on phones — the "By continuing you agree to…" line included.
  Tighter logo, spacing and field sizes; the card is centred safely so the long
  signup steps still scroll normally with their top reachable.
- "Owner / Staff" tabs and "Welcome back" now use Playfair Display instead of
  Rozha One, whose Latin letters read too heavy (same serif as the landing page).

## v0.4.12 — 19 Sep 2026
- Phone-in-hand raised 24px so the whole phone — including its bottom menu bar
  and bezel — is visible on the first screen of a ~760px-tall browser window
  (on 1536-wide screens its bottom sat just below the window edge).
- "For / Food Businesses" refitted inside the arch, left of the phone and above
  the stand (slightly smaller), so nothing overlaps at any laptop size.

## v0.4.11 — 19 Sep 2026
Hero text rhythm, phone position, solid feature strip.
- Get Started / See Live Demo moved down 23px and the "No App Required · Setup in
  Minutes · 0% Commission" ticks down 47px, with even spacing under the headline
  (headline itself unchanged). Phones keep the tighter spacing.
- Phone-in-hand slightly higher (19px) and slightly left (12px), 4px from the stand.
- Feature strip (Digital Menu, QR Generation, …) now has a solid white background
  with a soft shadow instead of the see-through-looking cream.

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
