"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo } from "./brand";
import { logout, returnToSuper, useSession } from "@/lib/auth-client";
import { useOrg } from "@/lib/db/store";
import { ProfileMenu, ProfileProvider, UserAvatar } from "./profile";

export type NavItem = {
  href: string;
  label: string;
  /** Match only this exact path (for index routes). */
  exact?: boolean;
};

export type NavGroup = { heading?: string; items: NavItem[] };

/** A bottom-tab destination for the phone layout; `icon` is a 16×16 stroke path. */
export type MobileTab = NavItem & { icon: string };

export type ShellUser = {
  initial: string;
  name: string;
  role: string;
  /** Role colour for the avatar (defaults to primary green). */
  color?: string;
};

type ShellContext = {
  openMenu: () => void;
  /** Phone app layout is on (below `md`): green app bar and bottom tabs. */
  appMode: boolean;
  user: ShellUser | null;
};

const ShellCtx = createContext<ShellContext>({ openMenu: () => {}, appMode: false, user: null });

/** 16×16 stroke icons for the sidebar, matched on the destination (most specific first). */
const NAV_ICONS: [RegExp, string][] = [
  [/\/(submissions|politicians|admins)\/new$|\/add-activity$/, "M8 3.2v9.6M3.2 8h9.6"],
  [/\/dashboard$/, "M2.4 2.4h4.8v5.2H2.4zM8.8 2.4h4.8v3.2H8.8zM8.8 7.2h4.8v6.4H8.8zM2.4 9.2h4.8v4.4H2.4z"],
  [/\/(submissions|queue)$/, "M2.4 9.6h3.2l1.2 2h2.4l1.2-2h3.2M2.4 9.6 4 3.2h8l1.6 6.4v3.6H2.4z"],
  [/\/disputes$/, "M8 1.8 15 14H1zM8 6.2v3.4M8 11.6v.2"],
  [/\/ai-review$/, "M8 1.6v2.6M8 11.8v2.6M1.6 8h2.6M11.8 8h2.6M3.5 3.5l1.8 1.8M10.7 10.7l1.8 1.8M3.5 12.5l1.8-1.8M10.7 5.3l1.8-1.8"],
  [/\/reports$/, "M3.6 2.4h5.6l3.2 3.2v8H3.6zM9.2 2.6v3.2h3.2M6 9.2h4M6 11.4h2.6"],
  [/\/(politicians|profiles)$/, "M6 7.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM1.8 13.4c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4M10.8 7a2 2 0 1 0 0-4M12.2 9.6c1.3.5 2 1.6 2 3.4"],
  [/\/field-staff$/, "M8 1.8 13.4 4v3.8c0 3-2.3 5.2-5.4 6.4-3.1-1.2-5.4-3.4-5.4-6.4V4zM6 8l1.4 1.4L10.2 6.6"],
  [/\/reviewers$/, "M2.4 8s2-4 5.6-4 5.6 4 5.6 4-2 4-5.6 4-5.6-4-5.6-4ZM8 9.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"],
  [/\/decisions$/, "M3 8.4 6.2 11.6 13 4.8"],
  [/\/area$/, "M8 14.2s4.6-4.2 4.6-7.6a4.6 4.6 0 0 0-9.2 0c0 3.4 4.6 7.6 4.6 7.6ZM8 8.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"],
  [/\/meetings$/, "M2.4 4.4h7.2v7.2H2.4zM9.6 7l4-2.4v6.8l-4-2.4"],
  [/\/activity$/, "M2 8.4h2.6l1.8-4.4 3 8 1.8-3.6H14"],
  [/\/settings$/, "M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM8 1.6v1.8M8 12.6v1.8M1.6 8h1.8M12.6 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M3.5 12.5l1.3-1.3M11.2 4.8l1.3-1.3"],
];
const navIcon = (href: string) => NAV_ICONS.find(([re]) => re.test(href))?.[1] ?? "M4 8h8";

/** The phone bottom bar shows at most this many items (the last one becomes "আরও" when there are more). */
const MAX_TABS = 4;

