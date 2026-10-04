"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { EditableAvatar } from "@/components/profile";
import { Field, inputClass, selectClass } from "@/components/form";
import { saveParties, saveSettings, setCoverage, setReviewerStatus, setStaffStatus } from "@/lib/db/actions";
import { enDateTime, enRelative } from "@/lib/db/format";
import { coverageKey, nameOf, queueFor, roleOfId } from "@/lib/db/selectors";
import { resetDb, useDb } from "@/lib/db/store";
import { DEMO_MODE } from "@/lib/demo";
import type { Database } from "@/lib/db/types";
import { auditHref, NOTIFICATION_META, PERMISSION_META, RULE_META, type UserRole } from "@/lib/settings-data";

type Account = { id: string; name: string; initials: string; email: string; role: UserRole; suspended: boolean; lastActive: string };

/** Every team account (politicians are managed under Politicians). Deactivated accounts are left out. */
function accountsOf(db: Database): Account[] {
  const last = (id: string) => {
    const a = db.audit.find((x) => x.actor === id);
    return a ? enRelative(a.at) : "—";
  };
  return [
    ...db.admins.map((a) => ({ id: a.id, name: a.name, initials: a.initials, email: a.email, role: "Chief Executive Editor" as const, suspended: false, lastActive: last(a.id) })),
    ...db.reviewers.filter((r) => r.status !== "Deactivated").map((r) => ({ id: r.id, name: r.name, initials: r.initials, email: r.email, role: "Executive Editor" as const, suspended: r.status === "Suspended", lastActive: last(r.id) })),
    ...db.staff.filter((x) => x.status !== "Deactivated").map((x) => ({ id: x.id, name: x.name, initials: x.initials, email: x.email, role: "Investigation Editor" as const, suspended: x.status === "Suspended", lastActive: last(x.id) })),
  ];
}

export const SECTIONS = {
  general: { label: "General", sub: "সাধারণ" },
  users: { label: "User Management", sub: "ব্যবহারকারী ব্যবস্থাপনা" },
  roles: { label: "Roles & Permissions", sub: "ভূমিকা ও অনুমতি" },
  coverage: { label: "Executive Editor Coverage", sub: "নির্বাহী সম্পাদকের এলাকা" },
  parties: { label: "Parties & Organisations", sub: "দল ও সংগঠন" },
  rules: { label: "Audit Configuration", sub: "নিরীক্ষার নিয়ম" },
  notifications: { label: "Notification Settings", sub: "বিজ্ঞপ্তি" },
  audit: { label: "Security & Audit Log", sub: "নিরাপত্তা ও অডিট লগ" },
  system: { label: "System Info", sub: "সিস্টেমের তথ্য" },
} as const;
export type Section = keyof typeof SECTIONS;


const ROLE_STYLE: Record<UserRole, string> = {
  "Chief Executive Editor": "bg-primary/10 text-primary",
  "Executive Editor": "bg-role-reviewer/10 text-role-reviewer",
  "Investigation Editor": "bg-warning/10 text-warning",
};

const today = () => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date());

const card = "overflow-hidden rounded-card border border-line bg-white shadow-card";

function Head({ section, extra, action }: { section: Section; extra?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{SECTIONS[section].label}</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          <span className="font-bn">{SECTIONS[section].sub}</span>
          {extra && ` · ${extra}`}
        </p>
      </div>
      {action}
    </div>
  );
}

/** Save / discard bar for a section's unsaved changes. */
function SaveBar({ section, dirty, admin, onSave, onDiscard, saved }: { section: Section; dirty: boolean; admin: string; onSave: () => void; onDiscard: () => void; saved: boolean }) {
  return (
    <div className={`${card} flex flex-wrap items-center gap-3 px-5 py-4`}>
      <p role="status" className="min-w-[220px] flex-1 text-[12.5px] leading-normal text-muted">
        {dirty ? (
          <span className="font-semibold text-warning">Unsaved changes. </span>
        ) : saved ? (
          <span className="font-semibold text-success">Saved. </span>
        ) : null}
        Changes to {SECTIONS[section].label} are written to the audit log under {admin} (Admin) · {today()}.
      </p>
      <button type="button" disabled={!dirty} onClick={onDiscard} className="h-10 cursor-pointer px-3 text-[13.5px] font-semibold text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
        Discard
      </button>
      <button
        type="button"
        disabled={!dirty}
        onClick={onSave}
        className="h-10 cursor-pointer rounded-button bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save changes
      </button>
    </div>
  );
}

