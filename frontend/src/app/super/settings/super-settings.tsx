"use client";

import { PageHeader } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";
import { bn, phoneBn } from "@/lib/db/format";
import { useRoot } from "@/lib/db/store";

/** The সুপার অ্যাডমিন's own account and password. */
export function SuperSettings() {
  const root = useRoot();
  const sa = root.superAdmin;
  return (
    <>
      <PageHeader crumb="সুপার অ্যাডমিন পোর্টাল" title="সেটিংস" />
      <SettingsView
        name={sa.name}
        role="সুপার অ্যাডমিন"
        status="চালু অ্যাকাউন্ট"
        facts={[
          ["ALARM আইডি", sa.id],
          ["প্রতিষ্ঠান", `${bn(root.orgs.length)}টি`],
        ]}
        groups={[
          {
            title: "অ্যাকাউন্টের তথ্য",
            icon: "person",
            rows: [
              ["পূর্ণ নাম", sa.name],
              ["মোবাইল নম্বর", phoneBn(sa.phone)],
              ["ইমেইল", sa.email],
              ["ভূমিকা", "সুপার অ্যাডমিন — প্রধান নির্বাহী সম্পাদক তৈরি, বন্ধ করা ও তাঁদের অ্যাকাউন্টে প্রবেশ"],
            ],
          },
        ]}
      />
    </>
  );
}
