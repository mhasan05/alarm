/** State filters for "My submissions" (shared by the server page and the client view). */
export const FILTERS = ["সব", "যাচাই চলছে", "গ্রহণ হয়েছে", "বাতিল"] as const;
export type Filter = (typeof FILTERS)[number];
