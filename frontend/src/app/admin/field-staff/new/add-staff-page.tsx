"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { RecordMissing } from "@/components/record-missing";
import { GEO, locateArea } from "@/lib/geo";
import { nextCode, staffOf } from "@/lib/db/selectors";
import { useAdmin } from "../../use-admin";
import { staffRows } from "../roster";
import { StaffForm } from "./staff-form";

export function AddStaffPage({ edit }: { edit?: string }) {
  const { db, admin, adminId } = useAdmin();
  const editing = edit ? staffOf(db, edit) : undefined;
  if (edit && !editing) return <RecordMissing title="মাঠকর্মী পাওয়া যায়নি" backHref="/admin/field-staff" backLabel="মাঠকর্মী তালিকায় ফিরুন" />;

  // Pre-fill the saved area; the seat comes from the staff record when the area has several seats.
  const initialArea = editing ? locateArea(editing.district, editing.thana) : undefined;
  if (editing && initialArea?.upazila && !initialArea.seat) {
    const seats = GEO[initialArea.division!][initialArea.district!][initialArea.upazila].seats;
    if (seats.includes(editing.seat)) initialArea.seat = editing.seat;
  }
  const nextId = nextCode(db.staff.map((s) => s.id), "FS", 3);
  const takenPhones = db.users.filter((u) => u.id !== editing?.id).map((u) => u.phone);

  return (
    <>
      <PageHeader
        backHref={editing ? `/admin/field-staff/${editing.id}` : "/admin/field-staff"}
        crumb={
          <>
            <Link href="/admin/field-staff" className="text-primary hover:text-primary-hover">
              মাঠকর্মী
            </Link>{" "}
            /{" "}
            {editing ? (
              <>
                <Link href={`/admin/field-staff/${editing.id}`} className="text-primary hover:text-primary-hover">
                  {editing.id}
                </Link>{" "}
                / Edit
              </>
            ) : (
              "নতুন কর্মী"
            )}
          </>
        }
        title={
          <>
            {editing ? (
              <>
                Edit profile · <span className="font-bn">প্রোফাইল সম্পাদনা</span>
              </>
            ) : (
              <>
                Add Field Staff · <span className="font-bn">নতুন মাঠকর্মী</span>
              </>
            )}
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {editing ? `${editing.name} · ${editing.id}` : "Creates a mobile collection account. Staff ID is issued automatically on save."}
            </span>
          </>
        }
      />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <StaffForm
          key={editing?.id ?? "new"}
          nextId={nextId}
          admin={admin?.name ?? "Admin"}
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
