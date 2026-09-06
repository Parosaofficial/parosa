"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { signOutOwner } from "@/lib/auth";
import type { Restaurant } from "@/lib/types";
import type { ReactNode } from "react";

const items: { label: string; href: string; group?: string; icon: ReactNode }[] = [
  { group: "Manage", label: "Overview", href: "/dashboard", icon: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></> },
  { label: "Menu & Dishes", href: "/menu-editor", icon: <path d="M4 5h16M4 12h16M4 19h10" /> },
  { label: "Tables & QR", href: "/tables", icon: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /></> },
  { label: "Orders & Bills", href: "/orders", icon: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M9 7h6M9 11h6M9 15h4" /></> },
  { label: "Analytics", href: "/analytics", icon: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="7" /><rect x="12" y="7" width="3" height="11" /><rect x="17" y="4" width="3" height="14" /></> },
  { group: "Brand", label: "Templates", href: "/templates", icon: <path d="M12 3l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15.9 7.4 17.2l.9-5.1L4.5 8.5l5.2-.8Z" /> },
  { label: "Payments", href: "/payments", icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></> },
  { label: "Settings", href: "/settings", icon: <><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></> },
];

function initials(name?: string | null) {
  if (!name) return "प";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export function Sidebar({ restaurant }: { restaurant?: Restaurant | null }) {
  const path = usePathname();
  const router = useRouter();

  const logout = async () => {
    await signOutOwner();
    router.replace("/login");
  };

  const name = restaurant?.name ?? "Your Restaurant";
  const tables = restaurant?.tables_count ?? 0;

  return (
    <aside className="db-side">
      <Link href="/dashboard" className="db-brand">
        <Seal size={44} />
        <div><div className="db-bwm">परोसा</div><div className="db-btag">Restaurant OS</div></div>
      </Link>
      <nav className="db-nav">
        {items.map((it) => (
          <span key={it.href} style={{ display: "contents" }}>
            {it.group && <span className="db-grp">{it.group}</span>}
            <Link href={it.href} className={path === it.href ? "on" : ""}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">{it.icon}</svg>
              {it.label}
            </Link>
          </span>
        ))}
      </nav>
      <div className="db-foot">
        <div className="db-rest">
          <div className="db-rc">{initials(name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="db-rn">{name}</div>
            <div className="db-rp">Parosa Free · {tables} {tables === 1 ? "table" : "tables"}</div>
          </div>
          <button onClick={logout} className="db-logout" title="Log out" aria-label="Log out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
          </button>
        </div>
      </div>
      <div className="db-scan">Scan · Serve · Savour</div>
    </aside>
  );
}
