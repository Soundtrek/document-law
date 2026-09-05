import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../components/page-hero";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { canReadStoredRecord } from "../../lib/record-access";
import { companyAccess } from "../../lib/workflow-service";
export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const session = await requireSession(), { companyId } = await searchParams;
  const memberships = await db.companyMember.findMany({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: true }, orderBy: { createdAt: "asc" } });
  if (!memberships.length && !companyId) return <main className="page-shell"><PageHero eyebrow="COMPANY" title="Your company workspace" description="No company access yet." /><section className="card"><Link className="button" href="/company/new">Create your first company</Link></section></main>;
  const selected = memberships.find(member => member.companyId === (companyId ?? memberships[0]?.companyId));
  if (!selected) notFound();
  const access = await companyAccess(db, session.accountId, selected.companyId);
  const relationships = access.viewPeople ? await db.personCompanyRelationship.findMany({ where: { companyId: selected.companyId }, include: { person: true }, orderBy: { createdAt: "desc" } }) : [];
  const stored = await db.record.findMany({ where: { companyId: selected.companyId, context: { not: "PERSON" }, status: { not: "DELETED" } }, include: { definitionVersion: true }, orderBy: { createdAt: "desc" } });
  const records = []; for (const record of stored) if (await canReadStoredRecord(db, session.accountId, record)) records.push(record);
  return <main className="page-shell"><PageHero eyebrow="COMPANY INFO CENTER" title={selected.company.name} description={access.member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "No functional roles assigned"} />
    <form className="card" action="/company"><label className="stack">Current company<select name="companyId" defaultValue={selected.companyId}>{memberships.map(member => <option key={member.id} value={member.companyId}>{member.company.name}</option>)}</select></label><button className="button secondary" type="submit">Switch company</button></form>
    <div className="actions">{access.manage ? <><Link className="button" href={`/company/invite?companyId=${selected.companyId}`}>Add person</Link><Link className="button secondary" href={`/company/team?companyId=${selected.companyId}`}>Team &amp; Access</Link></> : null}</div>
    {access.viewPeople ? <section className="card"><h2>People</h2>{relationships.length ? relationships.map(relationship => <p key={relationship.id}><Link href={`/company/people/${relationship.id}`}>{relationship.person.displayName}</Link> · {relationship.status}</p>) : <p className="muted">Add your first person. Accepted invitations appear here.</p>}</section> : null}
    <section className="card"><h2>Available records</h2>{records.length ? records.map(record => <p key={record.id}><Link href={`/records/${record.id}`}>{record.title}</Link>{record.reviewDueAt && record.reviewDueAt <= new Date() ? " · Review due" : ""}</p>) : <p className="muted">No records available for your functional roles.</p>}</section>
  </main>;
}
