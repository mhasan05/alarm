"use client";

import type { ReactNode } from "react";
import { AppShell, type MobileTab, type NavGroup } from "@/components/app-shell";
import { useMe } from "@/lib/auth-client";
import { MEETING_ICON } from "@/components/meetings/meeting-bits";
import { alarmIdOf } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";

export function PoliticianShell({ children }: { children: ReactNode }) {
  const db = useDb();
  const me = useMe();
  const profile = me?.profile;

  const nav: NavGroup[] = [
    {
      items: [
        { href: "/politician/dashboard", label: "ড্যাশবোর্ড" },
        { href: "/politician/add-activity", label: "কাজ যোগ করুন" },
        { href: "/politician/reports", label: "আমার রিপোর্ট" },
        { href: "/politician/disputes", label: "অভিযোগ" },
        { href: "/politician/meetings", label: "মিটিং" },
      ],
    },
  ];
  // Phone layout: the same destinations as bottom tabs.
  const mobileTabs: MobileTab[] = [
    { href: "/politician/dashboard", label: "ড্যাশবোর্ড", icon: "M2.4 2.4h4.8v5.2H2.4zM8.8 2.4h4.8v3.2H8.8zM8.8 7.2h4.8v6.4H8.8zM2.4 9.2h4.8v4.4H2.4z" },
    { href: "/politician/add-activity", label: "কাজ যোগ", icon: "M8 3v10M3 8h10" },
    { href: "/politician/reports", label: "আমার রিপোর্ট", icon: "M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M6 9.2h4M6 11.4h2.6" },
    { href: "/politician/disputes", label: "অভিযোগ", icon: "M8 1.8 15 14H1zM8 6.2v3.4M8 11.6v.2" },
    { href: "/politician/meetings", label: "মিটিং", icon: MEETING_ICON },
  ];

  return (
    <AppShell
      mobileTabs={mobileTabs}
      photoKey={me?.userId ?? "politician"}
      settingsHref="/politician/settings"
      portal="রাজনৈতিক কর্মী পোর্টাল"
      nav={nav}
      user={{ initial: profile?.initial ?? "র", name: profile?.name ?? "রাজনৈতিক কর্মী", role: profile ? `রাজনৈতিক কর্মী · ${alarmIdOf(db, profile.id)}` : "রাজনৈতিক কর্মী" }}
    >
      {/* Portal content is Bengali; tell assistive tech so it is read correctly. */}
      <div lang="bn" className="contents">
        {children}
      </div>
    </AppShell>
  );
}
