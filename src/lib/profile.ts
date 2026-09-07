// Parosa — restaurant profile completeness (drives the Settings warning).
import type { Restaurant } from "./types";

export type ProfileIssue = { key: string; label: string; hint: string };

export function missingProfile(r: Restaurant): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  if (!r.logo_url) out.push({ key: "logo", label: "Restaurant logo", hint: "Upload your logo so it shows on your menu and bills instead of a plain placeholder." });
  if (!r.address) out.push({ key: "address", label: "Address", hint: "Prints on your customer bill (PDF & WhatsApp)." });
  if (!r.phone) out.push({ key: "phone", label: "Phone number", hint: "So guests and Parosa can reach you." });
  if (!r.gstin) out.push({ key: "gstin", label: "GSTIN", hint: "Shown on the tax bill. Add it if you're GST-registered." });
  if (!r.fssai) out.push({ key: "fssai", label: "FSSAI licence", hint: "Food businesses must display the FSSAI number on bills." });
  return out;
}
