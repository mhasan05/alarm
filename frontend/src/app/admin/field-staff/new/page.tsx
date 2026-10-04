import type { Metadata } from "next";
import { AddStaffPage } from "./add-staff-page";

export const metadata: Metadata = { title: "Add Investigation Editor · ALARM" };

/** New staff account; `?edit=KAR-…` opens the same form pre-filled for that staff member. */
export default async function Page({ searchParams }: PageProps<"/admin/field-staff/new">) {
  const { edit } = await searchParams;
  return <AddStaffPage edit={typeof edit === "string" ? edit : undefined} />;
}
