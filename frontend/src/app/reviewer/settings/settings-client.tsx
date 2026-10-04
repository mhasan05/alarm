"use client";

import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { SettingsView } from "@/components/settings-view";
import { bnDate, phoneBn } from "@/lib/db/format";
import { alarmIdOf } from "@/lib/db/selectors";
import { useReviewer } from "../use-reviewer";

export function ReviewerSettings() {
  const { db, reviewer: r } = useReviewer();
  if (!r) return <RecordMissing title="অ্যাকাউন্ট পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  return (
    <>
      <PageHeader backHref="/reviewer/dashboard" crumb="নির্বাহী সম্পাদক পোর্টাল / সেটিংস" title="সেটিংস" />
      <SettingsView
        name={r.nameBn}
        role={`নির্বাহী সম্পাদক · ${r.id}`}
        status={r.status === "On leave" ? "ছুটিতে" : "সক্রিয় অ্যাকাউন্ট"}
        statusTone={r.status === "On leave" ? "warning" : "success"}
        facts={[
          ["ALARM আইডি", alarmIdOf(db, r.id)],
          ["মোবাইল", phoneBn(r.phone)],
          ["যোগদান", bnDate(r.joined)],
        ]}
        groups={[
          {
            title: "ব্যক্তিগত তথ্য",
            icon: "person",
            rows: [
              ["পূর্ণ নাম", r.nameBn],
              ["মোবাইল নম্বর", phoneBn(r.phone)],
              ["ইমেইল", r.email],
            ],
          },
          {
            title: "দায়িত্বের এলাকা",
            icon: "area",
            rows: r.areas.length ? r.areas.map((a, i) => [`এলাকা ${new Intl.NumberFormat("bn-BD").format(i + 1)}`, a] as [string, string]) : [["এলাকা", "নির্ধারিত হয়নি"]],
          },
          {
            title: "অ্যাকাউন্ট",
            icon: "account",
            rows: [
              ["ভূমিকা", "নির্বাহী সম্পাদক"],
              ["যোগদানের তারিখ", bnDate(r.joined)],
            ],
          },
        ]}
      />
    </>
  );
}