/** Staged edits: `draft` is what the admin sees, `saved` what is stored; Save commits, Discard reverts. */
function useStaged<T>(initial: T, commit: (value: T) => void) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  return {
    draft,
    setDraft: (fn: (d: T) => T) => {
      setJustSaved(false);
      setDraft(fn);
    },
    dirty,
    justSaved,
    save: () => {
      commit(draft);
      setSaved(draft);
      setJustSaved(true);
    },
    discard: () => setDraft(saved),
  };
}

export function AdminSettings({ initial, admin, adminId }: { initial: Section; admin: string; adminId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [section, setSection] = useState<Section>(initial);
  const db = useDb();
  const COUNTS: Partial<Record<Section, string>> = {
    users: String(accountsOf(db).length),
    roles: "3",
    coverage: String(db.reviewers.length),
    parties: String(db.parties.length),
    system: "v3.0",
  };

  const go = (s: Section) => {
    setSection(s);
    router.replace(s === "users" ? pathname : `${pathname}?tab=${s}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className={`${card} p-2 lg:sticky lg:top-24`}>
        <label className="block p-2 lg:hidden">
          <span className="sr-only">Settings section</span>
          <select value={section} onChange={(e) => go(e.target.value as Section)} className={selectClass}>
            {(Object.keys(SECTIONS) as Section[]).map((s) => (
              <option key={s} value={s}>
                {SECTIONS[s].label}
              </option>
            ))}
          </select>
        </label>
        <ul className="max-lg:hidden">
          {(Object.keys(SECTIONS) as Section[]).map((s) => {
            const on = s === section;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => go(s)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-button border-l-[3px] px-3.5 py-2.5 text-left text-[13.5px] ${
                    on ? "border-primary bg-surface font-semibold text-primary" : "border-transparent text-muted hover:bg-surface/60 hover:text-ink"
                  }`}
                >
                  {SECTIONS[s].label}
                  {COUNTS[s] && <span className="text-[11.5px] font-medium text-muted">{COUNTS[s]}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Keyed so leaving a section drops its unsaved edits. */}
      <div key={section} className="flex min-w-0 flex-col gap-5">
        {section === "general" && <General admin={admin} adminId={adminId} />}
        {section === "users" && <Users admin={admin} adminId={adminId} />}
        {section === "roles" && <Roles admin={admin} adminId={adminId} />}
        {section === "coverage" && <Coverage admin={admin} adminId={adminId} />}
        {section === "parties" && <Parties admin={admin} adminId={adminId} />}
        {section === "rules" && <Rules admin={admin} adminId={adminId} />}
        {section === "notifications" && <Notifications admin={admin} adminId={adminId} />}
        {section === "audit" && <AuditLog admin={admin} adminId={adminId} />}
        {section === "system" && <SystemInfo />}
      </div>
    </div>
  );
}

// ── General ──────────────────────────────────────────────────────────────────

function General({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const g = db.settings;
  const email = db.admins.find((a) => a.id === adminId)?.email ?? "";
  const s = useStaged({ org: g.org, language: g.language as string, timezone: g.timezone, footer: g.footer }, (v) =>
    saveSettings({ org: v.org, language: v.language as "bn" | "en", timezone: v.timezone, footer: v.footer }, adminId, "general"),
  );
  const set = (k: keyof typeof s.draft) => (v: string) => s.setDraft((d) => ({ ...d, [k]: v }));
  return (
    <>
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3.5 border-b border-line px-5 py-4">
          <EditableAvatar />
          <div className="min-w-[160px] flex-1">
            <h2 className="text-[16px] font-semibold text-ink">{admin}</h2>
            <p className="text-[12px] text-muted">
              Chief Executive Editor · {adminId} · {email}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11.5px] font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Active account
          </span>
        </div>
        <div className="px-5 py-5">
          <h3 className="text-[13.5px] font-semibold text-ink">
            Change password · <span className="font-bn">পাসওয়ার্ড পরিবর্তন</span>
          </h3>
          <div className="mt-3 max-w-xl">
            <ChangePasswordForm />
          </div>
        </div>
      </section>

      <section className={card}>
        <Head section="general" extra="organisation" />
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <Field id="g-org" label="Organisation name">
            <input id="g-org" value={s.draft.org} onChange={(e) => set("org")(e.target.value)} className={inputClass} />
          </Field>
          <Field id="g-lang" label="Report language">
            <select id="g-lang" value={s.draft.language} onChange={(e) => set("language")(e.target.value)} className={selectClass}>
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field id="g-tz" label="Time zone" hint="Used for dates on reports and the audit log.">
            <select id="g-tz" value={s.draft.timezone} onChange={(e) => set("timezone")(e.target.value)} className={selectClass}>
              <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <Field id="g-footer" label="Report footer" hint="Printed at the bottom of every final report.">
            <textarea id="g-footer" rows={3} value={s.draft.footer} onChange={(e) => set("footer")(e.target.value)} className={`${inputClass} h-auto resize-y py-2.5 font-bn`} />
          </Field>
        </div>
      </section>
      <SaveBar section="general" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── User Management ──────────────────────────────────────────────────────────

const PAGE = 6;

function Users({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const ACCOUNTS = accountsOf(db);
  const s = useStaged<Account[]>(ACCOUNTS, (draft) => {
    const kept = new Map(draft.map((a) => [a.id, a]));
    for (const a of ACCOUNTS) {
      if (a.role === "Chief Executive Editor") continue;
      const next = kept.get(a.id);
      const set = a.role === "Executive Editor" ? setReviewerStatus : setStaffStatus;
      if (!next) set(a.id, adminId, "Deactivated" as never);
      else if (next.suspended !== a.suspended) set(a.id, adminId, (next.suspended ? "Suspended" : a.role === "Executive Editor" ? "Active" : "On duty") as never);
    }
  });
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = s.draft.filter((a) => (role === "all" || a.role === role) && (!q || `${a.name} ${a.email} ${a.id}`.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);
  const original = new Map(ACCOUNTS.map((a) => [a.id, a]));

  const toggle = (id: string) => s.setDraft((d) => d.map((a) => (a.id === id ? { ...a, suspended: !a.suspended } : a)));
  const remove = (id: string) => {
    s.setDraft((d) => d.filter((a) => a.id !== id));
    setConfirmDelete(null);
  };

  const removed = ACCOUNTS.length - s.draft.length;

  return (
    <>
      <section className={card}>
        <Head
          section="users"
          extra={`${s.draft.length} accounts`}
          action={
            <Link href="/admin/field-staff/new" className="inline-flex h-10 items-center rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
              + Add New User
            </Link>
          }
        />
        <div className="flex flex-wrap gap-2.5 border-b border-line px-5 py-3.5">
          <label className="flex h-10 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-input border border-line px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,106,78,0.10)]">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none text-muted">
              <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
              <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Search accounts</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, email or ID…"
              className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-placeholder"
            />
          </label>
          <label className="w-[150px]">
            <span className="sr-only">Filter by role</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as typeof role);
                setPage(0);
              }}
              className={`${selectClass} h-10 font-sans`}
            >
              <option value="all">All roles</option>
              <option>Chief Executive Editor</option>
              <option>Executive Editor</option>
              <option>Investigation Editor</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">NAME</th>
                <th scope="col" className="px-3 py-3 font-semibold">EMAIL</th>
                <th scope="col" className="px-3 py-3 font-semibold">ROLE</th>
                <th scope="col" className="px-3 py-3 font-semibold">STATUS</th>
                <th scope="col" className="px-3 py-3 font-semibold">LAST ACTIVE</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const you = a.id === adminId;
                const changed = original.get(a.id)?.suspended !== a.suspended;
                const staff = a.role === "Investigation Editor";
                const base = staff ? "/admin/field-staff" : a.role === "Executive Editor" ? "/admin/reviewers" : null;
                return (
                  <tr key={a.id} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <span className={`flex size-8 flex-none items-center justify-center rounded-full text-[11.5px] font-semibold ${ROLE_STYLE[a.role]}`}>{a.initials}</span>
                        <div>
                          {base ? (
                            <Link href={`${base}/${a.id}`} className="whitespace-nowrap text-[13.5px] font-semibold text-ink hover:text-primary">
                              {a.name}
                            </Link>
                          ) : (
                            <div className="whitespace-nowrap text-[13.5px] font-semibold text-ink">{a.name}</div>
                          )}
                          <div className="text-[11.5px] text-muted">
                            {a.id}
                            {you && " · you"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[210px] truncate px-3 py-3 align-middle text-[13px] text-ink">{a.email}</td>
                    <td className="px-3 py-3 align-middle">
                      <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold ${ROLE_STYLE[a.role]}`}>{a.role}</span>
                    </td>
                    <td className="px-3 py-3 align-middle text-[13px]">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`size-1.5 rounded-full ${a.suspended ? "bg-danger" : "bg-success"}`} aria-hidden="true" />
                        {a.suspended ? "Suspended" : "Active"}
                        {changed && <span className="text-[11px] font-semibold text-warning">· unsaved</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-middle text-[13px] text-muted">{a.lastActive}</td>
                    <td className="px-5 py-3 align-middle">
                      {confirmDelete === a.id ? (
                        <div className="flex items-center justify-end gap-2" role="group" aria-label={`Confirm removing ${a.name}`}>
                          <span className="text-[12px] text-danger">Remove?</span>
                          <button type="button" onClick={() => remove(a.id)} className="h-8 cursor-pointer rounded-button bg-danger px-2.5 text-[12px] font-semibold text-white hover:bg-danger-hover">
                            Remove
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="h-8 cursor-pointer rounded-button border border-line px-2.5 text-[12px] font-semibold text-ink">
                            Keep
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {base ? (
                            <Link href={`${base}/new?edit=${a.id}`} className="inline-flex h-8 items-center rounded-button border border-line px-2.5 text-[12px] font-semibold text-primary hover:border-primary">
                              Edit
                            </Link>
                          ) : (
                            <span
                              title="Your own details are edited under General"
                              className="inline-flex h-8 cursor-not-allowed items-center rounded-button border border-line px-2.5 text-[12px] font-semibold text-muted opacity-60"
                            >
                              Edit
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={you}
                            onClick={() => toggle(a.id)}
                            title={you ? "You can't suspend your own account" : undefined}
                            className={`h-8 cursor-pointer rounded-button border px-2.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                              a.suspended ? "border-danger/40 text-danger hover:bg-danger/5" : "border-warning/40 text-warning hover:bg-warning/5"
                            }`}
                          >
                            {a.suspended ? "Restore" : "Suspend"}
                          </button>
                          <button
                            type="button"
                            disabled={you}
                            onClick={() => setConfirmDelete(a.id)}
                            aria-label={`Remove ${a.name}`}
                            title={you ? "You can't remove your own account" : "Remove account"}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-button border border-danger/40 text-danger hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-muted">
                    No account matches this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <p className="text-[13px] text-muted">
            Showing {shown.length} of {rows.length} accounts
            {removed > 0 && <span className="font-semibold text-warning"> · {removed} marked for removal</span>}
          </p>
          <nav aria-label="Pages" className="flex gap-1.5">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="h-8 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
              Previous
            </button>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === current ? "page" : undefined}
                onClick={() => setPage(i)}
                className={`size-8 cursor-pointer rounded-button border text-[12.5px] font-semibold ${i === current ? "border-primary bg-primary text-white" : "border-line text-ink"}`}
              >
                {i + 1}
              </button>
            ))}
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="h-8 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
              Next
            </button>
          </nav>
        </div>
      </section>
      <SaveBar section="users" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── Roles & Permissions ──────────────────────────────────────────────────────

const ROLE_KEY: Record<UserRole, "admin" | "reviewer" | "staff"> = { "Chief Executive Editor": "admin", "Executive Editor": "reviewer", "Investigation Editor": "staff" };

function Roles({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const s = useStaged(db.settings.permissions, (v) => saveSettings({ permissions: v }, adminId, "roles & permissions"));
  const roles: UserRole[] = ["Chief Executive Editor", "Executive Editor", "Investigation Editor"];
  const PERMISSIONS = PERMISSION_META;
  return (
    <>
      <section className={card}>
        <Head section="roles" extra="3 roles" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">PERMISSION</th>
                {roles.map((r) => (
                  <th key={r} scope="col" className="px-3 py-3 text-center font-semibold">
                    <span className={`rounded-md px-2 py-0.5 ${ROLE_STYLE[r]}`}>{r}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.label} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 text-[13px] text-ink">
                    <span className="mr-2 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{p.area}</span>
                    {p.label}
                    {p.locked && <span className="ml-2 text-[11px] text-muted">· fixed by policy</span>}
                  </td>
                  {roles.map((r) => (
                    <td key={r} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!s.draft[p.key]?.[ROLE_KEY[r]]}
                        disabled={p.locked}
                        onChange={() => s.setDraft((d) => ({ ...d, [p.key]: { ...d[p.key], [ROLE_KEY[r]]: !d[p.key]?.[ROLE_KEY[r]] } }))}
                        aria-label={`${r}: ${p.label}`}
                        className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-[12px] text-muted">
          Investigation editors never see executive editor names, and executive editors see a source label instead of investigation editor names — these follow from the permissions above.
        </p>
      </section>
      <SaveBar section="roles" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── Reviewer Coverage ────────────────────────────────────────────────────────

function Coverage({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const COVERAGE = db.reviewers.map((r) => ({ id: r.id, name: r.name, status: r.status, areas: r.areas, queue: queueFor(db, r.id).length }));
  const s = useStaged(
    COVERAGE.map((c) => c.areas),
    (v) => v.forEach((areas, i) => JSON.stringify(areas) !== JSON.stringify(COVERAGE[i].areas) && setCoverage(COVERAGE[i].id, areas, adminId)),
  );
  // Known areas: every profile's and staff member's district · thana.
  const known = [...new Set([...db.profiles.map(coverageKey), ...db.staff.map((x) => `${x.district} · ${x.thana}`)])].sort();
  const [adding, setAdding] = useState<Record<string, string>>({});
  return (
    <>
      <section className={card}>
        <Head section="coverage" extra={`${COVERAGE.length} executive editors`} />
        <ul>
          {COVERAGE.map((c, i) => (
            <li key={c.id} className="border-b border-line px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-ink">{c.name}</div>
                  <div className="text-[12px] text-muted">
                    {c.id} · {c.status} · {c.queue} waiting in queue
                  </div>
                </div>
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {s.draft[i].map((a) => (
                  <li key={a} className="inline-flex items-center gap-1.5 rounded-md bg-surface py-1 pr-1 pl-2.5 font-bn text-[12.5px] text-ink">
                    {a}
                    <button
                      type="button"
                      onClick={() => s.setDraft((d) => d.map((areas, j) => (j === i ? areas.filter((x) => x !== a) : areas)))}
                      aria-label={`Remove ${a} from ${c.name}`}
                      className="flex size-5 cursor-pointer items-center justify-center rounded text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}
                {s.draft[i].length === 0 && <li className="text-[12.5px] text-danger">No area — this executive editor will get no submissions.</li>}
              </ul>
              <form
                className="mt-2.5 flex max-w-md gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = (adding[c.id] ?? "").trim();
                  if (!v || s.draft[i].includes(v)) return;
                  s.setDraft((d) => d.map((areas, j) => (j === i ? [...areas, v] : areas)));
                  setAdding((m) => ({ ...m, [c.id]: "" }));
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Add an area for {c.name}</span>
                  <input
                    list="coverage-areas"
                    value={adding[c.id] ?? ""}
                    onChange={(e) => setAdding((m) => ({ ...m, [c.id]: e.target.value }))}
                    placeholder="জেলা · থানা"
                    className={`${inputClass} h-9 font-bn text-[13px]`}
                  />
                </label>
                <button type="submit" className="h-9 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary">
                  Add area
                </button>
              </form>
            </li>
          ))}
        </ul>
        <datalist id="coverage-areas">
          {known.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </section>
      <SaveBar section="coverage" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── Parties & Organisations ──────────────────────────────────────────────────

function Parties({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const uses = (name: string) => db.reports.filter((r) => r.requester === name).length + db.profiles.filter((p) => p.party === name).length;
  const s = useStaged(
    db.parties.map((p) => ({ ...p, requests: uses(p.name) })),
    (v) => saveParties(v.map(({ name, kind }) => ({ name, kind })), adminId),
  );
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"Party" | "Organisation">("Party");
  const [error, setError] = useState("");
  const add = () => {
    const v = name.trim();
    if (!v) return setError("Enter a name.");
    if (s.draft.some((p) => p.name === v)) return setError("Already in the list.");
    s.setDraft((d) => [...d, { name: v, kind, requests: 0 }]);
    setName("");
    setError("");
  };
  return (
    <>
      <section className={card}>
        <Head section="parties" extra={`${s.draft.length} entries`} />
        <form
          className="flex flex-wrap items-start gap-2.5 border-b border-line px-5 py-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="min-w-0 flex-[1_1_240px]">
            <span className="sr-only">Party or organisation name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম লিখুন" aria-invalid={!!error} className={`${inputClass} h-10 font-bn ${error ? "border-danger!" : ""}`} />
            {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
          </label>
          <label className="w-[160px]">
            <span className="sr-only">Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={`${selectClass} h-10 font-sans`}>
              <option>Party</option>
              <option>Organisation</option>
            </select>
          </label>
          <button type="submit" className="h-10 cursor-pointer rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
            Add
          </button>
        </form>
        <ul>
          {s.draft.map((p) => (
            <li key={p.name} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
              <span className="min-w-0 flex-1 font-bn text-[13.5px] text-ink">{p.name}</span>
              <span className="rounded-md bg-surface px-2 py-0.5 text-[11.5px] text-muted">{p.kind}</span>
              <span className="w-[92px] text-right text-[12px] text-muted">{p.requests} in use</span>
              <button
                type="button"
                disabled={p.requests > 0}
                title={p.requests > 0 ? "In use by profiles or reports — can't be removed" : "Remove"}
                onClick={() => s.setDraft((d) => d.filter((x) => x.name !== p.name))}
                aria-label={`Remove ${p.name}`}
                className="flex size-8 cursor-pointer items-center justify-center rounded-button border border-line text-muted hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
      <SaveBar section="parties" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── Audit Configuration ──────────────────────────────────────────────────────

function Rules({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const RULES = RULE_META;
  const s = useStaged(Object.fromEntries(RULES.map((r) => [r.key, String(db.settings.rules[r.key])])) as Record<string, string>, (v) =>
    saveSettings({ rules: { sources: Number(v.sources), dispute: Number(v.dispute), caseload: Number(v.caseload), window: Number(v.window) } }, adminId, "audit rules"),
  );
  const invalid = RULES.filter((r) => {
    const n = Number(s.draft[r.key]);
    return !Number.isInteger(n) || n < r.min || n > r.max;
  }).map((r) => r.key);
  return (
    <>
      <section className={card}>
        <Head section="rules" extra="applies to new audits" />
        <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-2">
          {RULES.map((r) => {
            const bad = invalid.includes(r.key);
            return (
              <Field
                key={r.key}
                id={`r-${r.key}`}
                label={r.label}
                hint={bad ? `Enter a whole number from ${r.min} to ${r.max}.` : r.note}
                hintClassName={bad ? "text-danger" : "text-muted"}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    id={`r-${r.key}`}
                    type="number"
                    inputMode="numeric"
                    min={r.min}
                    max={r.max}
                    value={s.draft[r.key]}
                    onChange={(e) => s.setDraft((d) => ({ ...d, [r.key]: e.target.value }))}
                    aria-invalid={bad}
                    className={`${inputClass} w-[120px] ${bad ? "border-danger!" : ""}`}
                  />
                  <span className="text-[13px] text-muted">{r.unit}</span>
                </div>
              </Field>
            );
          })}
        </div>
      </section>
      <SaveBar section="rules" dirty={s.dirty && invalid.length === 0} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── Notification Settings ────────────────────────────────────────────────────

function Notifications({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const s = useStaged(
    NOTIFICATION_META.map((n) => ({ ...n, sms: db.settings.notifications[n.key]?.sms ?? false, email: db.settings.notifications[n.key]?.email ?? false })),
    (v) => saveSettings({ notifications: Object.fromEntries(v.map((n) => [n.key, { sms: n.sms, email: n.email }])) }, adminId, "notifications"),
  );
  const flip = (key: string, ch: "sms" | "email") => s.setDraft((d) => d.map((n) => (n.key === key ? { ...n, [ch]: !n[ch] } : n)));
  return (
    <>
      <section className={card}>
        <Head section="notifications" extra="sent to the chief executive editor" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">EVENT</th>
                <th scope="col" className="w-24 px-3 py-3 text-center font-semibold">SMS</th>
                <th scope="col" className="w-24 px-5 py-3 text-center font-semibold">EMAIL</th>
              </tr>
            </thead>
            <tbody>
              {s.draft.map((n) => (
                <tr key={n.key} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 text-[13px] text-ink">{n.label}</td>
                  {(["sms", "email"] as const).map((ch) => (
                    <td key={ch} className="px-3 py-3 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={n[ch]}
                        aria-label={`${ch.toUpperCase()}: ${n.label}`}
                        onClick={() => flip(n.key, ch)}
                        className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors ${n[ch] ? "bg-primary" : "bg-line"}`}
                      >
                        <span className={`size-4 rounded-full bg-white shadow transition-transform ${n[ch] ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <SaveBar section="notifications" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />
    </>
  );
}

// ── Security & Audit Log ─────────────────────────────────────────────────────

const ROLE_LABEL = { admin: "Chief Executive Editor", reviewer: "Executive Editor", staff: "Investigation Editor", politician: "Political Activist", system: "System" } as const;

function AuditLog({ admin, adminId }: { admin: string; adminId: string }) {
  const db = useDb();
  const s = useStaged({ twoFactor: db.settings.security.twoFactor, timeout: String(db.settings.security.timeout) }, (v) =>
    saveSettings({ security: { twoFactor: v.twoFactor, timeout: Number(v.timeout) } }, adminId, "security"),
  );
  const [who, setWho] = useState<"all" | string>("all");
  const roles = ["Chief Executive Editor", "Executive Editor", "Investigation Editor", "Political Activist", "System"];
  const all = db.audit.map((e) => ({ when: enDateTime(e.at), actor: nameOf(db, e.actor), role: ROLE_LABEL[roleOfId(db, e.actor)], action: e.action, target: e.target }));
  const rows = all.filter((e) => who === "all" || e.role === who).slice(0, 200);

  const exportCsv = () => {
    const csv = [["When", "Actor", "Role", "Action", "Target"], ...rows.map((e) => [e.when, e.actor, e.role, e.action, e.target])]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `alarm-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className={card}>
        <Head section="audit" extra="security" />
        <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-4 rounded-card border border-line px-4 py-3.5">
            <div>
              <div className="text-[13.5px] font-semibold text-ink">Two-step sign-in for chief executive and executive editors</div>
              <p className="mt-0.5 text-[12px] text-muted">An SMS code is required on every new device.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={s.draft.twoFactor}
              aria-label="Two-step sign-in"
              onClick={() => s.setDraft((d) => ({ ...d, twoFactor: !d.twoFactor }))}
              className={`relative mt-1 inline-flex h-5 w-9 flex-none cursor-pointer items-center rounded-full ${s.draft.twoFactor ? "bg-primary" : "bg-line"}`}
            >
              <span className={`size-4 rounded-full bg-white shadow transition-transform ${s.draft.twoFactor ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </button>
          </div>
          <Field id="sec-timeout" label="Sign out after inactivity">
            <select id="sec-timeout" value={s.draft.timeout} onChange={(e) => s.setDraft((d) => ({ ...d, timeout: e.target.value }))} className={`${selectClass} font-sans`}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </Field>
        </div>
      </section>
      <SaveBar section="audit" dirty={s.dirty} saved={s.justSaved} admin={admin} onSave={s.save} onDiscard={s.discard} />

      <section id="audit-log" className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Audit log</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              <span className="font-bn">অডিট লগ</span> · every decision, with account and time · read-only
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label>
              <span className="sr-only">Filter by role</span>
              <select value={who} onChange={(e) => setWho(e.target.value)} className={`${selectClass} h-9 w-[150px] font-sans text-[13px]`}>
                <option value="all">Everyone</option>
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={exportCsv} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary">
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-[11px] font-semibold tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">WHEN</th>
                <th scope="col" className="px-3 py-3 font-semibold">WHO</th>
                <th scope="col" className="px-3 py-3 font-semibold">ACTION</th>
                <th scope="col" className="px-5 py-3 font-semibold">TARGET</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => {
                const href = auditHref(e.target, db);
                return (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <td className="whitespace-nowrap px-5 py-3 text-[12.5px] text-muted">{e.when}</td>
                    <td className="px-3 py-3 text-[13px]">
                      <div className="font-bn font-semibold text-ink">{e.actor}</div>
                      <div className="text-[11.5px] text-muted">{e.role}</div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-ink">{e.action}</td>
                    <td className="px-5 py-3 font-bn text-[12.5px]">
                      {href ? (
                        <Link href={href} className="font-semibold text-primary hover:text-primary-hover">
                          {e.target}
                        </Link>
                      ) : (
                        <span className="text-ink">{e.target}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-[12px] text-muted">
          Entries can&apos;t be edited or deleted. Showing {rows.length} of {all.length}.
        </p>
      </section>
    </>
  );
}

// ── System Info ──────────────────────────────────────────────────────────────

function SystemInfo() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const rows: [string, string][] = [
    ["Version", "ALARM v1.0 · web"],
    ["Portals", "Chief Executive Editor · Executive Editor · Investigation Editor · Political Activist"],
    ["Languages", "বাংলা · English"],
  ];
  return (
    <section className={card}>
      <Head section="system" />
      <dl className="px-5 py-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-2 border-b border-line py-3 last:border-b-0">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="text-[13px] font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {DEMO_MODE && (
      <div className="border-t border-line px-5 py-4">
        <h3 className="text-[13.5px] font-semibold text-ink">Demo data</h3>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted text-pretty">
          This preview keeps its data in the browser. Resetting restores the original sample records for every portal on this device.
        </p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-danger">Reset all changes made on this device?</span>
            <button
              type="button"
              onClick={() => {
                resetDb();
                setConfirming(false);
                setDone(true);
              }}
              className="h-9 cursor-pointer rounded-button bg-danger px-3.5 text-[12.5px] font-semibold text-white hover:bg-danger-hover"
            >
              Reset
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-muted">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
              setDone(false);
            }}
            className="mt-3 h-9 cursor-pointer rounded-button border border-danger/50 px-3.5 text-[12.5px] font-semibold text-danger hover:bg-danger/5"
          >
            Reset demo data
          </button>
        )}
        {done && (
          <p role="status" className="mt-2 text-[12px] text-success">
            Sample data restored.
          </p>
        )}
      </div>
      )}
    </section>
  );
}
