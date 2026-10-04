"use client";

import type { ReactNode } from "react";
import { AppShell, type MobileTab, type NavGroup } from "@/components/app-shell";
import { useMe } from "@/lib/auth-client";
import { useRoot } from "@/lib/db/store";

const ICONS = {
  dashboard: "M2.4 2.4h4.8v5.2H2.4zM8.8 2.4h4.8v3.2H8.8zM8.8 7.2h4.8v6.4H8.8zM2.4 9.2h4.8v4.4H2.4z",
  add: "M8 3v10M3 8h10",
  log: "M3.6 2.4h8.8v11.2H3.6zM6 5.6h4M6 8h4M6 10.4h2.4",
  settings: "M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6",
};

/** The সুপার অ্যাডমিন's portal frame. */
export function SuperShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const root = useRoot();
  const sa = me?.superAdmin ?? root.superAdmin;

  const nav: NavGroup[] = [
    {
      heading: "সুপার অ্যাডমিন",
      items: [
        { href: "/super/dashboard", label: "প্রধান নির্বাহী সম্পাদকগণ" },
        { href: "/super/admins/new", label: "নতুন প্রধান নির্বাহী সম্পাদক" },
        { href: "/super/activity", label: "কাজের লগ" },
        { href: "/super/settings", label: "সেটিংস" },
      ],
    },
  ];
  const mobileTabs: MobileTab[] = [
    { href: "/super/dashboard", label: "অ্যাডমিন", icon: ICONS.dashboard },
    { href: "/super/admins/new", label: "নতুন", icon: ICONS.add },
    { href: "/super/activity", label: "লগ", icon: ICONS.log },
    { href: "/super/settings", label: "সেটিংস", icon: ICONS.settings },
  ];

  return (
    <AppShell
      portal="সুপার অ্যাডমিন পোর্টাল"
      nav={nav}
      mobileTabs={mobileTabs}
      photoKey={sa.id}
      settingsHref="/super/settings"
      user={{ initial: sa.name.slice(0, 2), name: sa.name, role: `সুপার অ্যাডমিন · ${sa.id}`, color: "#3B2A6B" }}
      footerNote="প্রতিটি প্রধান নির্বাহী সম্পাদকের সিস্টেম আলাদা — একজনের তথ্য অন্যজন দেখতে পান না।"
    >
      {children}
    </AppShell>
  );
}
