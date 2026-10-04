// Dispute list tabs. A plain module (no "use client") so server pages can read it too.
export type DisputeTab = "open" | "resolved" | "all";
export const DISPUTE_TABS: DisputeTab[] = ["open", "resolved", "all"];
