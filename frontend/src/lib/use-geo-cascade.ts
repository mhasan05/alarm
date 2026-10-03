"use client";

import { useState } from "react";
import { GEO, UNION_WARDS } from "./geo";

export type GeoSelection = {
  division: string;
  district: string;
  upazila: string;
  area: string;
  ward: string;
  seat: string;
};

const EMPTY: GeoSelection = { division: "", district: "", upazila: "", area: "", ward: "", seat: "" };

/**
 * Division → District → Upazila/City Corporation → Thana/Union → Ward cascade, plus seat.
 * Changing a level clears every level below it; a single-seat area auto-fills the seat.
 */
export function useGeoCascade(initial?: Partial<GeoSelection>) {
  const [sel, setSel] = useState<GeoSelection>(() => ({ ...EMPTY, ...initial }));

  const node = sel.division && sel.district && sel.upazila ? GEO[sel.division][sel.district][sel.upazila] : null;
  const isCity = !!node?.city;
  const areaWards = node && sel.area ? node.subs[sel.area] : null;

  const options = {
    divisions: Object.keys(GEO),
    districts: sel.division ? Object.keys(GEO[sel.division]) : [],
    upazilas: sel.division && sel.district ? Object.keys(GEO[sel.division][sel.district]) : [],
    areas: node ? Object.keys(node.subs) : [],
    wards: node && sel.area ? (isCity ? areaWards || [] : UNION_WARDS) : [],
    seats: node?.seats ?? [],
  };

  const set = {
    division: (division: string) => setSel({ ...EMPTY, division }),
    district: (district: string) => setSel((s) => ({ ...EMPTY, division: s.division, district })),
    upazila: (upazila: string) =>
      setSel((s) => {
        const n = upazila ? GEO[s.division][s.district][upazila] : null;
        return { ...s, upazila, area: "", ward: "", seat: n && n.seats.length === 1 ? n.seats[0] : "" };
      }),
    area: (area: string) => setSel((s) => ({ ...s, area, ward: "" })),
    ward: (ward: string) => setSel((s) => ({ ...s, ward })),
    seat: (seat: string) => setSel((s) => ({ ...s, seat })),
  };

  /** Every required level (ward is optional) is chosen. */
  const complete = !!(sel.division && sel.district && sel.upazila && sel.area && sel.seat);

  return { sel, set, options, isCity, complete };
}

