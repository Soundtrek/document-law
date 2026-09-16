import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../components/page-hero";
import { AddRecordForm } from "../../../components/add-record-form";
import { requireSession } from "../../../lib/access";
import { db } from "../../../lib/database";
import { authoriseRecordAccess, canReadStoredRecord, domainDefinition, isDownloadableFile } from "../../../lib/record-access";
import { uploadContext } from "../../../lib/record-service";
import { uploadLimit } from "../../../lib/upload-staging";
export default async function RecordPage({ params }: { params: Promise<{ recordId: string }> }) {
  const session = await requireSession(), { recordId } = await params;
  const record = await db.record.findUnique({ where: { id: recordId }, include: { definitionVersion: true, files: { orderBy: { createdAt: "desc" } } } });
  const authorised = await authoriseRecordAccess(db, session.accountId, record);
  if (!record || !authorised) notFound();
  const canDownload = await canReadStoredRecord(db, session.accountId, record, "download");
  let replace = false;
  if (record.relationshipId) try { await uploadContext(db, session.accountId, record.relationshipId, record.definitionVersionId, record.id); replace = true; } catch { /* deny by default */ }
  await db.activityEvent.create({ data: { type: "RECORD_VIEW", actorAccountId: session.accountId, recordId: record.id, summary: "Authorised record metadata viewed" } });
  return <main className="page-shell"><PageHero eyebrow="RECORD" title={record.title} description={record.definitionVersion.name} />
    <section className="card record-detail"><div className="record-detail-meta"><p><span className="record-meta">Definition version</span>{record.definitionVersion.version}</p><p><span className="record-meta">Classification</span>{record.definitionVersion.classification}</p><p><span className="record-meta">Review due</span>{record.reviewDueAt?.toISOString().slice(0, 10) ?? "Not set"}</p><p><span className="record-meta">Retain until</span>{record.retainUntil?.toISOString().slice(0, 10) ?? "Not set"}</p></div>
      <div className="record-file-history"><h2>File history</h2>{record.files.map(file => <article className="record-file-row" key={file.id}><div className="record-file-info"><strong>{file.originalFilename}</strong><span className="record-meta">{file.isCurrent ? "Current version" : "Previous version"}</span><span className="record-meta">{file.scanStatus === "NOT_SCANNED_DEV" ? "Not malware scanned — DEV synthetic files only" : file.scanStatus}</span></div><div className="actions">{file.isCurrent ? <span className="pill success">Current</span> : <span className="pill">Previous</span>}{canDownload && isDownloadableFile(file) ? <Link className="button secondary" href={`/api/files/${file.id}`}>Download {file.isCurrent ? "current" : "previous"} version</Link> : null}</div></article>)}</div>
    </section>
    {replace && record.relationshipId ? <section className="card"><h2>Replace file</h2><p>The previous version remains in this record’s history.</p><AddRecordForm definitions={[domainDefinition(record.definitionVersion)]} relationshipId={record.relationshipId} recordId={record.id} recordTitle={record.title} maxBytes={uploadLimit()} /></section> : null}
  </main>;
}
