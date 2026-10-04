"use client";

import { DisputeResolver } from "@/components/disputes/dispute-resolver";
import { useAdmin } from "../../use-admin";

/** The প্রধান নির্বাহী সম্পাদক resolves a dispute; they see every name. */
export function AdminDisputeView({ code }: { code: string }) {
  const { adminId } = useAdmin();
  return <DisputeResolver code={code} actorId={adminId} portal="প্রধান নির্বাহী সম্পাদক পোর্টাল" listHref="/admin/disputes" showStaffNames submissionHref={(c) => `/admin/submissions/${c}`} />;
}
