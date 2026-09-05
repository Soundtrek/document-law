import { notFound } from "next/navigation";
import { PageHero } from "../../../components/page-hero";
import { requireSession } from "../../../lib/access";
import { db } from "../../../lib/database";
import { canReadStoredRecord } from "../../../lib/record-access";
export default async function RecordPage({ params }: { params: Promise<{ recordId: string }> }) {
  const session = await requireSession();
  const { recordId } = await params;
  const record = await db.record.findUnique({ where: { id: recordId }, include: { definitionVersion: true } });
  if (!record || !await canReadStoredRecord(db, session.accountId, record)) notFound();
  await db.activityEvent.create({ data: { type: "RECORD_VIEW", actorAccountId: session.accountId, recordId: record.id, summary: "Authorised record metadata viewed" } });
  return <main className="page-shell"><PageHero eyebrow="RECORD" title={record.title} description={record.definitionVersion.name} />
    <section className="card"><p>Definition version: {record.definitionVersion.version}</p><p>Classification: {record.definitionVersion.classification}</p><p>Review due: {record.reviewDueAt?.toISOString().slice(0, 10) ?? "Not set"}</p><p>Retain until: {record.retainUntil?.toISOString().slice(0, 10) ?? "Not set"}</p><p className="muted">File access is not yet available.</p></section>
  </main>;
}
