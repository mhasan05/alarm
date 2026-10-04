import type { ReactNode } from "react";
import { ChangePasswordForm } from "./change-password-form";
import { EditableAvatar } from "./profile";

type GroupIcon = "person" | "office" | "area" | "contact" | "account";

export type ProfileGroup = { title: string; icon?: GroupIcon; rows: [string, ReactNode][] };

export type StatusTone = "success" | "warning" | "danger";

const TONE: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

const ICONS: Record<GroupIcon | "lock" | "key", ReactNode> = {
  person: (
    <>
      <circle cx="10" cy="6.6" r="3" />
      <path d="M4.2 16.8c.7-3.2 2.9-4.9 5.8-4.9s5.1 1.7 5.8 4.9" strokeLinecap="round" />
    </>
  ),
  office: (
    <>
      <rect x="3.5" y="6.5" width="13" height="10" rx="1.6" />
      <path d="M7.5 6.5V4.8c0-.7.5-1.3 1.3-1.3h2.4c.8 0 1.3.6 1.3 1.3v1.7M3.5 10.8h13" strokeLinecap="round" />
    </>
  ),
  area: (
    <>
      <path d="M3.5 5.2 7.8 3.5l4.4 1.7 4.3-1.7v11.3l-4.3 1.7-4.4-1.7-4.3 1.7Z" strokeLinejoin="round" />
      <path d="M7.8 3.5v11.3M12.2 5.2v11.3" />
    </>
  ),
  contact: (
    <>
      <rect x="3" y="4.5" width="14" height="11" rx="1.6" />
      <path d="m3.6 5.4 6.4 5 6.4-5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  account: (
    <>
      <path d="M10 2.8 16 5.1v4.6c0 3.6-2.5 5.9-6 7-3.5-1.1-6-3.4-6-7V5.1Z" strokeLinejoin="round" />
      <path d="m7.4 9.8 1.8 1.8 3.4-3.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="9" width="11" height="8" rx="1.6" />
      <path d="M7 9V6.8a3 3 0 0 1 6 0V9" strokeLinecap="round" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="12.5" r="3.2" />
      <path d="m9.3 10.2 6.2-6.2M13.2 6.3l1.8 1.8M11.6 7.9l1.4 1.4" strokeLinecap="round" />
    </>
  ),
};

function Icon({ name, className = "" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={`flex-none ${className}`}>
      {ICONS[name]}
    </svg>
  );
}

function CardHead({ icon, title, subtitle }: { icon: keyof typeof ICONS; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <span className="flex size-9 flex-none items-center justify-center rounded-button bg-surface text-primary ring-1 ring-line">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-[1.5]">{title}</h2>
        {subtitle && <p className="text-[12px] leading-[1.6] text-muted text-pretty">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Settings page body shared by the role portals: an identity card, read-only profile details
 * (users can't edit their profile) and the change-password form.
 */
export function SettingsView({
  name,
  role,
  status,
  statusTone = "success",
  facts = [],
  groups,
}: {
  name: string;
  role: string;
  /** Account status line, e.g. "অনুমোদিত অ্যাকাউন্ট". */
  status: string;
  statusTone?: StatusTone;
  /** Short key facts under the name on the identity card. */
  facts?: [string, ReactNode][];
  groups: ProfileGroup[];
}) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-[22px] pb-10 sm:px-7">
      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Identity */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="relative h-[88px] overflow-hidden bg-[linear-gradient(120deg,#006A4E_0%,#045C44_50%,#003D2C_100%)]">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_18px)]" />
              <div className="absolute -top-10 -right-8 size-32 rounded-full border border-white/15" />
            </div>
            <div className="flex flex-col items-center px-5 pb-5 text-center">
              <div className="relative z-10 -mt-11 rounded-full bg-white p-1 shadow-card">
                <EditableAvatar className="size-[84px] text-[30px]" />
              </div>
              <h2 className="mt-3 text-[18px] font-semibold leading-[1.5] text-balance">{name}</h2>
              <p className="mt-0.5 text-[12.5px] leading-[1.65] text-muted text-pretty">{role}</p>
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold ${TONE[statusTone]}`}>
                <span className="size-1.5 rounded-full bg-current" />
                {status}
              </span>
              <p className="mt-2 text-[11px] leading-[1.6] text-muted">ছবি পরিবর্তন করতে ছবিতে ক্লিক করুন</p>
            </div>
            {facts.length > 0 && (
              <dl className="border-t border-line px-5 py-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2.5 last:border-b-0">
                    <dt className="text-[12px] text-muted">{label}</dt>
                    <dd className="min-w-0 text-right text-[13px] font-semibold break-words text-ink">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <div className="flex items-start gap-3 rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <Icon name="lock" className="size-4" />
            </span>
            <div>
              <div className="text-[13px] font-semibold leading-[1.5]">তথ্য সংশোধন</div>
              <p className="mt-0.5 text-[12px] leading-[1.7] text-muted text-pretty">
                প্রোফাইলের তথ্য এখান থেকে পরিবর্তন করা যায় না। কোনো তথ্য ভুল থাকলে প্রধান নির্বাহী সম্পাদককে জানান — যাচাইয়ের পর তিনি সংশোধন করবেন।
              </p>
            </div>
          </div>
        </aside>

        {/* Details */}
        <div className="flex min-w-0 flex-col gap-5">
          {groups.map((g) => (
            <section key={g.title} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
              <CardHead icon={g.icon ?? "person"} title={g.title} />
              <dl className="grid sm:grid-cols-2">
                {g.rows.map(([label, value], i) => (
                  <div
                    key={label}
                    className={`min-w-0 border-line px-5 py-3.5 ${i > 0 ? "border-t" : ""} ${i === 1 ? "sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l" : ""} ${g.rows.length % 2 === 1 && i === g.rows.length - 1 ? "sm:col-span-2" : ""}`}
                  >
                    <dt className="text-[12px] leading-[1.6] text-muted">{label}</dt>
                    <dd className={`mt-1 text-[14px] font-semibold leading-[1.6] break-words ${value ? "text-ink" : "font-normal text-placeholder"}`}>
                      {value || "দেওয়া হয়নি"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <CardHead icon="key" title="পাসওয়ার্ড পরিবর্তন" subtitle="বর্তমান পাসওয়ার্ড দিয়ে নিশ্চিত করে একটি নতুন, শক্তিশালী পাসওয়ার্ড দিন।" />
            <div className="px-5 py-5">
              <ChangePasswordForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
