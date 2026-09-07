import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PageHero } from "../../components/page-hero";
import { RecordList } from "../../components/record-list";
import { requireSession, pendingCompanySetup } from "../../lib/access";
import { db } from "../../lib/database";
import { personRecords } from "../../lib/record-queries";
import { EmploymentInvitationList } from "../../components/employment-invitations";
import { personInvitations } from "../../lib/employment-service";
import { employmentCsrf } from "../../lib/employment-security";
import { authSettings } from "../../lib/auth";
import { TeamInvitationList } from "../../components/team-invitations";
import { recipientTeamInvitations } from "../../lib/team-invitations";
import { teamCsrf } from "../../lib/team-security";
import { allowedRelationshipDefinitions } from "../../lib/record-service";
export default async function PersonInfoCenterPage() {
  const session = await requireSession();
  if (await pendingCompanySetup(session)) redirect("/onboarding/company");
  const person = await db.person.findUnique({ where: { accountId: session.accountId }, include: { relationships: { include: { company: true } } } });
  if (!person) notFound();
  const settings = authSettings();
  const invitations = await personInvitations(db, { sessionToken: session.sessionToken, issuer: settings.issuer });
  const teamInvitations = await recipientTeamInvitations(db, { sessionToken: session.sessionToken, issuer: settings.issuer });
  const csrf = employmentCsrf(settings.secret, session.sessionToken);
  const records = await personRecords(db, person.id);
  const shareable = new Set((await Promise.all(person.relationships.map(async relationship =>
    (await allowedRelationshipDefinitions(db, session.accountId, relationship.id, "PERSON")).length ? relationship.id : null))).filter(Boolean));
  return <main className="page-shell">
    <PageHero eyebrow="PERSON INFO CENTER" title={person.displayName} description="Your account, employment relationships and available records." />
    <section className="grid">
      <article className="card"><h2>Account</h2><p>{session.account.primaryEmail}</p><p className="muted">Your account remains yours when an employment relationship ends.</p></article>
      <article className="card" id="companies"><h2>My companies</h2>{person.relationships.length ? person.relationships.map(relationship => <div key={relationship.id}><p>{relationship.company.name} · {relationship.status}</p>{shareable.has(relationship.id) ? <p><Link className="button" href={`/person/relationships/${relationship.id}/add-record`}>Share document</Link></p> : null}</div>) : <p className="muted">No company relationships yet.</p>}</article>
      {invitations.length ? <article className="card full" id="invitations"><h2>Employment invitations</h2><EmploymentInvitationList csrf={csrf} invitations={invitations.map(invitation => ({ ...invitation, expiresAt: invitation.expiresAt.toISOString() }))} /></article> : null}
      <article className="card full" id="company-access-invitations"><h2>Company access invitations</h2>{teamInvitations.length ? <TeamInvitationList csrf={teamCsrf(settings.secret, session.sessionToken)} invitations={teamInvitations.map(invitation => ({ ...invitation, expiresAt: invitation.expiresAt.toISOString() }))} /> : <p className="muted">No pending company access invitations.</p>}</article>
      <article className="card full" id="records"><h2>My records</h2><RecordList records={records} /></article>
    </section>
  </main>;
}
