import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../../components/page-hero";
import { AddPersonForm, EmploymentInvitationList } from "../../../../components/employment-invitations";
import { requireMembership } from "../../../../lib/access";
import { db } from "../../../../lib/database";
import { companyInvitations, hasInvitationCapability } from "../../../../lib/employment-service";
import { employmentCsrf } from "../../../../lib/employment-security";
import { authSettings } from "../../../../lib/auth";

export default async function AddPersonPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const { companyId } = await searchParams;
  if (!companyId || typeof companyId !== "string") notFound();
  const { session, membership } = await requireMembership(companyId);
  if (!hasInvitationCapability(membership.roleGrants)) notFound();
  const settings = authSettings();
  const invitations = await companyInvitations(db, { sessionToken: session.sessionToken, issuer: settings.issuer }, companyId);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  const csrf = employmentCsrf(settings.secret, session.sessionToken);
  return <main className="page-shell"><PageHero eyebrow="PEOPLE" title="Add person" description={`Invite a person to connect with ${company.name} for employment records.`} />
    <section className="card"><AddPersonForm companyId={companyId} csrf={csrf} /></section>
    {invitations.length ? <section className="card"><h2>Pending invitations</h2><EmploymentInvitationList company csrf={csrf} invitations={invitations.map(invitation => ({ ...invitation, expiresAt: invitation.expiresAt.toISOString() }))} /></section> : null}
    <Link href="/company">Back to Company Info Center</Link>
  </main>;
}
