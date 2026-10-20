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

/** The "Finish setting up" list (Settings home + Overview). `to` is the Settings section that fixes it. */
export type SetupStep = { done: boolean; yes: string; todo: string; to: "profile" | "location" | "contact" | "payments" | "licences" };

export function setupChecklist(r: Restaurant): SetupStep[] {
  return [
    { done: !!r.logo_url, yes: "Logo uploaded", todo: "Upload your logo", to: "profile" },
    { done: !!r.address, yes: "Address added", todo: "Add your address", to: "location" },
    { done: !!r.phone, yes: "Phone number added", todo: "Add a phone number", to: "contact" },
    { done: !!r.upi_id, yes: "UPI ID added", todo: "Add your UPI ID", to: "payments" },
    { done: !!r.google_review_url, yes: "Google review link added", todo: "Add Google review link", to: "payments" },
    { done: !!r.gstin, yes: "GSTIN added", todo: "Add GSTIN", to: "licences" },
    { done: !!r.fssai, yes: "FSSAI number added", todo: "Add FSSAI number", to: "licences" },
  ];
}
