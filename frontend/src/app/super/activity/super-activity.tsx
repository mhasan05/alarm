"use client";

import { PageHeader } from "@/components/app-shell";
import { bnDateTime } from "@/lib/db/format";
import { useRoot } from "@/lib/db/store";

/** The সুপার অ্যাডমিন's own log: admins created, suspended or restored, and every account access. */
export function SuperActivity() {
  const root = useRoot();
  const orgName = (id: string) => root.orgs.find((o) => o.id === id)?.name;
  return (
    <>
      <PageHeader crumb="সুপার অ্যাডমিন পোর্টাল" title="কাজের লগ" />
      <div className="flex flex-1 flex-col px-4 pt-[22px] pb-9 sm:px-7">
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">সুপার অ্যাডমিনের কাজ</h2>
            <p className="mt-0.5 text-[12px] text-muted">প্রতিষ্ঠান তৈরি, বন্ধ ও আবার চালু করা, আর প্রতিটি অ্যাকাউন্টে প্রবেশ — সময়সহ।</p>
          </div>
          {root.audit.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-muted">এখনও কোনো কাজ হয়নি।</p>
          ) : (
            <ul>
              {root.audit.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-5 py-3.5 last:border-b-0">
                  <span className="w-full text-[12px] text-muted sm:w-[190px]">{bnDateTime(e.at)}</span>
                  <span className="min-w-0 flex-1 text-[13.5px] text-ink">
                    {e.action}
                    {e.target && (
                      <span className="text-muted">
                        {" "}
                        · {orgName(e.target) ? `${orgName(e.target)} (${e.target})` : e.target}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
