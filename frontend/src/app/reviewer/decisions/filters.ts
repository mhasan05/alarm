/** Decision filters (shared by the server page and the client view). */
export const FILTERS = ["সব", "গ্রহণ হয়েছে", "বাতিল"] as const;
export type Filter = (typeof FILTERS)[number];
