import type { Metadata } from "next";
import { Rozha_One, Cinzel, Mukta, Archivo } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Parosa Virasat type system
const display = Rozha_One({
  weight: "400",
  subsets: ["latin", "devanagari"],
  variable: "--font-rozha",
  display: "swap",
});
const caps = Cinzel({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});
const body = Mukta({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "devanagari"],
  variable: "--font-mukta",
  display: "swap",
});
// Editorial type for the marketing site + login (Parosa Modernist)
const archivo = Archivo({
  weight: ["400", "500", "600", "800", "900"],
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});
// Self-hosted: Google now serves this font from URLs next/font/google can't read.
const notoDev = localFont({
  src: [
    { path: "../fonts/NotoSerifDevanagari-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/NotoSerifDevanagari-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-noto-dev",
  display: "swap",
});

export const metadata: Metadata = {
  // Each page sets its own title; the tab reads e.g. "Orders & Bills · Parosa".
  title: { default: "Parosa — QR menus & billing for Indian restaurants", template: "%s · Parosa" },
  description:
    "स्वाद में देसीपन, मेन्यू में पहचान — the QR menu with a heritage heart.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${caps.variable} ${body.variable} ${archivo.variable} ${notoDev.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
