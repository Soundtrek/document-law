import React from "react";
import { RecordList, type RecordListItem } from "./record-list";

export function RelationshipRecords({ records }: {
  readonly records: readonly RecordListItem[];
}) {
  return <section className="card" id="records">
    <h2>Records</h2>
    <RecordList records={records} emptyText="No records yet." showPersonVisibility />
  </section>;
}
