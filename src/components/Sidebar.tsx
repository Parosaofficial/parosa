"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { signOutOwner } from "@/lib/auth";
import { planById } from "@/lib/plans";
import { missingProfile } from "@/lib/profile";
import type { Restaurant } from "@/lib/types";

type Item = { label: string; href: string; icon: ReactNode };

const I = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  orders: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
  menu: <path d="M4 5h16M4 12h16M4 19h10" />,
  tables: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /></>,
  templates: <path d="M12 3l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15.9 7.4 17.2l.9-5.1L4.5 8.5l5.2-.8Z" />,
  customers: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></>,
  loyalty: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m7 12 2 2 3-4M15 12h2" /></>,
  analytics: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="7" /><rect x="12" y="7" width="3" height="11" /><rect x="17" y="4" width="3" height="14" /></>,
  payments: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
  staff: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="10" r="2" /><path d="M5 16.5c.4-1.4 1.8-2.2 3.5-2.2s3.1.8 3.5 2.2" /><path d="M14.5 9h4M14.5 13h4" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
};

// Grouped by the shape of a working day.
const GROUPS: { name: string; items: Item[] }[] = [
  { name: "Today", items: [
    { label: "Overview", href: "/dashboard", icon: I.overview },
    { label: "Orders & Bills", href: "/orders", icon: I.orders },
  ] },
  { name: "Menu", items: [
    { label: "Menu & Dishes", href: "/menu-editor", icon: I.menu },
    { label: "Tables & QR", href: "/tables", icon: I.tables },
    { label: "Templates", href: "/templates", icon: I.templates },
  ] },
  { name: "Guests", items: [
    { label: "Customers", href: "/customers", icon: I.customers },
    { label: "Loyalty", href: "/loyalty", icon: I.loyalty },
  ] },
  { name: "Business", items: [
    { label: "Analytics", href: "/analytics", icon: I.analytics },
    { label: "Payments", href: "/payments", icon: I.payments },
    { label: "Staff & Admin", href: "/staff", icon: I.staff },
  ] },
];
const SETTINGS: Item = { label: "Settings", href: "/settings", icon: I.settings };

// Phone bottom bar: the four daily jobs + "More" for everything else.
const TABS: Item[] = [
  { label: "Home", href: "/dashboard", icon: I.overview },
  { label: "Orders", href: "/orders", icon: I.orders },
  { label: "Menu", href: "/menu-editor", icon: I.menu },
  { label: "Guests", href: "/customers", icon: I.customers },
];

function initials(name?: string | null) {
  if (!name) return "प";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

export function Sidebar({ restaurant }: { restaurant?: Restaurant | null }) {
  const path = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // close the phone "More" sheet with Escape (picking a link closes it too)
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const logout = async () => {
    await signOutOwner();
    router.replace("/login");
  };

  const name = restaurant?.name ?? "Your Restaurant";
  const tables = restaurant?.tables_count ?? 0;
  const planName = planById(restaurant?.plan).name;
  const issues = restaurant ? missingProfile(restaurant).length : 0;
  const isOn = (href: string) => path === href || (href === "/settings" && path.startsWith("/settings"));
  const inMore = !TABS.some((t) => isOn(t.href));

  const warn = (href: string) =>
    href === "/settings" && issues > 0 ? <span className="db-navwarn" title={`${issues} thing${issues > 1 ? "s" : ""} to complete`}>{issues}</span> : null;

  return (
    <>
      <aside className="db-side">
        <Link href="/dashboard" className="db-brand">
          <Seal size={44} />
          <div><div className="db-bwm">परोसा</div><div className="db-btag">Restaurant OS</div></div>
        </Link>
        <nav className="db-nav" aria-label="Main">
          {GROUPS.map((g) => (
            <span key={g.name} style={{ display: "contents" }}>
              <span className="db-grp">{g.name}</span>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className={isOn(it.href) ? "on" : ""}>
                  <Icon>{it.icon}</Icon>{it.label}
                </Link>
              ))}
            </span>
          ))}
          <Link href={SETTINGS.href} className={`push${isOn(SETTINGS.href) ? " on" : ""}`}>
            <Icon>{SETTINGS.icon}</Icon>{SETTINGS.label}{warn(SETTINGS.href)}
          </Link>
        </nav>
        <div className="db-foot">
          <div className="db-rest">
            <div className="db-rc">{initials(name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-rn">{name}</div>
              <div className="db-rp">Parosa {planName} · {tables} {tables === 1 ? "table" : "tables"}</div>
            </div>
            <button onClick={logout} className="db-logout" title="Log out" aria-label="Log out"><Icon>{I.logout}</Icon></button>
          </div>
        </div>
      </aside>

      {/* phone */}
      <nav className="db-tabs" aria-label="Main">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={isOn(t.href) ? "on" : ""}><Icon>{t.icon}</Icon>{t.label}</Link>
        ))}
        <button type="button" className={inMore ? "on" : ""} onClick={() => setMoreOpen(true)} aria-expanded={moreOpen}>
          <Icon>{I.more}</Icon>More{issues > 0 && <span className="dot">{issues}</span>}
        </button>
      </nav>
      <div className="db-more" hidden={!moreOpen} onClick={() => setMoreOpen(false)}>
        <div className="db-sheet" role="dialog" aria-label="More pages" onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).closest("a")) setMoreOpen(false); }}>
          <div className="hd"><b>{name}</b><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">×</button></div>
          {GROUPS.map((g) => (
            <div key={g.name}>
              <div className="grp">{g.name}</div>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className={isOn(it.href) ? "on" : ""}><Icon>{it.icon}</Icon>{it.label}</Link>
              ))}
            </div>
          ))}
          <div className="grp">Account</div>
          <Link href={SETTINGS.href} className={isOn(SETTINGS.href) ? "on" : ""}><Icon>{SETTINGS.icon}</Icon>{SETTINGS.label}{warn(SETTINGS.href)}</Link>
          <button type="button" className="ln" onClick={logout}><Icon>{I.logout}</Icon>Log out</button>
        </div>
      </div>
    </>
  );
}
