import Link from "next/link";
import { PageHero } from "../../components/page-hero";
import { RecordList } from "../../components/record-list";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { domainDefinition, domainRecord } from "../../lib/record-access";
import { ensurePerson, normalEmail, manualInvitationsEnabled } from "../../lib/workflow-service";
import { buildPersonRecordProjection } from "@samma/domain";
export default async function PersonInfoCenterPage() {
  const session = await requireSession();
  const person = await ensurePerson(db, { accountId: session.accountId, sessionToken: session.sessionToken });
  const [relationships, memberships, stored, invitations] = await Promise.all([
    db.personCompanyRelationship.findMany({ where: { personId: person.id }, include: { company: true }, orderBy: { createdAt: "desc" } }),
    db.companyMember.findMany({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: true } }),
    db.record.findMany({ where: { personId: person.id, status: { not: "DELETED" }, definitionVersion: { personVisible: true } }, include: { definitionVersion: true }, orderBy: { createdAt: "desc" } }),
    manualInvitationsEnabled() ? db.companyInvitation.findMany({ where: { email: normalEmail(session.account.primaryEmail), OR: [{ intendedAccountId: null }, { intendedAccountId: session.accountId }], acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() }, company: { status: "ACTIVE" } }, include: { company: true } }) : [],
  ]);
  const records = buildPersonRecordProjection(person.id, stored.map(domainRecord), stored.map(row => domainDefinition(row.definitionVersion)), new Date().toISOString());
  return <main className="page-shell"><PageHero eyebrow="PERSONAL INFO CENTER" title={person.displayName} description="Your account, company relationships and available records." />
    <section className="grid"><article className="card"><h2>Your account</h2><p>{session.account.primaryEmail}</p><p className="muted">Your account remains yours when a company relationship ends.</p><Link className="button" href="/company/new">Create company</Link></article>
      <article className="card"><h2>Your companies</h2>{memberships.length ? memberships.map(member => <p key={member.id}><Link href={`/company?companyId=${member.companyId}`}>{member.company.name}</Link> · Team member</p>) : <p className="muted">Create your first company to open a workspace.</p>}
        {relationships.map(relationship => <p key={relationship.id}>{relationship.company.name} · {relationship.status}</p>)}{!relationships.length ? <p className="muted">No employment relationships yet.</p> : null}</article>
      {invitations.length ? <article className="card full"><h2>Company invitations</h2>{invitations.map(invitation => <p key={invitation.id}>{invitation.company.name} · {invitation.kind === "EMPLOYMENT" ? "Employee relationship" : "Team membership"}</p>)}<p>Open the invitation link shared with you to review and accept.</p><Link href="/invitations/accept">Enter invitation code</Link></article> : null}
      <article className="card full" id="records"><h2>Your records</h2><RecordList records={records} /></article>
    </section></main>;
}
