"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { enRelative } from "@/lib/db/format";
import { nameOf, roleOfId } from "@/lib/db/selectors";
import { useAdmin } from "../use-admin";
import { isAvailable, staffRows } from "./roster";
import { ExportRoster, RosterView, type Tab } from "./roster-view";

const ACTION_DOT: Record<string, string> = { "Submitted evidence": "#006A4E", "Held submission — source unclear": "#F42A41", "Rejected submission": "#F42A41" };


function Tile({ icon, chip, chipCls, value, label, note, tone }: { icon: ReactNode; chip: string; chipCls: string; value: string; label: ReactNode; note: string; tone: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-3 shadow-card md:p-[18px]">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
        <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold max-md:hidden ${chipCls}`}>{chip}</span>
      </div>
      <div className="mt-3 text-[22px] md:text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">{value}</div>
      <div className="mt-2 text-[12.5px] text-ink">{label}</div>
      <div className="mt-0.5 text-[11.5px] text-muted max-md:hidden">{note}</div>
    </div>
  );
}

export function FieldStaffPage({ initialTab }: { initialTab: Tab }) {
  const { db } = useAdmin();
  const FIELD_STAFF = staffRows(db);
  // Recent activity by or about field staff, from the audit log.
  const staffIds = new Set(db.staff.map((x) => x.id));
  const STAFF_ACTIVITY = db.audit
    .filter((a) => staffIds.has(a.actor) || staffIds.has(a.target))
    .slice(0, 5)
    .map((a) => ({
      dot: ACTION_DOT[a.action] ?? "#1D6FC0",
      text: `${nameOf(db, a.actor)}${roleOfId(db, a.actor) === "staff" ? ` (${a.actor})` : ""} — ${a.action} · ${a.target}`,
      time: enRelative(a.at),
      staff: staffIds.has(a.actor) ? a.actor : a.target,
    }));

  const active = FIELD_STAFF.filter((s) => s.status !== "Suspended" && s.status !== "Deactivated");
  const suspended = FIELD_STAFF.length - active.length;
  const onLeave = FIELD_STAFF.filter((s) => s.status === "On leave").length;
  const available = FIELD_STAFF.filter(isAvailable).length;
  const open = FIELD_STAFF.reduce((n, s) => n + s.open, 0);
  const dueSoon = FIELD_STAFF.reduce((n, s) => n + s.dueSoon, 0);
  const evidence = FIELD_STAFF.reduce((n, s) => n + s.evidenceMonth, 0);
  const dueStaff = FIELD_STAFF.filter((s) => s.dueSoon > 0).length;

  const districts = Object.entries(
    FIELD_STAFF.reduce<Record<string, { staff: number; open: number }>>((m, s) => {
      m[s.district] ??= { staff: 0, open: 0 };
      m[s.district].staff += 1;
      m[s.district].open += s.open;
      return m;
    }, {}),
  ).sort((a, b) => b[1].staff - a[1].staff || b[1].open - a[1].open);
  const maxStaff = Math.max(1, ...districts.map(([, d]) => d.staff));
  const thin = districts.filter(([, d]) => d.staff === 1).map(([name]) => name);

  return (
    <>
      <PageHeader
        crumb="প্রধান নির্বাহী সম্পাদক পোর্টাল / তদন্ত সম্পাদক"
        title={
          <>
            Investigation Editors · <span className="font-bn">তদন্ত সম্পাদক</span>
            <span className="mt-1 block text-[12.5px] font-normal text-muted max-md:hidden">
              {active.length} active across {districts.length} districts · {available} on duty right now
            </span>
          </>
        }
        action={
          <div className="flex flex-wrap gap-2.5">
            <ExportRoster staff={FIELD_STAFF} />
            <Link
              href="/admin/field-staff/new"
              className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
            >
              + Add Field Staff
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
        <Link
          href="/admin/field-staff/new"
          className="inline-flex h-11 items-center justify-center rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover md:hidden"
        >
          + Add Field Staff
        </Link>

        <div className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-4">
          <Tile
            tone="bg-primary/10 text-primary"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6" cy="5.5" r="2.3" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1.8 13c.5-2.3 2.1-3.5 4.2-3.5s3.7 1.2 4.2 3.5M10.5 3.4a2.2 2.2 0 0 1 0 4.2M12 9.8c1.2.4 2 1.5 2.3 3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            chip={`${available} on duty`}
            chipCls="bg-success/10 text-success"
            value={String(active.length)}
            label={
              <>
                Active Investigation Editors · <span className="font-bn">সক্রিয়</span>
              </>
            }
            note={`${suspended} suspended · ${onLeave} on leave`}
          />
          <Tile
            tone="bg-primary/10 text-primary"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 1.8h5.2L12.5 5v9.2H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M6.2 8.5h4M6.2 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            chip={`avg ${(open / Math.max(1, active.length)).toFixed(1)} each`}
            chipCls="bg-surface text-muted"
            value={String(open)}
            label={
              <>
                Open assignments · <span className="font-bn">চলমান</span>
              </>
            }
            note={`Across ${active.length} active editors`}
          />
          <Tile
            tone="bg-success/10 text-success"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
                <path d="m5.3 8.2 1.8 1.8 3.6-3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            chip={`${Math.round(evidence / Math.max(1, FIELD_STAFF.length))} avg each`}
            chipCls="bg-success/10 text-success"
            value={evidence.toLocaleString("en-US")}
            label="Evidence items this month"
            note={`From ${FIELD_STAFF.filter((s) => s.evidenceMonth > 0).length} editors`}
          />
          <Tile
            tone="bg-danger/10 text-danger"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2 14.5 13.5h-13z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M8 6.5v3M8 11.5v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            chip="urgent"
            chipCls="bg-danger/10 text-danger"
            value={String(dueSoon)}
            label={
              <>
                Due within 48 hours · <span className="font-bn">জরুরি</span>
              </>
            }
            note={`Across ${dueStaff} editors`}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,415px)]">
          <RosterView key={initialTab} staff={FIELD_STAFF} initialTab={initialTab} limit={db.settings.rules.caseload} />

          <div className="flex flex-col gap-5">
            <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
              <h2 className="text-[15px] font-semibold text-ink">District Coverage</h2>
              <p className="mt-0.5 font-bn text-[12px] text-muted">জেলাভিত্তিক বিন্যাস</p>
              <ul className="mt-4 flex flex-col gap-4">
                {districts.map(([name, d]) => (
                  <li key={name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-bn text-[13.5px] font-semibold text-ink">{name}</span>
                      <span className="text-[12px] text-muted">
                        {d.staff} editors · {d.open} open
                      </span>
                    </div>
                    <div
                      role="meter"
                      aria-label={`${name}: ${d.staff} investigation editors`}
                      aria-valuenow={d.staff}
                      aria-valuemin={0}
                      aria-valuemax={maxStaff}
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface"
                    >
                      <div className={`h-full rounded-full ${d.staff === 1 ? "bg-warning" : "bg-primary"}`} style={{ width: `${(d.staff / maxStaff) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              {thin.length > 0 && (
                <p className="mt-4 flex gap-2 border-t border-line pt-3.5 text-[12px] leading-relaxed text-muted text-pretty">
                  <span className="text-warning" aria-hidden="true">
                    ⚠
                  </span>
                  <span>
                    <span className="font-bn">{thin.join(", ")}</span> {thin.length === 1 ? "has" : "have"} one investigation editor each. Urgent requests in those districts
                    cannot be reassigned if that person is unavailable.
                  </span>
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
              <div className="px-5 pt-4">
                <h2 className="text-[15px] font-semibold text-ink">Today&apos;s Field Activity</h2>
                <p className="mt-0.5 font-bn text-[12px] text-muted">আজকের মাঠ কার্যক্রম</p>
              </div>
              <ol className="px-5 pt-2">
                {STAFF_ACTIVITY.map((a) => (
                  <li key={a.time + a.staff} className="flex gap-3 border-b border-line py-3 last:border-b-0">
                    <span className="mt-[6px] size-2 flex-none rounded-full" style={{ background: a.dot }} aria-hidden="true" />
                    <div>
                      <Link href={`/admin/field-staff/${a.staff}`} className="text-[13px] leading-normal text-ink hover:text-primary">
                        {a.text}
                      </Link>
                      <div className="mt-0.5 text-[11.5px] text-muted">{a.time}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="border-t border-line px-5 py-3.5">
                <Link href="/admin/settings?tab=audit" className="text-[13px] font-semibold text-primary hover:text-primary-hover">
                  View full audit trail →
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
