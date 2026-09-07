import Link from "next/link";
import { PageHero } from "../../components/page-hero";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { canReadStoredRecord } from "../../lib/record-access";
import { hasInvitationCapability } from "../../lib/employment-service";
import { CompanyPeople } from "../../components/company-people";
import { companyPersonSelect } from "../../lib/company-people";
import { allowedRelationshipDefinitions } from "../../lib/record-service";
export default async function CompanyPage() {
  const session = await requireSession();
  const memberships = await db.companyMember.findMany({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: { include: { relationships: { select: companyPersonSelect, orderBy: { createdAt: "asc" } } } }, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  const stored = await db.record.findMany({ where: { companyId: { in: memberships.map(member => member.companyId) }, context: { not: "PERSON" }, status: { not: "DELETED" } }, include: { definitionVersion: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const records = [];
  for (const record of stored) if (await canReadStoredRecord(db, session.accountId, record)) records.push(record);
  const companies = await Promise.all(memberships.map(async member => ({
    member,
    people: await Promise.all(member.company.relationships.map(async relationship => ({
      relationship, canAddRecord: (await allowedRelationshipDefinitions(db, session.accountId, relationship.id)).length > 0,
    }))),
  })));
  return <main className="page-shell"><PageHero eyebrow="COMPANY" title="Company Info Center" description="Companies where you have active membership." />
    <section className="grid">{companies.length ? companies.map(({ member, people }) => <CompanyPeople key={member.id}
      companyId={member.companyId} companyName={member.company.name}
      roles={member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "No functional roles assigned"}
      canAddPerson={hasInvitationCapability(member.roleGrants)} people={people} />) : <article className="card"><h2>No company access yet</h2><p className="muted">An authorised company owner can arrange your membership.</p></article>}</section>
    {records.length ? <section className="card"><h2>Available records</h2>{records.map(record => <p key={record.id}><Link href={`/records/${record.id}`}>{record.title}</Link></p>)}</section> : null}
  </main>;
}
