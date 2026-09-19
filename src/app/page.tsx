import { Mr_Dafoe, Playfair_Display } from "next/font/google";
import { Landing } from "./Landing";

// Landing-only fonts, so the dashboard doesn't download them.
const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-lp-serif", display: "swap" });
const script = Mr_Dafoe({ subsets: ["latin"], weight: "400", variable: "--font-lp-script", display: "swap" });

export default function Page() {
  return <Landing fontClass={`${serif.variable} ${script.variable}`} />;
}
