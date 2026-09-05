import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "../../../lib/access";
import { db } from "../../../lib/database";
import { companyAccess, manualInvitationsEnabled } from "../../../lib/workflow-service";
import { PageHero } from "../../../components/page-hero";
import { WorkflowForm } from "../../../components/workflow-form";
export default async function InviteEmployeePage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const session = await requireSession(), { companyId = "" } = await searchParams;
  const access = await companyAccess(db, session.accountId, companyId).catch(() => notFound()); if (!access.manage) notFound();
  const pending = await db.companyInvitation.findMany({ where: { companyId, kind: "EMPLOYMENT", acceptedAt: null, revokedAt: null }, orderBy: { createdAt: "desc" } });
  return <main className="page-shell"><PageHero eyebrow={access.member.company.name} title="Add person" description="Invite an employee to accept a company relationship." /><Link href={`/company?companyId=${companyId}`}>Company workspace</Link>
    {manualInvitationsEnabled() ? <section className="card"><p className="notice warning">DEV manual invitation. No email is sent. Share the link with the intended person, who must sign in with their own verified account.</p><WorkflowForm values={{ operation: "invite", companyId, kind: "EMPLOYMENT" }} fields={[{ name: "email", label: "Employee email", type: "email" }]} label="Create invitation" /></section> : <p>Invitations are currently unavailable.</p>}
    {pending.length ? <section className="card"><h2>Pending invitations</h2>{pending.map(invitation => <article className="stack" key={invitation.id}><p>{invitation.email} · {invitation.expiresAt <= new Date() ? "Expired" : "Awaiting acceptance"}</p><WorkflowForm values={{ operation: "invite", companyId, kind: "EMPLOYMENT", email: invitation.email, refresh: true }} label="Refresh link" /><WorkflowForm values={{ operation: "team", companyId, action: "cancel", invitationId: invitation.id }} label="Revoke invitation" /></article>)}</section> : null}
  </main>;
}
