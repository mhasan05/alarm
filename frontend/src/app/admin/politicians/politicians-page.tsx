"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { bn } from "@/lib/db/format";
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
    { label: "প্রোফাইল", value: bn(db.profiles.length), color: "#0D1F17", note: `মোট প্রোফাইল · ${bn(active)}টি চালু অ্যাকাউন্ট` },
    { label: "বন্ধ অ্যাকাউন্ট", value: bn(suspended), color: "#F42A41", note: "সাইন-ইন বন্ধ", href: "/admin/politicians?tab=suspended" },
    { label: "যাচাই চলছে এমন জমা", value: bn(underReview), color: "#D97706", note: "নির্বাহী সম্পাদকদের তালিকায়", href: "/admin/reviewers" },
    { label: "খোলা অভিযোগ", value: bn(disputes), color: "#F42A41", note: "ভুল তথ্যের অভিযোগ · প্রধান নির্বাহী সম্পাদকের সিদ্ধান্তের অপেক্ষায়", href: "/admin/disputes" },
  ];

  return (
    <>
      <PageHeader
        crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / রাজনৈতিক কর্মী"
        title={
          <>
            রাজনৈতিক কর্মী
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {bn(db.profiles.length)}টি প্রোফাইল · অ্যাকাউন্ট তৈরি করেন প্রধান নির্বাহী সম্পাদক
            </span>
          </>
        }
        action={
          <Link
            href="/admin/politicians/new"
            className="inline-flex h-[38px] items-center gap-1.5 rounded-button bg-primary px-3.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
          >
            + নতুন রাজনৈতিক কর্মী যোগ করুন
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <StatTiles stats={stats} linkAs={Link} />
        {/* Keyed so a tab change from a link (e.g. the dashboard) resets the view. */}
        <PoliticiansView key={initialTab} initialTab={initialTab} />
        <p className="text-[11.5px] leading-normal text-muted text-pretty">
          প্রোফাইলগুলো শুধু ভেতরে দেখা যায়। একজন রাজনৈতিক কর্মী শুধু নিজের প্রোফাইলে সাইন ইন করতে পারেন; তদন্ত সম্পাদক ও নির্বাহী সম্পাদকেরা কখনো তাঁর লগইন তথ্য দেখতে পান না।
        </p>
      </div>
    </>
  );
}
