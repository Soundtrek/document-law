import type { RecordProjection } from "@juanity/domain";
import Link from "next/link";

const formatDate = (iso?: string): string => (iso ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(iso)) : "—");

export function RecordList({ records, emptyText = "No records available." }: { readonly records: readonly RecordProjection[]; readonly emptyText?: string }) {
  if (records.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <div className="stack">
      {records.map(({ record, definition, reviewDue }) => (
        <article className="record-row" key={record.id}>
          <div className="record-title">
            <strong>{record.title}</strong>
            <span className="record-meta">
              {definition.category} · {definition.classification.replaceAll("_", " ")} · Added {formatDate(record.createdAt)}
            </span>
            <span className="record-meta">
              Review due: {formatDate(record.reviewDueAt)} · Retain until: {formatDate(record.retainUntil)}
            </span>
          </div>
          <div className="actions">
            {reviewDue ? <span className="pill warning">Review due</span> : <span className="pill">Current</span>}
            <Link className="button secondary" href={`/records/${record.id}`}>View</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