/** Most specific match, so /staff/submissions/new doesn't also light up /staff/submissions. */
function useActiveHref(items: NavItem[]) {
  const pathname = usePathname();
  const matches = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  return items.filter(matches).sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Ends the session and returns to the login page. */
export function SignOutButton({ children, ...props }: React.ComponentProps<"button">) {
  const router = useRouter();
  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        logout();
        router.replace("/login?signedOut=1");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}

/**
 * Role portal frame shared by every signed-in role: sidebar (brand, grouped nav, user),
 * main column and footer. Below `lg` the sidebar becomes a drawer — unless `mobileTabs` is
 * given, in which case phones (below `md`) get an app layout with bottom tabs instead.
 */
export function AppShell({
  portal,
  nav,
  user,
  footerNote,
  mobileTabs,
  settingsHref,
  photoKey,
  children,
}: {
  portal: string;
  nav: NavGroup[];
  user: ShellUser;
  /** Optional note on the left of the footer. */
  footerNote?: ReactNode;
  /** Bottom tabs for the phone layout. */
  mobileTabs?: MobileTab[];
  /** Account settings page, linked from the profile menu. */
  settingsHref?: string;
  /** Storage key for this role's profile photo. */
  photoKey: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const org = useOrg();
  const appMode = !!mobileTabs?.length;
  const activeHref = useActiveHref(nav.flatMap((g) => g.items));
  const activeTab = useActiveHref(mobileTabs ?? []);
  // Phone bottom bar: at most 4 items. With more destinations, the 4th becomes "আরও", a sheet with the rest.
  const [moreOpen, setMoreOpen] = useState(false);
  const allTabs = mobileTabs ?? [];
  const hasMore = allTabs.length > MAX_TABS;
  const barTabs = hasMore ? allTabs.slice(0, MAX_TABS - 1) : allTabs;
  const barHrefs = new Set(barTabs.map((t) => t.href));
  const moreGroups = nav.map((g) => ({ ...g, items: g.items.filter((i) => !barHrefs.has(i.href)) })).filter((g) => g.items.length);
  const moreActive = hasMore && !!activeHref && !barHrefs.has(activeHref) && !barTabs.some((t) => t.href === activeTab);

  // Close the drawer or the "আরও" sheet on Escape.
  useEffect(() => {
    if (!open && !moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, moreOpen]);

  // A suspended organisation is closed for everyone in it — even someone already signed in.
  if (org?.status === "Suspended" && session?.role !== "superadmin") return <OrgSuspended orgName={org.name} reason={org.suspendReason} acting={!!session?.actor} />;

  return (
    <ProfileProvider storageKey={photoKey} user={user} settingsHref={settingsHref}>
    <div className="flex min-h-screen bg-surface text-ink">
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-40 flex w-[248px] flex-none flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${appMode ? "max-md:hidden" : ""}`}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-5 pt-5 pb-[18px]">
          <Logo size={42} priority />
          <div className="flex flex-col gap-0.5">
            <div className="text-[16px] font-bold leading-none tracking-[0.13em] text-primary">ALARM</div>
            <div className="font-bn text-[10px] font-medium leading-normal text-muted">{portal}</div>
          </div>
        </div>

        <nav aria-label="পাশের মেনু" className="flex flex-1 flex-col overflow-y-auto px-3 pt-3 pb-4">
          {nav.map((group, gi) => (
            <div key={group.heading ?? gi} className={gi > 0 ? "mt-3.5" : ""}>
              {group.heading && (
                <div className="mb-1.5 flex items-center gap-2 px-2.5">
                  <span className="font-bn text-[11px] font-semibold whitespace-nowrap text-muted/80">{group.heading}</span>
                  <span className="h-px flex-1 bg-line/80" aria-hidden="true" />
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const on = item.href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={on ? "page" : undefined}
                        className={`group relative flex w-full items-center gap-3 rounded-[10px] px-2.5 py-[6px] text-left text-[13.5px] transition-colors ${
                          on ? "bg-primary/[0.08] font-semibold text-primary" : "font-medium text-ink/75 hover:bg-surface hover:text-ink"
                        }`}
                      >
                        {on && <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />}
                        <span
                          className={`flex size-[28px] flex-none items-center justify-center rounded-lg transition-colors ${
                            on ? "bg-primary text-white shadow-[0_2px_6px_-2px_rgba(0,106,78,0.6)]" : "bg-surface text-muted group-hover:bg-white group-hover:text-primary group-hover:ring-1 group-hover:ring-line"
                          }`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d={navIcon(item.href)} stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1 leading-[1.4]">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-[11px] border-t border-line p-3.5">
          <UserAvatar className="size-9 text-[15px]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-normal">{user.name}</div>
            <div className="text-[11.5px] leading-normal text-muted">
              {/* "role · KAR-…": the ID gets its own line so it never wraps mid-code. */}
              {user.role.split(" · ").map((part) => (
                <span key={part} className={`block truncate ${part.startsWith("KAR-") ? "font-sans font-semibold tracking-[0.02em] text-ink/70" : ""}`}>
                  {part}
                </span>
              ))}
            </div>
          </div>
          <SignOutButton
            title="Log out"
            aria-label="Log out"
            className="flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-button border border-line text-muted hover:border-danger hover:bg-danger/6 hover:text-danger"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6.4 2.4H3.6a1 1 0 0 0-1 1v9.2a1 1 0 0 0 1 1h2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M9.6 5.2 12.8 8l-3.2 2.8M12.6 8H6.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </SignOutButton>
        </div>
      </aside>

      {/* On phones in app mode, leave room for the bottom tabs. */}
      <div className={`flex min-w-0 flex-1 flex-col ${appMode ? "max-md:pb-[calc(62px+env(safe-area-inset-bottom))]" : ""}`}>
        {session?.actor && <ActingBanner orgName={org?.name ?? ""} />}
        <ShellCtx.Provider value={{ openMenu: () => setOpen(true), appMode, user }}>{children}</ShellCtx.Provider>
        <footer
          className={`print:hidden mt-auto flex flex-wrap items-center gap-x-[18px] gap-y-2 border-t border-line bg-white px-4 py-3.5 sm:px-7 ${
            appMode ? "max-md:hidden" : ""
          }`}
        >
          {footerNote && <div className="min-w-[200px] flex-1 text-[11.5px] leading-[1.65] text-muted text-pretty">{footerNote}</div>}
          <div className="ml-auto text-[11.5px] text-muted">© 2026 Alarm Bangladesh</div>
        </footer>
      </div>

      {appMode && (
        <nav
          aria-label="প্রধান মেনু"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
        >
          {barTabs.map((t) => {
            const on = t.href === activeTab && !moreActive;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex h-[62px] min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-2 px-0.5 ${
                  on ? "border-primary text-primary" : "border-transparent text-muted"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d={t.icon} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Long role names wrap onto two lines instead of running into the next tab. */}
                <span className="line-clamp-2 max-w-full text-center text-[11px] font-semibold leading-[1.2]">{t.label}</span>
              </Link>
            );
          })}
          {hasMore && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`relative flex h-[62px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-t-2 px-0.5 ${
                moreActive || moreOpen ? "border-primary text-primary" : "border-transparent text-muted"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3h3.6v3.6H3zM9.4 3H13v3.6H9.4zM3 9.4h3.6V13H3zM9.4 9.4H13V13H9.4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <span className="text-[11px] font-semibold leading-[1.2]">আরও</span>
            </button>
          )}
        </nav>
      )}

      {/* "আরও" bottom sheet: every other destination, grouped as in the sidebar. */}
      {appMode && moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden" role="dialog" aria-modal="true" aria-label="আরও মেনু">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[22px] bg-white pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.35)]">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 pt-2.5 pb-3">
              <span className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" aria-hidden="true" />
              <span className="mt-2 text-[15px] font-semibold text-ink">আরও</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="বন্ধ করুন" className="mt-2 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-3 pt-2">
              {moreGroups.map((g, gi) => (
                <div key={g.heading ?? gi} className="py-1.5">
                  {g.heading && <div className="px-2.5 pt-1.5 pb-1 font-bn text-[11.5px] font-semibold text-muted">{g.heading}</div>}
                  <ul className="grid grid-cols-1 gap-0.5">
                    {g.items.map((item) => {
                      const on = item.href === activeHref;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            aria-current={on ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-[14px] ${on ? "bg-primary/[0.08] font-semibold text-primary" : "font-medium text-ink hover:bg-surface"}`}
                          >
                            <span className={`flex size-9 flex-none items-center justify-center rounded-[10px] ${on ? "bg-primary text-white" : "bg-surface text-primary"}`}>
                              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d={navIcon(item.href)} stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                            <span className="min-w-0 flex-1">{item.label}</span>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-muted">
                              <path d="m6 3.6 4.4 4.4L6 12.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </ProfileProvider>
  );
}


/** Shown while the সুপার অ্যাডমিন works inside a প্রধান নির্বাহী সম্পাদক's account. */
function ActingBanner({ orgName }: { orgName: string }) {
  const router = useRouter();
  return (
    <div role="status" className="print:hidden flex flex-wrap items-center gap-x-3 gap-y-2 bg-[#3B2A6B] px-4 py-2.5 text-[12.5px] text-white sm:px-7">
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-white/15" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.8 13.6 4v4c0 3.2-2.4 5.4-5.6 6.2C4.8 13.4 2.4 11.2 2.4 8V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        আপনি সুপার অ্যাডমিন হিসেবে <strong className="font-semibold">{orgName}</strong>-এর প্রধান নির্বাহী সম্পাদকের অ্যাকাউন্টে কাজ করছেন।
      </span>
      <button
        type="button"
        onClick={() => {
          const to = returnToSuper();
          if (to) {
            router.replace(to);
            router.refresh();
          }
        }}
        className="h-8 cursor-pointer rounded-button bg-white px-3 text-[12.5px] font-semibold text-[#3B2A6B] hover:bg-white/90"
      >
        সুপার অ্যাডমিনে ফিরুন
      </button>
    </div>
  );
}

/** The whole organisation is suspended: nothing in it can be used until the সুপার অ্যাডমিন restores it. */
function OrgSuspended({ orgName, reason, acting }: { orgName: string; reason?: string; acting: boolean }) {
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 font-bn">
      <div role="alert" className="w-full max-w-[460px] overflow-hidden rounded-card border border-line bg-white text-center shadow-card">
        <div className="bg-danger/8 px-6 pt-7 pb-5">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/12 text-danger">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3.2" y="7" width="9.6" height="6.8" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="mt-3 text-[18px] font-semibold text-ink">সিস্টেম বন্ধ করা হয়েছে</h1>
          <p className="mt-1 text-[13px] leading-[1.7] text-muted">
            <strong className="font-semibold text-ink">{orgName}</strong>-এর পুরো সিস্টেম সুপার অ্যাডমিন বন্ধ করেছেন। আবার চালু না হওয়া পর্যন্ত কেউ এটি ব্যবহার করতে পারবেন না।
          </p>
          {reason && <p className="mt-3 rounded-button bg-white px-3 py-2 text-[12.5px] text-ink">কারণ: {reason}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-2.5 px-6 py-5">
          {acting && (
            <button
              type="button"
              onClick={() => {
                const to = returnToSuper();
                if (to) {
                  router.replace(to);
                  router.refresh();
                }
              }}
              className="h-10 cursor-pointer rounded-button bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
            >
              সুপার অ্যাডমিনে ফিরুন
            </button>
          )}
          <SignOutButton className="h-10 cursor-pointer rounded-button border border-line px-4 text-[13.5px] font-semibold text-muted hover:text-ink">লগআউট</SignOutButton>
        </div>
      </div>
    </main>
  );
}

/**
 * Sticky page header: breadcrumb, title and an optional action. Shows the drawer toggle below `lg`.
 * In app mode on phones it becomes a green app bar; the action is hidden there, since the
 * bottom tabs already cover it.
 */
export function PageHeader({
  crumb,
  title,
  action,
  backHref,
}: {
  crumb: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  /** Phone app bar back button target (app mode only). */
  backHref?: string;
}) {
  const { openMenu, appMode, user } = useContext(ShellCtx);
  return (
    <>
      <header
        className={`print:hidden sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line bg-white px-4 py-4 sm:px-7 ${
          appMode ? "max-md:gap-x-3 max-md:border-primary max-md:bg-primary max-md:py-2.5" : ""
        }`}
      >
        {/* Phone app bar, first row: the system's logo and name, with the profile menu on the right. */}
        {appMode && (
          <div className="flex w-full items-center gap-2.5 md:hidden">
            {backHref && (
              <Link href={backHref} aria-label="পেছনে" className="flex size-8 flex-none items-center justify-center rounded-button bg-white/14">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M9.6 3.4 5 8l4.6 4.6" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-white shadow-[0_2px_6px_-2px_rgba(0,0,0,0.35)]">
              <Logo size={28} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-sans text-[15px] font-bold leading-none tracking-[0.14em] text-white">ALARM</span>
              <span className="truncate text-[10.5px] leading-none text-primary-soft">অডিট ও জবাবদিহিতা প্ল্যাটফর্ম</span>
            </span>
            <ProfileMenu onDark />
          </div>
        )}

        <button
          type="button"
          onClick={openMenu}
          aria-label="মেনু খুলুন"
          className={`flex size-9 flex-none cursor-pointer items-center justify-center rounded-button border border-line text-muted hover:border-primary hover:text-primary lg:hidden ${
            appMode ? "max-md:hidden" : ""
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>


        <div className={`min-w-[200px] flex-1 ${appMode ? "max-md:hidden" : ""}`}>
          <div className={`text-[11.5px] leading-normal text-muted ${appMode ? "max-md:hidden" : ""}`}>{crumb}</div>
          <h1 className={`mt-0.5 text-[18px] font-semibold leading-[1.6] ${appMode ? "max-md:mt-0 max-md:truncate max-md:text-[15.5px] max-md:text-white" : ""}`}>
            {title}
          </h1>
          {appMode && user && (
            <div className="truncate text-[11.5px] leading-[1.55] text-primary-soft md:hidden">
              {user.name} · {user.role}
            </div>
          )}
        </div>

        {action && <div className={appMode ? "max-md:hidden" : ""}>{action}</div>}

        {/* Profile menu, top-right (in the phone app bar it sits in the brand row above). */}
        <div className={appMode ? "max-md:hidden" : ""}>
          <ProfileMenu />
        </div>
      </header>

    </>
  );
}
