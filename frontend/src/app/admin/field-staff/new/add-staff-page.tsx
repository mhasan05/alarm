"use client";

import { allPhones } from "@/lib/db/store";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { GEO, locateArea } from "@/lib/geo";
import { staffOf } from "@/lib/db/selectors";
import { useAdmin } from "../../use-admin";
import { staffRows } from "../roster";
import { StaffForm } from "./staff-form";

export function AddStaffPage({ edit }: { edit?: string }) {
  const { db, admin, adminId } = useAdmin();
  const editing = edit ? staffOf(db, edit) : undefined;
  if (edit && !editing) return <RecordMissing title="তদন্ত সম্পাদক পাওয়া যায়নি" backHref="/admin/field-staff" backLabel="তদন্ত সম্পাদক তালিকায় ফিরুন" />;

  // Pre-fill the saved area; the seat comes from the staff record when the area has several seats.
  const initialArea = editing ? locateArea(editing.district, editing.thana) : undefined;
  if (editing && initialArea?.upazila && !initialArea.seat) {
    const seats = GEO[initialArea.division!][initialArea.district!][initialArea.upazila].seats;
    if (seats.includes(editing.seat)) initialArea.seat = editing.seat;
  }
  // The ALARM ID (KAR- + 6 random digits) is issued when the account is saved.
  const nextId = "KAR-••••••";
  // Phones are unique across every organisation (the editing account's own phone excepted).
  const own = editing ? db.users.find((u) => u.id === editing.id)?.phone : undefined;
  const takenPhones = allPhones().filter((p) => p !== own);

  return (
    <>
      <PageHeader
        backHref={editing ? `/admin/field-staff/${editing.id}` : "/admin/field-staff"}
        crumb={
          <>
            <Link href="/admin/field-staff" className="text-primary hover:text-primary-hover">
              তদন্ত সম্পাদক
            </Link>{" "}
            /{" "}
            {editing ? (
              <>
                <Link href={`/admin/field-staff/${editing.id}`} className="text-primary hover:text-primary-hover">
                  {editing.id}
                </Link>{" "}
                / এডিট
              </>
            ) : (
              "নতুন তদন্ত সম্পাদক"
            )}
          </>
        }
        title={
          <>
            {editing ? (
              <>
                প্রোফাইল এডিট
              </>
            ) : (
              <>
                নতুন তদন্ত সম্পাদক
              </>
            )}
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {editing ? `${editing.nameBn || editing.name} · ${editing.id}` : "মোবাইলে তথ্য সংগ্রহের অ্যাকাউন্ট তৈরি হবে। সেভ করলে ALARM আইডি (KAR-) নিজে থেকেই দেওয়া হবে।"}
            </span>
          </>
        }
      />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <StaffForm
          key={editing?.id ?? "new"}
          nextId={nextId}
          admin={admin?.nameBn ?? admin?.name ?? "প্রধান নির্বাহী সম্পাদক"}
          adminId={adminId}
          takenPhones={takenPhones}
          roster={staffRows(db)}
          editing={editing && { id: editing.id, name: editing.name, phone: editing.phone, joined: editing.joined }}
          initialArea={initialArea}
        />
      </div>
    </>
  );
}
