import Link from "next/link";
import { apiSession } from "../../../lib/api-session";
import { manualInvitationsEnabled } from "../../../lib/workflow-service";
import { PageHero } from "../../../components/page-hero";
import { WorkflowForm } from "../../../components/workflow-form";
export const dynamic = "force-dynamic";
export default async function AcceptPage() {
  const session = await apiSession();
  return <main className="page-shell"><PageHero eyebrow="COMPANY INVITATION" title="Accept invitation" description="Use your own verified account to accept the invitation shared with you." /><section className="card">{!manualInvitationsEnabled() ? <p>Manual invitations are unavailable.</p> : session ? <><p>Signed in as {session.account.primaryEmail}. Acceptance connects this account to the inviting company.</p><WorkflowForm values={{ operation: "accept" }} label="Accept invitation" accept /></> : <><p>Sign in first, then reopen your invitation link. The link cannot sign you in or change your identity.</p><Link className="button" href="/sign-in">Sign in</Link></>}</section></main>;
}
