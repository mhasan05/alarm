"use client";

import { allPhones } from "@/lib/db/store";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAdmin } from "../../use-admin";
import { PoliticianForm } from "./politician-form";

export function AddPoliticianPage() {
  const { db, admin, adminId } = useAdmin();
  const [formKey, setFormKey] = useState(0);
  // The ALARM ID (KAR- + 6 random digits) is issued when the account is saved.
  const nextId = "KAR-••••••";
  const takenPhones = allPhones();
  const parties = db.parties.map((p) => p.name);

  return (
    <>
      <PageHeader
        backHref="/admin/politicians"
        crumb={
          <>
            <Link href="/admin/politicians" className="text-primary hover:text-primary-hover">
              রাজনৈতিক কর্মী
            </Link>{" "}
            / নতুন অ্যাকাউন্ট
          </>
        }
        title={
          <>
            নতুন রাজনৈতিক কর্মী
          </>
        }
      />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <PoliticianForm key={formKey} onAddAnother={() => setFormKey((k) => k + 1)} nextId={nextId} admin={admin?.nameBn ?? admin?.name ?? "প্রধান নির্বাহী সম্পাদক"} adminId={adminId} takenPhones={takenPhones} parties={parties} />
      </div>
    </>
  );
}
