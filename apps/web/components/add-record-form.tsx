"use client";

import type { RecordDefinitionVersion } from "@samma/domain";
import { useMemo, useState } from "react";

export function AddRecordForm({ definitions }: { readonly definitions: readonly RecordDefinitionVersion[] }) {
  const [definitionId, setDefinitionId] = useState(definitions[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [saved, setSaved] = useState(false);
  const selected = useMemo(() => definitions.find((definition) => definition.id === definitionId), [definitionId, definitions]);

  return (
    <div className="stack">
      <label className="stack">
        <strong>1. Record type</strong>
        <select
          onChange={(event) => { setDefinitionId(event.target.value); setSaved(false); }}
          style={{ minHeight: 44, border: "1px solid var(--samma-border-strong)", borderRadius: "var(--samma-radius-control)", padding: "0 12px", background: "var(--samma-surface)" }}
          value={definitionId}
        >
          {definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}
        </select>
      </label>

      <label className="stack">
        <strong>2. File</strong>
        <input
          accept="application/pdf,image/*,.doc,.docx"
          onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ""); setSaved(false); }}
          style={{ minHeight: 44, border: "1px solid var(--samma-border-strong)", borderRadius: "var(--samma-radius-control)", padding: 10, background: "var(--samma-surface)" }}
          type="file"
        />
      </label>

      {selected ? (
        <div className="notice">
          SAMMA policy will apply automatically: {selected.category} · {selected.classification.replaceAll("_", " ")} · person visible: {selected.personVisible ? "yes" : "no"} · retention: {selected.retentionMonths ?? "none"} months · review: {selected.reviewMonths ?? "none"} months.
        </div>
      ) : null}

      <div className="row">
        <span className="record-meta">{fileName ? `Selected: ${fileName}` : "Choose a synthetic/test file to enable the UI proof."}</span>
        <button className="button" disabled={!definitionId || !fileName} onClick={() => setSaved(true)} type="button">3. Save record</button>
      </div>

      {saved ? <p className="notice warning">UI proof complete. No file was uploaded or persisted. The real save path will call the storage quarantine/scan adapter and PostgreSQL transaction on the NUC integration stage.</p> : null}
    </div>
  );
}
