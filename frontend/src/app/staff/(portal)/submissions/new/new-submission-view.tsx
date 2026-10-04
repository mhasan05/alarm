"use client";

import { PageHeader } from "@/components/app-shell";
import { useStaff } from "../../use-staff";
import { SubmissionForm, type Task } from "./submission-form";

/** `profile` (a profile id) locks the form to that assignment (opened from the dashboard). */
export function NewSubmissionView({ profile }: { profile?: string }) {
  const { openTasks } = useStaff();
  const tasks: Task[] = openTasks
    .filter((t) => t.profile)
    .map((t) => ({ id: t.profileId, name: t.profile!.name, initial: t.profile!.initial, office: `${t.profile!.post} · ${t.profile!.seat}, ${t.profile!.thana} · ${t.wards}` }));
  const locked = tasks.find((t) => t.id === profile) ?? null;

  return (
    <>
      <PageHeader backHref="/staff/dashboard" crumb="তদন্ত সম্পাদক পোর্টাল / নতুন তথ্য জমা" title="নতুন তথ্য জমা দিন" />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[14.5px] font-semibold leading-[1.6]">নতুন তথ্য জমা দিন</h2>
            <p className="mt-[3px] text-[12px] leading-[1.65] text-muted text-pretty">জমা দেওয়ার পর তথ্যটি পর্যালোচনার সারিতে যাবে। গ্রহণ করা হলেই সংশ্লিষ্ট প্রোফাইলে প্রকাশিত হবে।</p>
          </div>
          {tasks.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-muted">এখন আপনার কোনো চলমান কাজ নেই — প্রধান নির্বাহী সম্পাদক দায়িত্ব দিলে এখানে তথ্য জমা দিতে পারবেন।</p>
          ) : (
            // Keyed so switching between locked profiles resets the form.
            <SubmissionForm key={locked?.id ?? "any"} locked={locked} openTasks={tasks} />
          )}
        </section>
      </div>
    </>
  );
}
