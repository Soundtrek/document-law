import { syntheticDefinitions, syntheticFiles, syntheticRecords } from "@samma/domain";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "../../../components/page-hero";

const formatDate = (iso?: string): string => iso ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—";

export default async function RecordPage({ params }: { readonly params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  const record = syntheticRecords.find((candidate) => candidate.id === recordId);
  if (!record) notFound();
  const definition = syntheticDefinitions.find((candidate) => candidate.id === record.definitionVersionId);
  const file = syntheticFiles.find((candidate) => candidate.id === record.currentFileId);
  if (!definition) notFound();

  return (
    <main className="page-shell">
      <PageHero
        eyebrow="RECORD"
        title={record.title}
        description="A record is document knowledge: file metadata plus definition version, relationship context, access policy, retention/review dates and audit history."
        nav={[
          { href: `/records/${record.id}`, label: "Overview", active: true },
          { href: "/person", label: "Person Info Center" },
          { href: "/company/people/alex", label: "Company Profile" },
        ]}
      />

      <section className="grid">
        <article className="card">
          <p className="eyebrow">Knowledge</p>
          <h2>{definition.name}</h2>
          <div className="stack">
            <span className="record-meta">Definition version: {definition.version}</span>
            <span className="record-meta">Context: {record.context}</span>
            <span className="record-meta">Classification: {definition.classification.replaceAll("_", " ")}</span>
            <span className="record-meta">Created: {formatDate(record.createdAt)}</span>
            <span className="record-meta">Review due: {formatDate(record.reviewDueAt)}</span>
            <span className="record-meta">Retain until: {formatDate(record.retainUntil)}</span>
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">File Object</p>
          <h2>{file?.originalFilename ?? "No accepted file"}</h2>
          {file ? (
            <div className="stack">
              <span className="record-meta">Storage key: {file.storageKey}</span>
              <span className="record-meta">MIME: {file.contentType}</span>
              <span className="record-meta">Scan: {file.scanStatus}</span>
              <span className="record-meta">SHA-256: {file.checksumSha256.slice(0, 16)}…</span>
            </div>
          ) : <p className="muted">No current file is attached.</p>}
          <button className="button" disabled type="button">Open file after storage authorisation</button>
        </article>

        <article className="card full">
          <p className="eyebrow">Security Boundary</p>
          <h2>The object key never grants access</h2>
          <p className="muted">This synthetic build deliberately does not serve file bytes. The integrated path will authorise the current Person, company functional roles or Legal Access grant before creating short-lived object access.</p>
          <div className="actions">
            <Link className="button secondary" href="/person">Back to Person</Link>
            <Link className="button secondary" href="/company/people/alex">Back to Company employee</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
