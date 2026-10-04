"use client";

import { useState } from "react";
import { bn } from "@/lib/db/format";
import type { Database } from "@/lib/db/types";

type Group = "politician" | "staff" | "reviewer";
type Person = { id: string; name: string; sub: string; group: Group };

const GROUPS: { key: Group; label: string }[] = [
  { key: "politician", label: "রাজনৈতিক কর্মী" },
  { key: "staff", label: "তদন্ত সম্পাদক" },
  { key: "reviewer", label: "নির্বাহী সম্পাদক" },
];

/** Everyone who can be invited: active accounts with a sign-in. */
export function invitable(db: Database): Person[] {
  const canSignIn = new Set(db.users.map((u) => u.id));
  return [
    ...db.profiles.filter((p) => p.account === "Active" && canSignIn.has(p.id)).map((p) => ({ id: p.id, name: p.name, sub: `${p.post} · ${p.seat}`, group: "politician" as const })),
    ...db.staff.filter((s) => s.status !== "Deactivated" && s.status !== "Suspended" && canSignIn.has(s.id)).map((s) => ({ id: s.id, name: s.nameBn, sub: `${s.id} · ${s.thana}, ${s.district}`, group: "staff" as const })),
    ...db.reviewers.filter((r) => r.status !== "Deactivated" && r.status !== "Suspended" && canSignIn.has(r.id)).map((r) => ({ id: r.id, name: r.nameBn, sub: `${r.id} · ${bn(r.areas.length)}টি এলাকা`, group: "reviewer" as const })),
  ];
}

export function InvitePicker({ db, value, onChange, invalid }: { db: Database; value: string[]; onChange: (ids: string[]) => void; invalid?: boolean }) {
  const people = invitable(db);
  const [group, setGroup] = useState<Group>("politician");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = people.filter((p) => p.group === group && (!query || `${p.name} ${p.sub}`.toLowerCase().includes(query)));
  const allOn = shown.length > 0 && shown.every((p) => value.includes(p.id));
  const byId = new Map(people.map((p) => [p.id, p]));

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const toggleAll = () => onChange(allOn ? value.filter((v) => !shown.some((p) => p.id === v)) : [...new Set([...value, ...shown.map((p) => p.id)])]);

  return (
    <div className={`overflow-hidden rounded-card border ${invalid ? "border-danger" : "border-line"}`}>
      <div role="tablist" className="flex border-b border-line bg-surface/50">
        {GROUPS.map((g) => {
          const n = value.filter((id) => byId.get(id)?.group === g.key).length;
          return (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={group === g.key}
              onClick={() => setGroup(g.key)}
              className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 font-bn text-[12.5px] font-semibold ${group === g.key ? "border-primary bg-white text-primary" : "border-transparent text-muted hover:text-ink"}`}
            >
              {g.label}
              {n > 0 && <span className="rounded-full bg-primary px-1.5 text-[10.5px] text-white">{bn(n)}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-input border border-line bg-white px-2.5 focus-within:border-primary">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">খুঁজুন</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম, আইডি বা এলাকা দিয়ে খুঁজুন" className="min-w-0 flex-1 bg-transparent font-bn text-[13px] outline-none" />
        </label>
        <button type="button" onClick={toggleAll} disabled={!shown.length} className="h-9 flex-none cursor-pointer rounded-button border border-line px-3 font-bn text-[12px] font-semibold text-primary hover:border-primary disabled:opacity-50">
          {allOn ? "সব বাদ দিন" : "সবাইকে নির্বাচন"}
        </button>
      </div>
      <ul className="max-h-[300px] overflow-y-auto">
        {shown.length === 0 && <li className="px-4 py-6 text-center font-bn text-[12.5px] text-muted">কাউকে পাওয়া যায়নি।</li>}
        {shown.map((p) => {
          const on = value.includes(p.id);
          return (
            <li key={p.id} className="border-b border-line/60 last:border-b-0">
              <label className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${on ? "bg-primary/5" : "hover:bg-surface/60"}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="size-4 flex-none accent-[#006A4E]" />
                <span className="flex size-8 flex-none items-center justify-center rounded-full bg-primary/10 font-bn text-[13px] font-semibold text-primary">{p.name.replace(/^মোঃ\s*/, "").slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bn text-[13px] font-semibold text-ink">{p.name}</span>
                  <span className="block truncate font-bn text-[11.5px] text-muted">{p.sub}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line bg-surface/40 px-3 py-2.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pr-1 pl-2.5 font-bn text-[11.5px] font-semibold text-ink">
              {byId.get(id)?.name ?? id}
              <button type="button" onClick={() => toggle(id)} aria-label={`${byId.get(id)?.name ?? id} বাদ দিন`} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-danger/10 hover:text-danger">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
