import Link from "next/link";
import type { ReactNode } from "react";
import { Seal } from "@/components/Logo";
import "@/app/legal.css";

/** One address for every legal / support question, used across the site. */
export const SUPPORT_EMAIL = "support.parosa@gmail.com";

export function LegalShell({
  title,
  updated,
  tldr,
  children,
}: {
  title: string;
  updated: string;
  /** the plain-English summary shown before the long version */
  tldr?: string[];
  children: ReactNode;
}) {
  return (
    <div className="lgl">
      <header className="lgl-nav">
        <div className="lgl-wrap lgl-navrow">
          <Link href="/" className="lgl-brand">
            <Seal size={34} />
            <span><b>परोसा</b><i>PAROSA</i></span>
          </Link>
          <nav className="lgl-navlinks">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login" className="lgl-cta">Login</Link>
          </nav>
        </div>
      </header>

      <main className="lgl-wrap lgl-body">
        <p className="lgl-kicker">Legal</p>
        <h1>{title}</h1>
        <p className="lgl-updated">Last updated {updated} · about a 5-minute read</p>

        {tldr && tldr.length > 0 && (
          <section className="lgl-tldr" aria-label="Summary">
            <h2>In short</h2>
            <ul>{tldr.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="fine">This summary is here to be helpful. The full text below is what actually applies.</p>
          </section>
        )}

        <div className="lgl-prose">{children}</div>

        <aside className="lgl-help">
          <b>Still not clear?</b>
          <span>Write to us and we will explain it in your own words — Hindi or English.</span>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </aside>

        <p className="lgl-note">This is a plain-language summary provided for convenience and is not legal advice. Please have your own legal counsel review these terms before relying on them commercially.</p>
        <Link href="/" className="lgl-home">← Back to home</Link>
      </main>

      <footer className="lgl-foot">
        <div className="lgl-wrap">
          © {new Date().getFullYear()} Parosa · Scan · Serve · Savour · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}
