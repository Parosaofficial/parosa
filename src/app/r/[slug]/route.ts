import { supabase } from "@/lib/supabase";
import { reviewLinkOf } from "@/lib/upi";

/*
 * www.parosa.food/r/<restaurant> → that restaurant's Google review page.
 * Used by the "Rate us on Google" button on WhatsApp bills (a template button
 * must point at one fixed site) and by the review QR on the receipt.
 * No review link set yet → Google Maps search for the restaurant instead.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase.from("restaurants").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  if (!data) return Response.redirect("https://www.parosa.food/", 302);
  const r = data as { name: string; city?: string | null; google_review_url?: string | null; review_prompt?: boolean | null; plan?: string | null; created_at?: string };
  const link = reviewLinkOf(r);
  if (link) return Response.redirect(link, 302);
  const q = encodeURIComponent([r.name, r.city].filter(Boolean).join(" "));
  return Response.redirect(`https://www.google.com/maps/search/?api=1&query=${q}`, 302);
}
