"use client";

import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { SettingsView } from "@/components/settings-view";
import { bnDate, phoneBn } from "@/lib/db/format";
import { alarmIdOf } from "@/lib/db/selectors";
import { useStaff } from "../use-staff";

export function StaffSettings() {
  const { db, staff } = useStaff();
  if (!staff) return <RecordMissing title="অ্যাকাউন্ট পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  return (
    <>
      <PageHeader backHref="/staff/dashboard" crumb="তদন্ত সম্পাদক পোর্টাল / সেটিংস" title="সেটিংস" />
      <SettingsView
        name={staff.nameBn}
        role={`তদন্ত সম্পাদক · ${staff.id}`}
        status={staff.status === "On leave" ? "ছুটিতে" : "চালু আছে"}
        statusTone={staff.status === "On leave" ? "warning" : "success"}
        facts={[
          ["ALARM আইডি", alarmIdOf(db, staff.id)],
          ["মোবাইল", phoneBn(staff.phone)],
          ["যোগ দিয়েছেন", bnDate(staff.joined)],
        ]}
        groups={[
          {
            title: "ব্যক্তিগত তথ্য",
            icon: "person",
            rows: [
              ["পূর্ণ নাম", staff.nameBn],
              ["মোবাইল নম্বর", phoneBn(staff.phone)],
              ["ইমেইল", staff.email],
            ],
          },
          {
            // The assigned reviewer is intentionally not shown to staff.
            title: "কাজের এলাকা",
            icon: "area",
            rows: [
              ["বিভাগ · জেলা", `${staff.division} · ${staff.district}`],
              ["থানা / ইউনিয়ন", staff.thana],
              ["ওয়ার্ড", staff.wards],
            ],
          },
          {
            title: "অ্যাকাউন্ট",
            icon: "account",
            rows: [
              ["পদ", "তদন্ত সম্পাদক"],
              ["যোগ দেওয়ার তারিখ", bnDate(staff.joined)],
            ],
          },
        ]}
      />
    </>
  );
}
