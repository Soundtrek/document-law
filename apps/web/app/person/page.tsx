import { notFound } from "next/navigation";
import { PageHero } from "../../components/page-hero";
import { RecordList } from "../../components/record-list";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { domainDefinition, domainRecord } from "../../lib/record-access";
import { buildPersonRecordProjection } from "@samma/domain";
export default async function PersonInfoCenterPage() {
  const session = await requireSession();
  const person = await db.person.findUnique({ where: { accountId: session.accountId }, include: { relationships: { include: { company: true } } } });
  if (!person) notFound();
  const stored = await db.record.findMany({ where: { personId: person.id, status: { not: "DELETED" }, definitionVersion: { personVisible: true } }, include: { definitionVersion: true }, orderBy: { createdAt: "desc" } });
  const records = buildPersonRecordProjection(person.id, stored.map(domainRecord), stored.map(row => domainDefinition(row.definitionVersion)), new Date().toISOString());
  return <main className="page-shell">
    <PageHero eyebrow="PERSON INFO CENTER" title={person.displayName} description="Your account, employment relationships and available records." />
    <section className="grid">
      <article className="card"><h2>Account</h2><p>{session.account.primaryEmail}</p><p className="muted">Your account remains yours when an employment relationship ends.</p></article>
      <article className="card" id="companies"><h2>My companies</h2>{person.relationships.length ? person.relationships.map(relationship => <p key={relationship.id}>{relationship.company.name} · {relationship.status}</p>) : <p className="muted">No company relationships yet.</p>}</article>
      <article className="card full" id="records"><h2>My records</h2><RecordList records={records} /></article>
    </section>
  </main>;
}
