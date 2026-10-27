import type { ReactNode } from "react";
import type { Entry } from "@/lib/reserve";
import "./skyfloor.css";

/*
 * The sky-grid floor shared by Seat Reserve (owner) and the booking page
 * (customer): each hall is a soft blue grid block with an Entry marker on the
 * side the owner picked; its tables sit in equal slots.
 */

export const ENTRY_LABEL: Record<Entry, string> = { top: "Top", bottom: "Bottom", left: "Left", right: "Right" };

export function SkyHall({ name, entry, head, children, compact = false }: {
  name: string;
  entry: Entry;
  /** extra controls next to the hall name (owner only) */
  head?: ReactNode;
  children: ReactNode;
  /** phone-width grid: three slots per row */
  compact?: boolean;
}) {
  return (
    <section className={`sky-hall entry-${entry}${compact ? " compact" : ""}`} aria-label={`${name}, entry on the ${entry}`}>
      <div className="sky-hh"><b>{name}</b>{head}</div>
      <div className="sky-slots">{children}</div>
      <span className="sky-door" aria-hidden="true"><i>🚪</i>Entry</span>
    </section>
  );
}

/** One slot on the grid; a family sofa takes two. */
export function SkySlot({ wide, className = "", children, ...rest }: { wide?: boolean; className?: string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`sky-slot${wide ? " wide" : ""} ${className}`} {...rest}>{children}</button>;
}
