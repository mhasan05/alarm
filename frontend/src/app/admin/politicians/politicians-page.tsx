"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { openDisputes } from "@/lib/db/selectors";
import { useAdmin } from "../use-admin";
import { PoliticiansView, type Tab } from "./politicians-view";

export function PoliticiansPage({ initialTab }: { initialTab: Tab }) {
  const { db } = useAdmin();
  const active = db.profiles.filter((p) => p.account === "Active").length;
  const suspended = db.profiles.filter((p) => p.account === "Suspended").length;
  const underReview = db.submissions.filter((s) => s.state === "Pending").length;
  const disputes = openDisputes(db).length;

  const stats = [
    { label: "PROFILES", value: String(db.profiles.length), color: "#0D1F17", note: `মোট প্রোফাইল · ${active} active accounts` },
    { label: "SUSPENDED", value: String(suspended), color: "#F42A41", note: "স্থগিত · sign-in blocked", href: "/admin/politicians?tab=suspended" },
    { label: "REPORTS PENDING REVIEW", value: String(underReview), color: "#D97706", note: "পর্যালোচনাধীন · reviewer queues", href: "/admin/reviewers" },
    { label: "OPEN DISPUTES", value: String(disputes), color: "#F42A41", note: "অসঙ্গতির অভিযোগ · awaiting admin action", href: "/admin/disputes" },
  ];

  return (
    <>
      <PageHeader
        crumb="অ্যাডমিন পোর্টাল / রাজনৈতিক কর্মী"
        title={
          <>
            Political Activists · <span className="font-bn">রাজনৈতিক কর্মী</span>
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {db.profiles.length} profiles · accounts are created by the admin
            </span>
          </>
        }
        action={
          <Link
            href="/admin/politicians/new"
            className="inline-flex h-[38px] items-center gap-1.5 rounded-button bg-primary px-3.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
          >
            + Add Political Activist
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <StatTiles stats={stats} linkAs={Link} />
        {/* Keyed so a tab change from a link (e.g. the dashboard) resets the view. */}
        <PoliticiansView key={initialTab} initialTab={initialTab} />
        <p className="text-[11.5px] leading-normal text-muted text-pretty">
          Profiles are internal. A political activist signs in only to their own profile; staff and reviewers never see their login details.
        </p>
      </div>
    </>
  );
}
