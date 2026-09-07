import Link from "next/link";
import type { ReactNode } from "react";
import { Seal } from "@/components/Logo";
import "@/app/legal.css";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
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
        <p className="lgl-updated">Last updated {updated}</p>
        <div className="lgl-prose">{children}</div>
        <p className="lgl-note">This is a plain-language summary provided for convenience and is not legal advice. Please have your own legal counsel review these terms before relying on them commercially.</p>
        <Link href="/" className="lgl-home">← Back to home</Link>
      </main>
      <footer className="lgl-foot">
        <div className="lgl-wrap">© {new Date().getFullYear()} Parosa · Scan · Serve · Savour</div>
      </footer>
    </div>
  );
}
