import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../components/page-hero";
import { AddRecordForm } from "../../../components/add-record-form";
import { requireSession } from "../../../lib/access";
import { db } from "../../../lib/database";
import { canReadStoredRecord, domainDefinition } from "../../../lib/record-access";
import { uploadContext } from "../../../lib/record-service";
import { uploadLimit } from "../../../lib/upload-staging";
export default async function RecordPage({ params }: { params: Promise<{ recordId: string }> }) {
  const session = await requireSession(), { recordId } = await params;
  const record = await db.record.findUnique({ where: { id: recordId }, include: { definitionVersion: true, files: { orderBy: { createdAt: "desc" } } } });
  if (!record || !await canReadStoredRecord(db, session.accountId, record)) notFound();
  const canDownload = await canReadStoredRecord(db, session.accountId, record, "download");
  let replace = false;
  if (record.relationshipId) try { await uploadContext(db, session.accountId, record.relationshipId, record.definitionVersionId, record.id); replace = true; } catch { /* deny by default */ }
  await db.activityEvent.create({ data: { type: "RECORD_VIEW", actorAccountId: session.accountId, recordId: record.id, summary: "Authorised record metadata viewed" } });
  return <main className="page-shell"><PageHero eyebrow="RECORD" title={record.title} description={record.definitionVersion.name} />
    <section className="card"><p>Definition version: {record.definitionVersion.version}</p><p>Classification: {record.definitionVersion.classification}</p><p>Review due: {record.reviewDueAt?.toISOString().slice(0, 10) ?? "Not set"}</p><p>Retain until: {record.retainUntil?.toISOString().slice(0, 10) ?? "Not set"}</p>
      <h2>File history</h2>{record.files.map(file => <article key={file.id}><p>{file.originalFilename} · {file.isCurrent ? "Current version" : "Previous version"}</p><p>{file.scanStatus === "NOT_SCANNED_DEV" ? "Not malware scanned — DEV synthetic files only" : file.scanStatus}</p>{canDownload && file.acceptedAt ? <Link href={`/api/files/${file.id}`}>Download {file.isCurrent ? "current" : "previous"} version</Link> : null}</article>)}
    </section>
    {replace && record.relationshipId ? <section className="card"><h2>Replace file</h2><p>The previous version remains in this record’s history.</p><AddRecordForm definitions={[domainDefinition(record.definitionVersion)]} relationshipId={record.relationshipId} recordId={record.id} recordTitle={record.title} maxBytes={uploadLimit()} /></section> : null}
  </main>;
}
