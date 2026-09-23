-- Parosa 0007 — menu colour theme.
-- `template` picks the LAYOUT; `theme` recolours it (saffron, ocean, chilli…).
-- null / 'default' means the template's own colours.

alter table public.restaurants
  add column if not exists theme text;
