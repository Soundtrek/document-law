import React from "react";
import Link from "next/link";
import { RecordList, type RecordListItem } from "./record-list";

export function RelationshipRecords({ records, relationshipId, canAddRecord }: {
  readonly records: readonly RecordListItem[]; readonly relationshipId: string; readonly canAddRecord: boolean;
}) {
  return <section className="card" id="records">
    <h2>Records</h2>
    <RecordList records={records} emptyText="No records yet." showPersonVisibility />
    {canAddRecord ? <p><Link className="button" href={`/company/relationships/${relationshipId}/add-record`}>Add record</Link></p> : null}
  </section>;
}
