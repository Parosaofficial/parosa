// Parosa — photos through the Cloudflare image CDN (cloudflare/img-worker.js).
//
// Dish photos and logos are stored in Supabase Storage. Guests load them from
// img.parosa.food instead, so Cloudflare's cache serves them and Supabase's
// bandwidth stays near zero. Stored URLs are untouched; they're rewritten when
// shown, so old photos go through the CDN too.
//
// LIVE_CDN stays "" until img.parosa.food answers; then it's set to that
// address. NEXT_PUBLIC_IMAGE_CDN overrides it ("" switches the CDN off and
// photos load straight from Supabase again).

const SUPABASE_PHOTOS = "https://cyyyrunhjwnadjnsrtog.supabase.co/storage/v1/object/public/photos/";
const LIVE_CDN = "";
const IMAGE_CDN = (process.env.NEXT_PUBLIC_IMAGE_CDN ?? LIVE_CDN).replace(/\/+$/, "");

/** The address to show a stored photo from: the CDN for our own photos, anything else unchanged. */
export function cdnImage(url: string): string;
export function cdnImage(url: string | null | undefined): string | null;
export function cdnImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!IMAGE_CDN || !url.startsWith(SUPABASE_PHOTOS)) return url;
  return `${IMAGE_CDN}/${url.slice(SUPABASE_PHOTOS.length)}`;
}
