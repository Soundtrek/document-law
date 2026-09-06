import { GovernanceUsers } from "../../../components/governance-users";
import { requireGovernance } from "../../../lib/access";
import { db } from "../../../lib/database";
import { governanceUserDirectory } from "../../../lib/governance-users";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const params = await searchParams;
  const result = await governanceUserDirectory(db, requireGovernance).list(
    typeof params.q === "string" ? params.q : "",
    typeof params.page === "string" ? Number(params.page) : 1,
  );
  return <GovernanceUsers result={result} />;
}
