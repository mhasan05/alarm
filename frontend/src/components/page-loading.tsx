import { RowSkeleton } from "./state-card";

/** Shown while a portal page loads: skeleton rows shaped like the content, so nothing jumps. */
export function PageLoading() {
  return (
    <div role="status" aria-label="লোড হচ্ছে" className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 sm:px-7">
      <div className="h-[72px] animate-pulse rounded-card border border-line bg-white" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-card border border-line bg-white" />
        ))}
      </div>
      <div className="rounded-card border border-line bg-white p-5">
        <RowSkeleton rows={4} />
      </div>
    </div>
  );
}
