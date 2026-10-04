import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { AddActivityForm } from "./add-activity-form";

export const metadata: Metadata = { title: "কার্যক্রম যোগ করুন · ALARM" };

export default function AddActivityPage() {
  return (
    <>
      <PageHeader backHref="/politician/dashboard" crumb="রাজনৈতিক কর্মী পোর্টাল / কার্যক্রম যোগ" title="নিজের কার্যক্রম যোগ করুন" />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">নিজের কার্যক্রম যোগ করুন</h2>
            <p className="mt-0.5 text-[12px] leading-[1.65] text-muted text-pretty">
              আপনার জমা দেওয়া তথ্য তদন্ত সম্পাদকের তথ্যের মতো একই পর্যালোচনার সারিতে যাবে। নির্বাহী সম্পাদক গ্রহণ করলেই প্রোফাইলে দেখা যাবে।
            </p>
          </div>
          <AddActivityForm />
        </section>
      </div>
    </>
  );
}
