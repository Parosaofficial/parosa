"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/login"), 2400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main
      onClick={() => router.push("/login")}
      className="flex-1 flex items-center justify-center px-5 py-16 text-parch relative cursor-pointer"
      style={{ background: "linear-gradient(180deg, #7A1A1C 0%, #531012 100%)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: "var(--paisley)", backgroundSize: "92px", opacity: 0.9 }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: "var(--grain)", backgroundSize: "170px", opacity: 0.14, mixBlendMode: "overlay" }}
      />

      <section className="relative z-10 text-center">
        <div className="flex justify-center animate-[pfade_.8s_ease]">
          <Seal size={104} />
        </div>
        <h1
          className="mt-3 text-gold-hi emboss animate-[pfade_1s_ease]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(80px, 17vw, 140px)",
            lineHeight: 0.9,
          }}
        >
          परोसा
        </h1>
        <p
          className="text-parch"
          style={{
            fontFamily: "var(--font-caps)",
            fontWeight: 700,
            letterSpacing: "0.46em",
            fontSize: "clamp(15px, 3vw, 22px)",
            paddingLeft: "0.46em",
            marginTop: 8,
          }}
        >
          PAROSA
        </p>

        <div className="flex items-center justify-center gap-3 my-6 text-gold">
          <span className="h-px w-16" style={{ background: "linear-gradient(90deg, transparent, var(--gold))" }} />
          <span>❖</span>
          <span className="h-px w-16" style={{ background: "linear-gradient(90deg, var(--gold), transparent)" }} />
        </div>

        {/* spinner */}
        <div
          className="mx-auto mt-2 h-8 w-8 rounded-full animate-spin"
          style={{
            border: "2px solid rgba(216,178,94,0.25)",
            borderTopColor: "var(--gold-hi)",
          }}
        />
        <p className="mt-4 text-xs uppercase text-gold-soft" style={{ letterSpacing: "0.22em", fontFamily: "var(--font-caps)" }}>
          Entering…
        </p>
      </section>

      <style>{`@keyframes pfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </main>
  );
}
