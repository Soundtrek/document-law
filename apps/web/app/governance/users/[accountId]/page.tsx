import { notFound } from "next/navigation";
import { GovernanceUserDetail } from "../../../../components/governance-users";
import { requireGovernance } from "../../../../lib/access";
import { db } from "../../../../lib/database";
import { governanceUserDirectory } from "../../../../lib/governance-users";

export default async function UserPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const user = await governanceUserDirectory(db, requireGovernance).detail(accountId);
  if (!user) notFound();
  return <GovernanceUserDetail user={user} />;
}
