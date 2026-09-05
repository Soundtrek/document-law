import { PageHero } from "../../components/page-hero";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
export default async function CompanyPage() {
  const session = await requireSession();
  const memberships = await db.companyMember.findMany({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: true, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  return <main className="page-shell"><PageHero eyebrow="COMPANY" title="My company access" description="Companies where you have active membership." />
    <section className="grid">{memberships.length ? memberships.map(member => <article className="card" key={member.id}><h2>{member.company.name}</h2><p>{member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "No functional roles assigned"}</p></article>) : <article className="card"><h2>No company access yet</h2><p className="muted">An authorised company owner can arrange your membership.</p></article>}</section>
  </main>;
}
