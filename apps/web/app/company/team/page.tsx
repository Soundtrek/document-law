import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "../../../lib/access";
import { db } from "../../../lib/database";
import { companyAccess, manualInvitationsEnabled } from "../../../lib/workflow-service";
import { strings } from "../../../lib/record-access";
import { PageHero } from "../../../components/page-hero";
import { WorkflowForm } from "../../../components/workflow-form";
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const session = await requireSession(), { companyId = "" } = await searchParams;
  const access = await companyAccess(db, session.accountId, companyId).catch(() => notFound()); if (!access.manage) notFound();
  const roles = await db.functionalRoleDefinition.findMany({ where: { active: true }, orderBy: { label: "asc" } });
  const members = await db.companyMember.findMany({ where: { companyId, status: "ACTIVE" }, include: { account: { select: { primaryEmail: true } }, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } }, orderBy: { createdAt: "asc" } });
  const invitations = await db.companyInvitation.findMany({ where: { companyId, kind: "MEMBERSHIP", acceptedAt: null, revokedAt: null } });
  return <main className="page-shell"><PageHero eyebrow={access.member.company.name} title="Team & Access" description="Manage company membership and functional roles. Employee relationships are separate." /><Link href={`/company?companyId=${companyId}`}>Company workspace</Link><p className="notice">Company Owners can assign themselves approved record roles. Owner alone does not grant access to every document.</p>
    {members.map(member => <section className="card" key={member.id}><h2>{member.accountId === session.accountId ? "Your membership" : member.account.primaryEmail}</h2><p>{member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "No functional roles"}</p>
      <WorkflowForm values={{ operation: "team", companyId, memberId: member.id, action: "grant" }} fields={[{ name: "roleId", label: "Add functional role", type: "select", options: roles.map(role => ({ id: role.id, label: role.label })) }]} label="Assign role" />
      {member.roleGrants.map(grant => <WorkflowForm key={grant.id} values={{ operation: "team", companyId, memberId: member.id, action: "revoke", roleId: grant.functionalRoleId }} label={`Revoke ${grant.functionalRole.label}`} />)}
      <WorkflowForm values={{ operation: "team", companyId, memberId: member.id, action: "remove" }} label="Remove membership" />
    </section>)}
    {manualInvitationsEnabled() ? <section className="card"><h2>Invite team member</h2><p>DEV manual link; no email is sent. This grants team access after acceptance.</p><WorkflowForm values={{ operation: "invite", companyId, kind: "MEMBERSHIP" }} fields={[{ name: "email", label: "Team member email", type: "email" }]} roles={roles.map(role => ({ id: role.id, label: role.label }))} label="Create team invitation" /></section> : null}
    {invitations.map(invitation => <section className="card" key={invitation.id}><h2>Pending team invitation</h2><p>{invitation.email} · {invitation.expiresAt <= new Date() ? "Expired" : "Awaiting acceptance"}</p><WorkflowForm values={{ operation: "invite", companyId, kind: "MEMBERSHIP", email: invitation.email, refresh: true }} roles={roles.filter(role => strings(invitation.roleIds).includes(role.id)).map(role => ({ id: role.id, label: role.label }))} label="Refresh team link" /><WorkflowForm values={{ operation: "team", companyId, action: "cancel", invitationId: invitation.id }} label="Revoke invitation" /></section>)}
  </main>;
}
