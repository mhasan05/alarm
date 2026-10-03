"use client";

import type { ReactNode } from "react";
import { AppShell, type MobileTab, type NavGroup } from "@/components/app-shell";
import { bn } from "@/lib/db/format";
import { alarmIdOf } from "@/lib/db/selectors";
import { MEETING_ICON } from "@/components/meetings/meeting-bits";
import { useMeetingBadge } from "@/components/meetings/use-meeting-badge";
import { useStaff } from "./use-staff";

export function StaffShell({ children }: { children: ReactNode }) {
  const { db, me, staff, openTasks, counts } = useStaff();
  const tasks = openTasks.length ? bn(openTasks.length) : undefined;
  const pending = counts.pending ? bn(counts.pending) : undefined;
  const meetings = useMeetingBadge();

  const nav: NavGroup[] = [
    {
      heading: "আমার কাজ",
      items: [
        { href: "/staff/dashboard", label: "ড্যাশবোর্ড", badge: tasks, badgeColor: "#D97706" },
        { href: "/staff/submissions/new", label: "নতুন তথ্য জমা" },
        { href: "/staff/submissions", label: "আমার জমা", badge: pending, badgeColor: "#D97706" },
        { href: "/staff/area", label: "কর্মএলাকা ও নিয়ম" },
        { href: "/staff/meetings", label: "মিটিং", badge: meetings, badgeColor: "#F42A41" },
      ],
    },
  ];

  // Phone layout (from the "Field Staff — Mobile" design): the same destinations as bottom tabs.
  const mobileTabs: MobileTab[] = [
    { href: "/staff/dashboard", label: "ড্যাশবোর্ড", badge: tasks, badgeColor: "#D97706", icon: "M2.6 2.6h10.8M2.6 6.4h10.8M2.6 10.2h10.8M2.6 13.4h6.4" },
    { href: "/staff/submissions/new", label: "নতুন জমা", icon: "M8 13.4V3.2M4.4 6.8 8 3.2l3.6 3.6" },
    { href: "/staff/submissions", label: "আমার জমা", badge: pending, badgeColor: "#D97706", icon: "M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M6 9.2h4M6 11.4h2.6" },
    { href: "/staff/area", label: "এলাকা", icon: "M2.4 3.2 6 2l4 1.4 3.6-1.2v10.6L10 14l-4-1.4-3.6 1.2zM6 2v10.6M10 3.4V14" },
    { href: "/staff/meetings", label: "মিটিং", badge: meetings, badgeColor: "#F42A41", icon: MEETING_ICON },
  ];

  return (
    <AppShell
      mobileTabs={mobileTabs}
      photoKey={me?.userId ?? "staff"}
      settingsHref="/staff/settings"
      portal="মাঠকর্মী পোর্টাল"
      nav={nav}
      user={{ initial: staff?.nameBn.slice(0, 2) ?? "মা", name: staff?.nameBn ?? "মাঠকর্মী", role: `মাঠকর্মী · ${alarmIdOf(db, staff?.id ?? "")}`, color: "#D97706" }}
      footerNote="আপনার জমা দেওয়া তথ্য পর্যালোচক গ্রহণ না করা পর্যন্ত কারও প্রোফাইলে দেখা যায় না।"
    >
      {/* Portal content is Bengali; tell assistive tech so it is read correctly. */}
      <div lang="bn" className="contents">
        {children}
      </div>
    </AppShell>
  );
}
