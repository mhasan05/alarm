"use client";

import { useEffect, useState } from "react";

const TABS = [
  { id: "top", label: "হোম", icon: "M2.6 7.4 8 2.8l5.4 4.6v6H9.8V9.8H6.2v3.6H2.6z" },
  { id: "how", label: "কীভাবে", icon: "M3 3.2h10M3 8h10M3 12.8h6" },
  { id: "roles", label: "ভূমিকা", icon: "M6 7.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM1.8 13.4c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4M10.8 7a2 2 0 1 0 0-4M12.2 9.6c1.3.5 2 1.6 2 3.4" },
  { id: "faq", label: "প্রশ্ন", icon: "M6 6a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.3v.5M8 11.8v.2M8 14.4A6.4 6.4 0 1 0 8 1.6a6.4 6.4 0 0 0 0 12.8Z" },
] as const;

/** Phone-only bottom tab bar, like a mobile app: jumps between sections and highlights the one in view. */
export function HomeTabBar() {
  const [active, setActive] = useState<string>("top");

  useEffect(() => {
    const sections = TABS.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="অ্যাপ মেনু" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[560px]">
        {TABS.map((t) => {
          const on = active === t.id;
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              aria-current={on ? "true" : undefined}
              className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? "text-primary" : "text-muted"}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-primary/12" : ""}`}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d={t.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {t.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
