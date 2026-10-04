"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { StaffStatus } from "@/lib/db/types";
import { CASELOAD_WARN, isAvailable, type FieldStaff } from "./roster";

export type Tab = "all" | "available" | "unavailable";
const TAB_LABEL: Record<Tab, string> = { all: "All", available: "Available", unavailable: "Unavailable" };

const STATUS_STYLE: Record<StaffStatus, string> = {
  "On duty": "bg-success/10 text-success",
  "On leave": "bg-surface text-muted",
  Suspended: "bg-danger/10 text-danger",
  Deactivated: "bg-ink/10 text-ink",
};

const loadColor = (n: number, limit: number) => (n > limit ? "bg-danger" : n >= Math.min(CASELOAD_WARN, limit - 1) ? "bg-warning" : "bg-primary");

export const areaOf = (s: FieldStaff) => `${s.thana}, ${s.district}`;

/** Saves the roster as a CSV file. */
export function ExportRoster({ staff }: { staff: FieldStaff[] }) {
  const exportCsv = () => {
    const head = ["ALARM ID", "Name", "Phone", "Thana", "District", "Status", "Open", "Due in 48h", "Evidence this month"];
    const rows = staff.map((s) => [s.id, s.name, s.phone, s.thana, s.district, s.status, s.open, s.dueSoon, s.evidenceMonth]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    // BOM so Excel reads the Bengali text as UTF-8.
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `alarm-field-staff-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={exportCsv}
      className="inline-flex h-10 cursor-pointer items-center rounded-button border border-line bg-white px-4 text-[13.5px] font-semibold text-primary hover:border-primary hover:bg-surface"
    >
      Export roster
    </button>
  );
}

export function RosterView({ staff, initialTab, limit }: { staff: FieldStaff[]; initialTab: Tab; limit: number }) {
  const CASELOAD_LIMIT = limit;
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");

  const lists: Record<Tab, FieldStaff[]> = {
    all: staff,
    available: staff.filter(isAvailable),
    unavailable: staff.filter((s) => !isAvailable(s)),
  };
  const q = query.trim().toLowerCase();
  const shown = lists[tab].filter((s) => !q || `${s.name} ${s.id} ${s.thana} ${s.district}`.toLowerCase().includes(q));

  const switchTab = (t: Tab) => {
    setTab(t);
    router.replace(t === "all" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Staff Roster</h2>
          <p className="mt-0.5 font-bn text-[12px] text-muted">কর্মী তালিকা</p>
        </div>
        <label className="flex h-10 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-input border border-line px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Search investigation editors</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ALARM ID or thana…"
            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-placeholder"
          />
        </label>
      </div>

      <div role="tablist" aria-label="Staff lists" className="flex flex-wrap gap-2 border-b border-line px-5 py-3.5">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => switchTab(t)}
              className={`flex h-9 cursor-pointer items-center gap-2 rounded-button border px-3.5 text-[13px] font-semibold ${
                on ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-primary hover:text-primary"
              }`}
            >
              {TAB_LABEL[t]}
              <span className={`rounded-[9px] px-[7px] py-px text-[11px] ${on ? "bg-white/20 text-white" : "bg-surface text-muted"}`}>{lists[t].length}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
              <th scope="col" className="px-5 py-3 font-semibold">NAME</th>
              <th scope="col" className="px-3 py-3 font-semibold">COVERAGE AREA</th>
              <th scope="col" className="px-3 py-3 font-semibold">CASELOAD</th>
              <th scope="col" className="px-3 py-3 font-semibold">EVIDENCE</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id} className="relative border-b border-line last:border-b-0 hover:bg-surface/40">
                <td className="px-5 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 flex-none items-center justify-center rounded-full bg-warning/10 text-[11.5px] font-semibold text-warning">
                      {s.initials}
                    </span>
                    <div>
                      {/* Stretched link: the whole row opens the staff detail page. */}
                      <Link href={`/admin/field-staff/${s.id}`} className="text-[13.5px] font-semibold text-ink after:absolute after:inset-0 hover:text-primary">
                        {s.name}
                      </Link>
                      <div className="text-[11.5px] text-muted">{s.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle font-bn text-[13px] text-ink">{areaOf(s)}</td>
                <td className="px-3 py-3 align-middle">
                  <div className="text-[13px] font-semibold text-ink">
                    {s.open} <span className="text-[11.5px] font-normal text-muted">open</span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${s.name} caseload`}
                    aria-valuenow={s.open}
                    aria-valuemin={0}
                    aria-valuemax={CASELOAD_LIMIT + 1}
                    className="mt-1 h-1 w-[104px] overflow-hidden rounded-full bg-surface"
                  >
                    <div className={`h-full rounded-full ${loadColor(s.open, limit)}`} style={{ width: `${Math.min(100, (s.open / (CASELOAD_LIMIT + 1)) * 100)}%` }} />
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="text-[13px] font-semibold text-ink">{s.evidenceMonth}</div>
                  <div className="text-[11.5px] text-muted">this month</div>
                </td>
                <td className="px-5 py-3 text-right align-middle">
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLE[s.status]}`}>
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-[14px] font-semibold text-ink">{q ? "No investigation editor matches this search" : "Nobody in this list"}</p>
                  <p className="mt-1 text-[12.5px] text-muted">{q ? "Try a name, an ALARM ID like KAR-615283, or a thana." : "Change the filter to see more investigation editors."}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="text-[13px] text-muted">
          Showing {shown.length} of {staff.length} staff
        </p>
        <Link href="/admin/politicians" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
          Assign a request →
        </Link>
      </div>
    </section>
  );
}
