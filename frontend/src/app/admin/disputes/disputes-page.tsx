"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatTiles } from "@/components/charts";
import { bn, daysSince } from "@/lib/db/format";
import { useAdmin } from "../use-admin";
import { DisputeList, type DisputeTab } from "@/components/disputes/dispute-list";

export function DisputesPage({ initialTab }: { initialTab: DisputeTab }) {
  const { db } = useAdmin();
  const open = db.disputes.filter((d) => d.state === "Open");
  const resolved = db.disputes.filter((d) => d.state !== "Open");
  const overdue = open.filter((d) => daysSince(d.filedAt) >= 2).length;
  const withdrawn = resolved.filter((d) => d.state === "Removed").length;
  const corrected = resolved.filter((d) => d.state === "Partial").length;
  const profiles = new Set(open.map((d) => d.profileId)).size;

  const stats = [
    { label: "খোলা অভিযোগ", value: bn(open.length), color: "#F42A41", note: "আপনার সিদ্ধান্তের অপেক্ষায়" },
    { label: "৪৮ ঘণ্টার বেশি পুরোনো", value: bn(overdue), color: "#D97706", note: "এগুলোর সিদ্ধান্ত আগে দিন" },
    { label: "সমাধান হয়েছে", value: bn(resolved.length), color: "#1A7A4A", note: `${bn(withdrawn)}টি জমা বাতিল · ${bn(corrected)}টি সংশোধন`, href: "/admin/disputes?tab=resolved" },
    { label: "জড়িত প্রোফাইল", value: bn(profiles), color: "#0D1F17", note: "এই সময়ে জমাগুলো দেখা যায়", href: "/admin/politicians" },
  ];

  return (
    <>
      <PageHeader
        crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / অভিযোগ"
        title={
          <>
            ভুল তথ্যের অভিযোগ
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {bn(open.length)}টি খোলা অভিযোগ আপনার সিদ্ধান্তের অপেক্ষায় · {bn(overdue)}টি ৪৮ ঘণ্টার বেশি পুরোনো
            </span>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <div className="flex gap-3 rounded-card border border-line border-l-[3px] border-l-primary bg-white px-5 py-4 shadow-card">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none text-primary">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2v3.6M8 5.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[13px] leading-relaxed text-ink text-pretty">
            শুধু যে রাজনৈতিক কর্মীকে নিয়ে জমা, তিনিই এর বিরুদ্ধে অভিযোগ করতে পারেন। আপনি যাচাই করার সময় জমাটি <strong className="font-semibold">তাঁর প্রোফাইলে যেমন আছে তেমনই থাকে</strong>
            — অভিযোগগুলো ভেতরের বিষয়, বাইরে কোনো চিহ্ন দেখায় না। তাই নির্বাহী সম্পাদকের গ্রহণ করা কোনো তথ্য চুপচাপ ছোট করা যায় না।
          </p>
        </div>

        <StatTiles stats={stats} linkAs={Link} />
        <DisputeList key={initialTab} db={db} disputes={db.disputes} baseHref="/admin/disputes" initialTab={initialTab} />
      </div>
    </>
  );
}
