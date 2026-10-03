import type { Metadata } from "next";
import { AddPoliticianPage } from "./add-politician-page";

export const metadata: Metadata = { title: "Add Political Activist · ALARM" };

/** Admin creates a political activist's profile and sign-in. There is no self sign-up. */
export default function Page() {
  return <AddPoliticianPage />;
}
