/** State filters for "My submissions" (shared by the server page and the client view). */
export const FILTERS = ["সব", "পর্যালোচনাধীন", "গৃহীত", "বাতিল"] as const;
export type Filter = (typeof FILTERS)[number];
