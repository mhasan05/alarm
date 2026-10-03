import type { ReactNode } from "react";
import { bnOf } from "@/lib/geo";

// Shared dashboard charts. The design system's green/red pair fails red–green CVD separation,
// so the second series is always hatched, sits in a fixed position (on top), and every value
// is also available as text (tooltip + hidden table).

export const hatch = (color: string) => `repeating-linear-gradient(45deg, ${color} 0 3px, color-mix(in srgb, ${color} 55%, white) 3px 6px)`;

export function ChartCard({ title, sub, children, className = "" }: { title: string; sub: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-card border border-line bg-white px-[22px] py-5 shadow-card ${className}`}>
      <h2 className="text-[14.5px] font-semibold leading-[1.6]">{title}</h2>
      <p className="mt-0.5 text-[12px] leading-[1.65] text-muted">{sub}</p>
      {children}
    </section>
  );
}

type Series = { label: string; color: string };

/**
 * Stacked daily bars: `base` at the bottom (solid), `top` above it (hatched), a 2px gap between,
 * the day total above each bar, a hover tooltip with exact values, a legend, and a hidden table.
 */
export function StackedDayChart({
  caption,
  days,
  base,
  top,
  footnote,
  height = 140,
}: {
  caption: string;
  days: [label: string, base: number, top: number][];
  base: Series;
  top: Series;
  footnote?: ReactNode;
  height?: number;
}) {
  const max = Math.max(1, ...days.map(([, a, b]) => a + b));
  const total = days.reduce((n, [, a, b]) => n + a + b, 0);
  const topFill = hatch(top.color);

  return (
    <>
      <div className="mt-5 flex min-h-[180px] flex-1 items-end gap-2 sm:gap-3" role="img" aria-label={`${caption} · মোট ${bnOf(total)}`}>
        {days.map(([day, a, b]) => (
          <div key={day} className="group relative flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-button border border-line bg-white px-2.5 py-1.5 text-[11.5px] shadow-card group-hover:block">
              <div className="font-semibold">{day}</div>
              <div className="text-muted">
                {base.label} {bnOf(a)} · {top.label} {bnOf(b)}
              </div>
            </div>
            <div className="text-[11px] font-semibold text-ink">{a + b ? bnOf(a + b) : "—"}</div>
            <div className="flex w-full flex-col justify-end gap-0.5 rounded-t group-hover:bg-surface" style={{ height }}>
              {b > 0 && <div className="w-full rounded-t" style={{ height: Math.round((b / max) * height), background: topFill }} />}
              {a > 0 && (
                <div className={`w-full ${b ? "" : "rounded-t"}`} style={{ height: Math.round((a / max) * height), background: base.color }} />
              )}
            </div>
            <div className="whitespace-nowrap text-[11px] leading-normal text-muted">{day}</div>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>দিন</th>
            <th>{base.label}</th>
            <th>{top.label}</th>
          </tr>
        </thead>
        <tbody>
          {days.map(([day, a, b]) => (
            <tr key={day}>
              <td>{day}</td>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap gap-x-[18px] gap-y-2 border-t border-[#E3EEEA] pt-3.5 text-[11.5px] text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: base.color }} />
          {base.label}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: topFill }} />
          {top.label}
        </span>
        <span className="min-w-2 flex-1" />
        {footnote && <span>{footnote}</span>}
      </div>
    </>
  );
}

/** Horizontal meter row: label, value text, and a bar on a track. */
export function Meter({ label, value, pct, color, dot }: { label: string; value: string; pct: number; color: string; dot?: boolean }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="flex min-w-0 items-center gap-2">
          {dot && <span className="size-[9px] flex-none rounded-full" style={{ background: color }} />}
          <span className="truncate text-[12.5px] font-semibold">{label}</span>
        </span>
        <span className="whitespace-nowrap text-[11.5px] text-muted">{value}</span>
      </div>
      <div className="mt-[7px] h-2 overflow-hidden rounded bg-[#E3EEEA]">
        <div className="h-full rounded" style={{ width: `${Math.max(pct, 3)}%`, background: color }} />
      </div>
    </li>
  );
}

/** Stat tile grid: compact 2×2 on phones, full cards from md up. Tiles with `href` are links. */
export function StatTiles({
  stats,
  linkAs: LinkComp,
}: {
  stats: { label: string; value: number | string; color: string; note: ReactNode; href?: string }[];
  /** Pass next/link's Link to make tiles with `href` navigable. */
  linkAs?: React.ComponentType<{ href: string; className?: string; children: ReactNode }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(185px,1fr))] md:gap-4">
      {stats.map((st) => {
        const body = (
          <>
            <div className="text-[11.5px] font-semibold leading-[1.6] text-muted">{st.label}</div>
            <div className="mt-1.5 text-[22px] font-bold leading-none tracking-[-0.02em] md:mt-2 md:text-[28px]" style={{ color: st.color }}>
              {typeof st.value === "number" ? bnOf(st.value) : st.value}
            </div>
            <div className="mt-1.5 hidden text-[11.5px] leading-[1.6] text-muted text-pretty md:block">{st.note}</div>
          </>
        );
        const cls = "block rounded-card border border-line bg-white p-3 text-ink shadow-card md:p-[18px]";
        return st.href && LinkComp ? (
          <LinkComp key={st.label} href={st.href} className={`${cls} hover:border-primary`}>
            {body}
          </LinkComp>
        ) : (
          <div key={st.label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
