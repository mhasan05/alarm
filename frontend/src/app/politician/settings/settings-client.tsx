"use client";

import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { SettingsView } from "@/components/settings-view";
import { bnDate, phoneBn } from "@/lib/db/format";
import { alarmIdOf, roleOfId } from "@/lib/db/selectors";
import { usePolitician } from "../use-politician";

export function PoliticianSettings() {
  const { db, profile: P } = usePolitician();
  if (!P) return <RecordMissing title="প্রোফাইল পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  // Who opened the account — shown by role only, never by name.
  const creator = db.audit.find((e) => e.action === "Created political activist account" && e.target === P.id)?.actor;
  const createdBy = creator && roleOfId(db, creator) === "reviewer" ? "এলাকার নির্বাহী সম্পাদক" : "প্রধান নির্বাহী সম্পাদক";

  return (
    <>
      <PageHeader backHref="/politician/dashboard" crumb="রাজনৈতিক কর্মী পোর্টাল / সেটিংস" title="সেটিংস" />
      <SettingsView
        name={P.name}
        role={`${P.post} · ${P.seat}, ${P.thana}`}
        status={P.account === "Active" ? "সক্রিয় অ্যাকাউন্ট" : "স্থগিত অ্যাকাউন্ট"}
        statusTone={P.account === "Active" ? "success" : "danger"}
        facts={[
          ["ALARM আইডি", alarmIdOf(db, P.id)],
          ["মোবাইল", phoneBn(P.phone)],
          ["নির্বাচনী এলাকা", P.seat],
          ["দায়িত্বে", `${P.since} সাল থেকে`],
          ["অ্যাকাউন্ট তৈরি", bnDate(P.registeredAt)],
        ]}
        groups={[
          {
            title: "ব্যক্তিগত তথ্য",
            icon: "person",
            rows: [
              ["পূর্ণ নাম", P.name],
              ["মোবাইল নম্বর", phoneBn(P.phone)],
              ["এনআইডি নম্বর", P.nid],
              ["জন্ম তারিখ", P.dob],
            ],
          },
          {
            title: "পদ ও এলাকা",
            icon: "office",
            rows: [
              ["বর্তমান পদ", P.post],
              ["দল / সংগঠন", P.party],
              ["সংসদীয় আসন", P.seat],
              ["বিভাগ · জেলা", `${P.division} · ${P.district}`],
              ["উপজেলা / সিটি কর্পোরেশন", P.upazila],
              ["থানা · ওয়ার্ড", `${P.thana} · ${P.wards}`],
              ["দায়িত্ব গ্রহণের বছর", P.since],
            ],
          },
          {
            title: "যোগাযোগ",
            icon: "contact",
            rows: [
              ["ইমেইল", P.email],
              ["ফেসবুক প্রোফাইল", P.facebook],
              ["কার্যালয়ের ঠিকানা", P.office],
            ],
          },
          {
            title: "অ্যাকাউন্ট",
            icon: "account",
            rows: [
              ["অ্যাকাউন্ট তৈরির তারিখ", bnDate(P.registeredAt)],
              ["অ্যাকাউন্ট তৈরি করেছেন", createdBy],
            ],
          },
        ]}
      />
    </>
  );
}
