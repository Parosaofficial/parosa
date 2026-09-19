import { createClient } from "@supabase/supabase-js";

// Parosa's Supabase project. The anon key is public by design — it is sent to
// every visitor's browser anyway, and the data is protected by the RLS rules in
// supabase/migrations, not by hiding this key. Keeping it here means a deploy
// (Vercel or anywhere) works with no setup. Environment variables still win, so
// pointing a build at another project is just a matter of setting them.
// NEVER put the service_role key or an sbp_ access token in this file.
const PAROSA_URL = "https://cyyyrunhjwnadjnsrtog.supabase.co";
const PAROSA_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5eXlydW5oanduYWRqbnNydG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjAxMDAsImV4cCI6MjEwNDA5NjEwMH0.WHFV9oZqomvykiQbmN_yI9Mjh9NBiLd-cRngeYwoJAk";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || PAROSA_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PAROSA_ANON_KEY;

/** Browser + server Supabase client (anon key — safe for the client). */
export const supabase = createClient(url, anon);
