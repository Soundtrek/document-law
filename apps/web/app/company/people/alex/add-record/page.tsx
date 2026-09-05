import { notFound } from "next/navigation";
import { requireSession } from "../../../../../lib/access";
export default async function UnavailableDemoRoute() {
  await requireSession();
  notFound();
}
