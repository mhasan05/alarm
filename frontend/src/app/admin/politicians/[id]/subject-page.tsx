"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { SubjectView } from "./subject-view";

export function SubjectPage({ id, adding }: { id: string; adding: boolean }) {
  return (
    <>
      <PageHeader
        backHref="/admin/politicians"
        crumb={
          <>
            <Link href="/admin/politicians" className="text-primary hover:text-primary-hover">
              রাজনৈতিক কর্মী
            </Link>{" "}
            / প্রোফাইল
          </>
        }
        title={
          <>
            রাজনৈতিক কর্মীর প্রোফাইল
          </>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/ai-review?profile=${id}`}
              className="inline-flex h-9 items-center rounded-button border border-line bg-white px-3.5 text-[13px] font-semibold text-primary hover:border-primary hover:bg-surface"
            >
              অডিট খুলুন
            </Link>
            <Link
              href={`/admin/politicians/${id}?add=1`}
              scroll={false}
              className="inline-flex h-9 items-center rounded-button bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary-hover"
            >
              + জমা যোগ করুন
            </Link>
          </div>
        }
      />
      <SubjectView key={adding ? "add" : "view"} profileId={id} initialAdding={adding} />
    </>
  );
}
