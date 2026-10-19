import type { Metadata } from "next";
import { Great_Vibes } from "next/font/google";

// Script lettering on the Heritage standee ("Good Food Brighter People").
const script = Great_Vibes({ weight: "400", subsets: ["latin"], variable: "--font-script", display: "swap" });

export const metadata: Metadata = { title: "Tables & QR" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={script.variable} style={{ display: "contents" }}>{children}</div>;
}
