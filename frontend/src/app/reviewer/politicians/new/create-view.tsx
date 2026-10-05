"use client";

import { allPhones } from "@/lib/db/store";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { PoliticianForm } from "@/app/admin/politicians/new/politician-form";
import { useReviewer } from "../../use-reviewer";

export function ReviewerCreatePolitician() {
  const { db, reviewer } = useReviewer();
  const [formKey, setFormKey] = useState(0);
  if (!reviewer) return <RecordMissing title="অ্যাকাউন্ট পাওয়া যায়নি" backHref="/login" backLabel="আবার লগইন করুন" />;

  return (
    <>
      <PageHeader backHref="/reviewer/dashboard" crumb="নির্বাহী সম্পাদক পোর্টাল / নতুন রাজনৈতিক কর্মী" title="নতুন রাজনৈতিক কর্মী" />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        {reviewer.areas.length === 0 ? (
          <p className="rounded-card border border-l-[3px] border-line border-l-warning bg-white px-5 py-4 text-[13px] shadow-card">
            আপনার দায়িত্বে কোনো এলাকা নেই, তাই অ্যাকাউন্ট তৈরি করা যাবে না। প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।
          </p>
        ) : (
          <PoliticianForm
            key={formKey}
            onAddAnother={() => setFormKey((k) => k + 1)}
            nextId="KAR-••••••"
            admin={`${reviewer.nameBn} (নির্বাহী সম্পাদক)`}
            adminId={reviewer.id}
            takenPhones={allPhones()}
            parties={db.parties.map((p) => p.name)}
            allowedAreas={reviewer.areas}
            listHref="/reviewer/dashboard"
            listLabel="ড্যাশবোর্ডে ফিরুন"
            profileHref={null}
          />
        )}
      </div>
    </>
  );
}
