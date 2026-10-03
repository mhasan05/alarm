"use client";

import { PageHeader } from "@/components/app-shell";
import { useAdmin } from "../use-admin";
import { AdminSettings, type Section } from "./settings-view";

export function SettingsPage({ initial }: { initial: Section }) {
  const { admin, adminId } = useAdmin();
  return (
    <>
      <PageHeader
        backHref="/admin/dashboard"
        crumb="অ্যাডমিন পোর্টাল / সেটিংস"
        title={
          <>
            Settings · <span className="font-bn">সেটিংস</span>
          </>
        }
      />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <AdminSettings key={initial} initial={initial} admin={admin?.name ?? "Admin"} adminId={adminId} />
      </div>
    </>
  );
}
