"use client";

import type { ReactNode } from "react";
import { AppShell, type MobileTab, type NavGroup } from "@/components/app-shell";
import { alarmIdOf } from "@/lib/db/selectors";
import { MEETING_ICON } from "@/components/meetings/meeting-bits";
import { useReviewer } from "./use-reviewer";

export function ReviewerShell({ children }: { children: ReactNode }) {
  const { db, me, reviewer } = useReviewer();

  const nav: NavGroup[] = [
    {
      heading: "আমার যাচাই",
      items: [
        { href: "/reviewer/dashboard", label: "ড্যাশবোর্ড" },
        { href: "/reviewer/decisions", label: "সকল প্রতিবেদন" },
        { href: "/reviewer/queue", label: "যাচাইয়ের অপেক্ষায়" },
        { href: "/reviewer/disputes", label: "অভিযোগ" },
        { href: "/reviewer/politicians/new", label: "নতুন রাজনৈতিক কর্মী" },
        { href: "/reviewer/meetings", label: "মিটিং" },
      ],
    },
  ];
  const mobileTabs: MobileTab[] = [
    { href: "/reviewer/dashboard", label: "ড্যাশবোর্ড", icon: "M2.4 2.4h4.8v5.2H2.4zM8.8 2.4h4.8v3.2H8.8zM8.8 7.2h4.8v6.4H8.8zM2.4 9.2h4.8v4.4H2.4z" },
    { href: "/reviewer/decisions", label: "প্রতিবেদন", icon: "M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M6 9.2h4M6 11.4h2.6" },
    { href: "/reviewer/queue", label: "যাচাই", icon: "M2.6 2.6h10.8M2.6 6.4h10.8M2.6 10.2h10.8M2.6 13.4h6.4" },
    { href: "/reviewer/disputes", label: "অভিযোগ", icon: "M8 1.8 15 14H1zM8 6.2v3.4M8 11.6v.2" },
    { href: "/reviewer/politicians/new", label: "নতুন কর্মী", icon: "M8 3.2v9.6M3.2 8h9.6" },
    { href: "/reviewer/meetings", label: "মিটিং", icon: MEETING_ICON },
  ];

  return (
    <AppShell
      portal="নির্বাহী সম্পাদক পোর্টাল"
      nav={nav}
      mobileTabs={mobileTabs}
      photoKey={me?.userId ?? "reviewer"}
      settingsHref="/reviewer/settings"
      user={{ initial: reviewer?.nameBn.slice(0, 2) ?? "প", name: reviewer?.nameBn ?? "নির্বাহী সম্পাদক", role: `নির্বাহী সম্পাদক · ${alarmIdOf(db, reviewer?.id ?? "")}`, color: "#1D6FC0" }}
      footerNote="গ্রহণ করলে তথ্যটি সঙ্গে সঙ্গে প্রোফাইলে দেখা যায় · বাতিল করলে কারণসহ বন্ধ হয়ে যায়।"
    >
      {/* Portal content is Bengali; tell assistive tech so it is read correctly. */}
      <div lang="bn" className="contents">
        {children}
      </div>
    </AppShell>
  );
}
