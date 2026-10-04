import type { Metadata } from "next";
import { FieldStaffDetailView } from "./staff-detail-view";

export async function generateMetadata({ params }: PageProps<"/admin/field-staff/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · তদন্ত সম্পাদক · ALARM` };
}

export default async function FieldStaffDetailPage({ params }: PageProps<"/admin/field-staff/[id]">) {
  const { id } = await params;
  return <FieldStaffDetailView id={id} />;
}
