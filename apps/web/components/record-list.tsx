import React from "react";
import type { RecordProjection } from "@samma/domain";
import Link from "next/link";

const formatDate = (iso?: string): string => (iso ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(iso)) : "—");

export interface RecordListItem extends RecordProjection {
  readonly companyName?: string;
  readonly downloadFileId?: string;
}

export function RecordList({ records, emptyText = "No records available.", showPersonVisibility = false }: {
  readonly records: readonly RecordListItem[]; readonly emptyText?: string; readonly showPersonVisibility?: boolean;
}) {
  if (records.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <div className="stack">
      {records.map(({ record, definition, reviewDue, companyName, downloadFileId }) => (
        <article className="record-row" key={record.id}>
          <div className="record-title">
            <strong>{record.title}</strong>
            <span className="record-meta">{companyName ? `${companyName} · ` : ""}{definition.name}</span>
            <span className="record-meta">
              {definition.category} · {definition.classification.replaceAll("_", " ")} · Added {formatDate(record.createdAt)}
            </span>
            {record.reviewDueAt ? <span className="record-meta">Review due: {formatDate(record.reviewDueAt)}</span> : null}
            {showPersonVisibility ? <span className="record-meta">Person visible: {definition.personVisible ? "Yes" : "No"}</span> : null}
          </div>
          <div className="actions">
            <span className="pill">{record.status.replaceAll("_", " ")}</span>
            {reviewDue ? <span className="pill warning">Review due</span> : null}
            <Link className="button secondary" href={`/records/${record.id}`}>View</Link>
            {downloadFileId ? <Link className="button secondary" href={`/api/files/${downloadFileId}`}>Download</Link> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
