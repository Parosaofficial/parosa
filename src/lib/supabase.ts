import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser + server Supabase client (anon key — safe for the client). */
export const supabase = createClient(url, anon);
