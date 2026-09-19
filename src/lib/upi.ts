// Parosa — UPI scan-to-pay + Google review helpers.
// Money never touches Parosa: a UPI link pays the restaurant's own UPI ID directly.

/** name@bank — the NPCI handle shape (e.g. rajdarbar@okaxis, 9876543210@ybl). */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export const cleanUpi = (v: string) => v.trim().replace(/\s+/g, "").toLowerCase();
export const isValidUpi = (v: string) => UPI_RE.test(cleanUpi(v));

// UPI apps reject some punctuation in the payee name / note, so keep it plain.
const plain = (s: string, max: number) => s.replace(/[^\p{L}\p{N} .\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);

type PayInput = { upi: string; name: string; amount?: number; note?: string };

function params({ upi, name, amount, note }: PayInput) {
  const p = [`pa=${encodeURIComponent(cleanUpi(upi))}`, `pn=${encodeURIComponent(plain(name, 40) || "Restaurant")}`];
  if (amount && amount > 0) p.push(`am=${amount.toFixed(2)}`);
  p.push("cu=INR");
  if (note) p.push(`tn=${encodeURIComponent(plain(note, 60))}`);
  return p.join("&");
}

/** Standard UPI deep link. As a QR, any UPI app (GPay, PhonePe, Paytm, BHIM…) scans it with the amount filled in. */
export const upiLink = (i: PayInput) => `upi://pay?${params(i)}`;

/** iOS doesn't reliably route the generic upi:// scheme, so offer each app's own scheme there. */
export const iosUpiApps = (i: PayInput) => {
  const q = params(i);
  return [
    { name: "GPay", href: `tez://upi/pay?${q}` },
    { name: "PhonePe", href: `phonepe://pay?${q}` },
    { name: "Paytm", href: `paytmmp://pay?${q}` },
  ];
};

/** A short payment note the owner can match in their UPI app: "Raj Darbar A-512 T5". */
export const payNote = (restaurant: string, orderNo?: string | null, table?: string | null) =>
  [restaurant, orderNo, table ? `T${table}` : ""].filter(Boolean).join(" ");

/* ---------------- Google review link ---------------- */

const REVIEW_HOSTS = ["g.page", "maps.app.goo.gl", "goo.gl", "search.google.com", "google.com", "www.google.com", "maps.google.com", "g.co"];

/** Accepts the "Ask for reviews" share link from Google Business Profile (and the other Google review URL shapes). */
export function isValidReviewUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && REVIEW_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch { return false; }
}

/** The review ask is on only when the owner saved a valid link and left the toggle on. */
export const reviewLinkOf = (r: { google_review_url?: string | null; review_prompt?: boolean | null }) =>
  r.google_review_url && r.review_prompt !== false && isValidReviewUrl(r.google_review_url) ? r.google_review_url : null;
