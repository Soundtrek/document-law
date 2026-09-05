import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../lib/access";
import { db } from "../../../../lib/database";
import { relationshipProfile } from "../../../../lib/workflow-service";
import { canReadStoredRecord } from "../../../../lib/record-access";
import { PageHero } from "../../../../components/page-hero";
export default async function RelationshipPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const session = await requireSession(), { relationshipId } = await params;
  const relationship = await relationshipProfile(db, session.accountId, relationshipId).catch(() => notFound());
  const stored = await db.record.findMany({ where: { relationshipId, companyId: relationship.companyId, personId: relationship.personId, context: "RELATIONSHIP", status: { not: "DELETED" } }, include: { definitionVersion: true }, orderBy: { createdAt: "desc" } });
  const records = []; for (const record of stored) if (await canReadStoredRecord(db, session.accountId, record)) records.push(record);
  return <main className="page-shell"><PageHero eyebrow={relationship.company.name} title={relationship.person.displayName} description={`${relationship.relationshipType} · ${relationship.status}`} />
    <div className="actions"><Link href={`/company?companyId=${relationship.companyId}`}>Company workspace</Link>{relationship.status === "ACTIVE" ? <Link className="button" href={`/company/relationships/${relationship.id}/add-record`}>Add Record</Link> : null}</div>
    <section className="card"><h2>Relationship</h2><p>{relationship.person.account.primaryEmail}</p><p>Started: {relationship.startedAt?.toISOString().slice(0, 10) ?? "Pending"}</p>{relationship.endedAt ? <p>Ended: {relationship.endedAt.toISOString().slice(0, 10)}</p> : null}</section>
    <section className="card"><h2>Records</h2>{records.length ? records.map(record => <p key={record.id}><Link href={`/records/${record.id}`}>{record.title}</Link></p>) : <p className="muted">No records available for your functional roles.</p>}</section>
  </main>;
}
