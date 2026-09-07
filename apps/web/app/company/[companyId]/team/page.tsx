import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../../components/page-hero";
import { CompanyTeamMember } from "../../../../components/company-team";
import { requireSession } from "../../../../lib/access";
import { db } from "../../../../lib/database";
import { companyTeam, TeamAccessError } from "../../../../lib/company-team";
import { authSettings } from "../../../../lib/auth";
import { teamCsrf } from "../../../../lib/team-security";
export default async function CompanyTeamPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const session = await requireSession(), settings = authSettings();
  const team = await companyTeam(db, { sessionToken: session.sessionToken, issuer: settings.issuer }, companyId).catch(error => {
    if (error instanceof TeamAccessError && error.code === "denied") notFound();
    throw error;
  });
  return <main className="page-shell"><PageHero eyebrow="COMPANY" title={team.company.name} description={team.viewerRoles.join(", ")} />
    <nav className="actions" aria-label="Company workspace"><Link className="button secondary" href={`/company#company-${encodeURIComponent(companyId)}`}>People</Link><Link className="button" href={`/company/${encodeURIComponent(companyId)}/team`} aria-current="page">Team &amp; Access</Link></nav>
    <section className="company-people-section"><header className="company-people-heading"><h2>Team &amp; Access</h2><p className="muted">Company operators and their functional roles. Company Owner manages access; record access requires the relevant functional role.</p></header>
      <div className="company-people-list">{team.members.map(member => <CompanyTeamMember key={member.id} member={member} roles={team.roles} companyId={companyId} csrf={teamCsrf(settings.secret, session.sessionToken)} />)}</div>
    </section>
  </main>;
}
