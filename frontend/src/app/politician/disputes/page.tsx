import type { Metadata } from "next";
import { DisputesView } from "./disputes-view";

export const metadata: Metadata = { title: "অভিযোগ ও অসঙ্গতি · ALARM" };

/** `?report=CODE` opens the dispute form; `?submitted=DSP-…` confirms a filed dispute. */
export default async function DisputesPage({ searchParams }: PageProps<"/politician/disputes">) {
  const { report, submitted } = await searchParams;
  return <DisputesView report={typeof report === "string" ? report : undefined} submitted={typeof submitted === "string" ? submitted : undefined} />;
}
