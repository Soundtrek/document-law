import Link from "next/link";
import { PageHero } from "../../components/page-hero";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { canReadStoredRecord } from "../../lib/record-access";
export default async function CompanyPage() {
  const session = await requireSession();
  const memberships = await db.companyMember.findMany({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: { include: { relationships: { where: { status: "ACTIVE" }, include: { person: true } } } }, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  const stored = await db.record.findMany({ where: { companyId: { in: memberships.map(member => member.companyId) }, context: { not: "PERSON" }, status: { not: "DELETED" } }, include: { definitionVersion: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const records = [];
  for (const record of stored) if (await canReadStoredRecord(db, session.accountId, record)) records.push(record);
  return <main className="page-shell"><PageHero eyebrow="COMPANY" title="Company Info Center" description="Companies where you have active membership." />
    <section className="grid">{memberships.length ? memberships.map(member => <article className="card" key={member.id}><h2>{member.company.name}</h2><p>{member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "No functional roles assigned"}</p>
      {member.company.relationships.map(relationship => <p key={relationship.id}>{relationship.person.displayName} · <Link href={`/company/relationships/${relationship.id}/add-record`}>Add record</Link></p>)}
    </article>) : <article className="card"><h2>No company access yet</h2><p className="muted">An authorised company owner can arrange your membership.</p></article>}</section>
    {records.length ? <section className="card"><h2>Available records</h2>{records.map(record => <p key={record.id}><Link href={`/records/${record.id}`}>{record.title}</Link></p>)}</section> : null}
  </main>;
}
