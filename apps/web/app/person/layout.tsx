import { requireSession } from "../../lib/access";
import type { ReactNode } from "react";
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return children;
}
