import Link from "next/link";
import { Seal } from "@/components/Logo";

export function Placeholder({ hi, en }: { hi: string; en: string }) {
  return (
    <main
      className="flex-1 flex items-center justify-center px-5 py-16 text-parch relative"
      style={{ background: "linear-gradient(180deg,#7A1A1C,#531012)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: "var(--paisley)", backgroundSize: "92px", opacity: 0.85 }}
      />
      <section className="relative z-10 text-center max-w-md">
        <div className="flex justify-center">
          <Seal size={72} />
        </div>
        <h1 className="mt-4 text-gold-hi" style={{ fontFamily: "var(--font-display)", fontSize: 52 }}>
          {hi}
        </h1>
        <p className="text-parch" style={{ fontFamily: "var(--font-caps)", letterSpacing: "0.2em", fontSize: 13 }}>
          {en}
        </p>
        <div
          className="mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest"
          style={{ borderColor: "var(--gold)", color: "var(--gold-hi)" }}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--gold-hi)" }} />
          Being built next
        </div>
        <p className="mt-5 text-sm text-gold-soft leading-relaxed">
          The design for this screen is approved. It&apos;s being ported into the real app —
          the customer <Link href="/raj-darbar/menu/1" className="text-gold-hi underline">menu is already live</Link>.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-gold-hi text-sm underline">← Back to home</Link>
        </p>
      </section>
    </main>
  );
}
