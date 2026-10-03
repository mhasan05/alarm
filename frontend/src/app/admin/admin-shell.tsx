"use client";

import type { ReactNode } from "react";
import { AppShell, type MobileTab, type NavGroup } from "@/components/app-shell";
import { bn } from "@/lib/db/format";
import { alarmIdOf } from "@/lib/db/selectors";
import { openDisputes } from "@/lib/db/selectors";
import { MEETING_ICON } from "@/components/meetings/meeting-bits";
import { useMeetingBadge } from "@/components/meetings/use-meeting-badge";
import { useAdmin } from "./use-admin";

const ICONS = {
  dashboard: "M2.4 2.4h4.8v5.2H2.4zM8.8 2.4h4.8v3.2H8.8zM8.8 7.2h4.8v6.4H8.8zM2.4 9.2h4.8v4.4H2.4z",
  politicians: "M6 7.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM1.8 13.4c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4M10.8 7a2 2 0 1 0 0-4M12.2 9.6c1.3.5 2 1.6 2 3.4",
  staff: "M4 3h8v11H4zM6 2h4v2H6zM6 7.2h4M6 9.6h4M6 12h2.4",
  disputes: "M8 1.8 15 14H1zM8 6.2v3.4M8 11.6v.2",
  reports: "M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M6 9.2h4M6 11.4h2.6",
};

export function AdminShell({ children }: { children: ReactNode }) {
  const { db, admin } = useAdmin();
  const disputes = openDisputes(db).length;
  const open = disputes ? bn(disputes) : undefined;
  const meetings = useMeetingBadge();

  const nav: NavGroup[] = [
    {
      heading: "MAIN",
      items: [
        { href: "/admin/dashboard", label: "ড্যাশবোর্ড" },
        { href: "/admin/politicians", label: "রাজনৈতিক কর্মী" },
        { href: "/admin/field-staff", label: "মাঠকর্মী" },
        { href: "/admin/reviewers", label: "পর্যালোচক" },
        { href: "/admin/disputes", label: "অভিযোগ", badge: open, badgeColor: "#F42A41" },
        { href: "/admin/ai-review", label: "এআই বিশ্লেষণ" },
        { href: "/admin/reports", label: "প্রতিবেদন" },
        { href: "/admin/meetings", label: "মিটিং", badge: meetings, badgeColor: "#D97706" },
      ],
    },
    { heading: "SYSTEM", items: [{ href: "/admin/settings", label: "সেটিংস" }] },
  ];

  const mobileTabs: MobileTab[] = [
    { href: "/admin/dashboard", label: "ড্যাশবোর্ড", icon: ICONS.dashboard },
    { href: "/admin/politicians", label: "রাজনৈতিক কর্মী", icon: ICONS.politicians },
    { href: "/admin/field-staff", label: "মাঠকর্মী", icon: ICONS.staff },
    { href: "/admin/disputes", label: "অভিযোগ", badge: open, badgeColor: "#F42A41", icon: ICONS.disputes },
    { href: "/admin/reports", label: "প্রতিবেদন", icon: ICONS.reports },
    { href: "/admin/meetings", label: "মিটিং", badge: meetings, badgeColor: "#D97706", icon: MEETING_ICON },
  ];

  return (
    <AppShell
      portal="অ্যাডমিন পোর্টাল"
      nav={nav}
      mobileTabs={mobileTabs}
      photoKey={admin?.id ?? "admin"}
      settingsHref="/admin/settings?tab=general"
      user={{ initial: admin?.initials ?? "AD", name: admin?.name ?? "Admin", role: `অ্যাডমিন · ${alarmIdOf(db, admin?.id ?? "")}`, color: "#006A4E" }}
      footerNote="প্রতিটি সিদ্ধান্ত অ্যাকাউন্ট ও সময়সহ অডিট লগে সংরক্ষিত হয়।"
    >
      {children}
    </AppShell>
  );
}
