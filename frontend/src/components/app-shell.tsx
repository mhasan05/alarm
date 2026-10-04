"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo } from "./brand";
import { logout } from "@/lib/auth-client";
import { ProfileMenu, ProfileProvider, UserAvatar } from "./profile";

export type NavItem = {
  href: string;
  label: string;
  /** Count shown on the right; hidden when 0. A string is shown as-is (e.g. Bengali digits). */
  badge?: number | string;
  /** Badge background colour. */
  badgeColor?: string;
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

const hasBadge = (b: NavItem["badge"]) => !!b && b !== "০";

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
  const appMode = !!mobileTabs?.length;
  const activeHref = useActiveHref(nav.flatMap((g) => g.items));
  const activeTab = useActiveHref(mobileTabs ?? []);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3.5">
          {nav.map((group, gi) => (
            <div key={group.heading ?? gi} className="flex flex-col gap-0.5">
              {group.heading && (
              <div
                className={`px-2 pt-1.5 pb-2 font-semibold text-muted ${/^[ -~]*$/.test(group.heading) ? "text-[10px] tracking-[0.09em]" : "font-bn text-[12px]"}`}
              >
                {group.heading}
              </div>
              )}
              {group.items.map((item) => {
                const on = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={on ? "page" : undefined}
                    className={`mb-0.5 flex w-full items-center gap-[11px] rounded-button border-l-[3px] px-3 py-2.5 text-left text-[13.5px] hover:bg-surface ${
                      on ? "border-primary bg-surface font-semibold text-primary" : "border-transparent font-medium text-muted"
                    }`}
                  >
                    <span className="min-w-0 flex-1 leading-normal">{item.label}</span>
                    {hasBadge(item.badge) && (
                      <span
                        className="flex-none rounded-[9px] px-[7px] py-px text-[11px] font-semibold text-white"
                        style={{ background: item.badgeColor ?? "#006A4E" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
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
          {mobileTabs!.map((t) => {
            const on = t.href === activeTab;
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
                {hasBadge(t.badge) && (
                  <span
                    className="absolute top-1.5 left-1/2 ml-2 rounded-[9px] px-1.5 text-[10px] font-semibold leading-4 text-white"
                    style={{ background: t.badgeColor ?? "#006A4E" }}
                  >
                    {t.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
    </ProfileProvider>
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
          appMode ? "max-md:flex-nowrap max-md:gap-x-3 max-md:border-primary max-md:bg-primary max-md:py-3" : ""
        }`}
      >
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

        {appMode && backHref && (
          <Link
            href={backHref}
            aria-label="পেছনে"
            className="flex size-8 flex-none items-center justify-center rounded-button bg-white/14 md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M9.6 3.4 5 8l4.6 4.6" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}

        <div className={`min-w-[200px] flex-1 ${appMode ? "max-md:min-w-0" : ""}`}>
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

        {/* Profile menu, top-right: white-on-green in the phone app bar, normal elsewhere. */}
        {appMode && (
          <div className="md:hidden">
            <ProfileMenu onDark />
          </div>
        )}
        <div className={appMode ? "max-md:hidden" : ""}>
          <ProfileMenu />
        </div>
      </header>

    </>
  );
}
