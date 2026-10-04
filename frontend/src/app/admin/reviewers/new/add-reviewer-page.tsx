"use client";

import { allPhones } from "@/lib/db/store";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { reviewerOf } from "@/lib/db/selectors";
import { useAdmin } from "../../use-admin";
import { staffRows } from "../../field-staff/roster";
import { StaffForm } from "../../field-staff/new/staff-form";

/** New reviewer account, or the same form pre-filled for editing. Coverage is managed in Settings. */
export function AddReviewerPage({ edit }: { edit?: string }) {
  const { db, admin, adminId } = useAdmin();
  const editing = edit ? reviewerOf(db, edit) : undefined;
  if (edit && !editing) return <RecordMissing title="নির্বাহী সম্পাদক পাওয়া যায়নি" backHref="/admin/reviewers" backLabel="নির্বাহী সম্পাদক তালিকায় ফিরুন" />;
  // The ALARM ID (KAR- + 6 random digits) is issued when the account is saved.
  const nextId = "KAR-••••••";
  // Phones are unique across every organisation (the editing account's own phone excepted).
  const own = editing ? db.users.find((u) => u.id === editing.id)?.phone : undefined;
  const takenPhones = allPhones().filter((p) => p !== own);

  return (
    <>
      <PageHeader
        backHref={editing ? `/admin/reviewers/${editing.id}` : "/admin/reviewers"}
        crumb={
          <>
            <Link href="/admin/reviewers" className="text-primary hover:text-primary-hover">
              নির্বাহী সম্পাদক
            </Link>{" "}
            /{" "}
            {editing ? (
              <>
                <Link href={`/admin/reviewers/${editing.id}`} className="text-primary hover:text-primary-hover">
                  {editing.id}
                </Link>{" "}
                / এডিট
              </>
            ) : (
              "নতুন নির্বাহী সম্পাদক"
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
                নতুন নির্বাহী সম্পাদক
              </>
            )}
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {editing ? `${editing.nameBn || editing.name} · ${editing.id}` : "নির্বাহী সম্পাদকের অ্যাকাউন্ট তৈরি হবে। বেছে নেওয়া এলাকাটি হবে তাঁর প্রথম দায়িত্বের এলাকা।"}
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
          initialRole="reviewer"
          basePath="/admin/reviewers"
          listLabel="নির্বাহী সম্পাদক তালিকায়"
        />
      </div>
    </>
  );
}
