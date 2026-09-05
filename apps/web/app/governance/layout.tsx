import { requireGovernance } from "../../lib/access";
import type { ReactNode } from "react";
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireGovernance(["platform.definitions.manage"]);
  return children;
}
