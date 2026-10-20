"use client";

import { useEffect, useRef, useState } from "react";
import { StampCard } from "@/components/StampCard";
import { getPublicCard, rememberCard, rewardText, type PublicCard } from "@/lib/loyalty";
import "./card.css";

export function CardClient({ slug, token }: { slug: string; token: string }) {
  const [card, setCard] = useState<PublicCard | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [fresh, setFresh] = useState(false); // a stamp landed while the page was open
  const last = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const c = await getPublicCard(token);
      if (!alive) return;
      if (!c || c.slug !== slug) { setState("missing"); return; }
      if (last.current !== null && c.stamps > last.current) setFresh(true);
      last.current = c.stamps;
      setCard(c); setState("ok");
      rememberCard(slug, token);
    };
    load();
    // keep it live: the stamp appears the moment the bill is marked paid
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [slug, token]);

  if (state === "loading") return <div className="cd-page"><div className="cd-skel" /></div>;

  if (state === "missing" || !card) {
    return (
      <div className="cd-page">
        <div className="cd-miss">
          <b>Card not found</b>
          <span>This stamp card link isn&apos;t valid any more. Ask the restaurant to send it again.</span>
        </div>
      </div>
    );
  }

  const ready = card.stamps >= card.goal;
  const left = Math.max(0, card.goal - card.stamps);

  return (
    <div className="cd-page">
      <p className="cd-kick">Your stamp card</p>
      <h1 className="cd-h1">{ready ? <>Your reward is <em>ready!</em></> : <>{left} more visit{left === 1 ? "" : "s"} to <em>{rewardText(card.reward)}</em></>}</h1>

      <StampCard
        name={card.restaurant_name}
        logoUrl={card.logo_url}
        goal={card.goal}
        stamps={card.stamps}
        reward={card.reward}
        phoneTail={card.phone_tail}
        animateLast
      />

      {fresh && <div className="cd-fresh">✨ New stamp added — thank you for visiting!</div>}

      {ready ? (
        <div className="cd-claim">
          <b>Show this screen at the counter</b>
          <span>Staff will give you {rewardText(card.reward)} and start a fresh card.</span>
        </div>
      ) : null}

      {!card.enabled && <div className="cd-paused">{card.restaurant_name} has paused stamp cards for now — your stamps are safe.</div>}

      <div className="cd-how">
        <h2>How it works</h2>
        <ol>
          <li>Give your phone number when you order or pay at <b>{card.restaurant_name}</b>.</li>
          <li>Each paid bill{card.min ? ` of ₹${card.min} or more` : ""} adds a stamp — automatically.</li>
          <li>Fill all {card.goal} and get {rewardText(card.reward)}.</li>
        </ol>
        {card.rewards_redeemed > 0 && <p className="cd-past">You&apos;ve already enjoyed {card.rewards_redeemed} reward{card.rewards_redeemed > 1 ? "s" : ""} here 🎉</p>}
      </div>

      <p className="cd-tip">Tip: add this page to your home screen so your card is always one tap away.</p>
      <p className="cd-by">Stamp cards by <b>Parosa</b></p>
    </div>
  );
}
