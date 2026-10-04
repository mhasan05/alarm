import type { Metadata } from "next";
import { NewAdminForm } from "./new-admin-form";

export const metadata: Metadata = { title: "নতুন প্রধান নির্বাহী সম্পাদক · সুপার অ্যাডমিন · ALARM" };

/** `?reset=ORG-…` gives that admin a new temporary password instead. */
export default async function NewAdminPage({ searchParams }: PageProps<"/super/admins/new">) {
  const { reset } = await searchParams;
  return <NewAdminForm resetOrg={typeof reset === "string" ? reset : null} />;
}
