-- ============================================================
-- Parosa — GPS location from the new 3-step signup
--
-- "Use current location" on /signup/address fills the address from the
-- phone's GPS. We keep the exact point (for future geofencing / "near me")
-- and the parts of the address an owner never types: area, district, state.
--
-- Safe to run more than once.
-- ============================================================

alter table restaurants
  add column if not exists area      text,
  add column if not exists district  text,
  add column if not exists state     text,
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

-- Make PostgREST see the new columns straight away.
notify pgrst, 'reload schema';
