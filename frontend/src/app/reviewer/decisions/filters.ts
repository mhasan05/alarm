/** Filters for "সকল প্রতিবেদন" (shared by the server page and the client view). */
export const FILTERS = ["সব", "অপেক্ষায়", "গ্রহণ হয়েছে", "বাতিল"] as const;
export type Filter = (typeof FILTERS)[number];
