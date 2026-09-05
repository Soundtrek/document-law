"use client";
import type { RecordDefinitionVersion } from "@samma/domain";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AddRecordForm({ definitions, relationshipId, recordId, recordTitle, maxBytes }: {
  readonly definitions: readonly RecordDefinitionVersion[]; readonly relationshipId: string; readonly recordId?: string; readonly recordTitle?: string; readonly maxBytes: number;
}) {
  const router = useRouter();
  const [definitionId, setDefinitionId] = useState(definitions[0]?.id ?? ""), [title, setTitle] = useState(recordTitle ?? "");
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const selected = definitions.find(item => item.id === definitionId);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!file || busy) return;
    if (file.size === 0 || file.size > maxBytes) { setError("Choose a non-empty file within the size limit."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/records/upload", { method: "POST", headers: {
        "Content-Type": "application/octet-stream", "X-Samma-Upload": "1", "X-Samma-Relationship": encodeURIComponent(relationshipId),
        "X-Samma-Definition": encodeURIComponent(definitionId), "X-Samma-Title": encodeURIComponent(title), "X-Samma-Filename": encodeURIComponent(file.name),
        ...(recordId ? { "X-Samma-Record": encodeURIComponent(recordId) } : {}),
      }, body: file });
      if (!response.ok) throw new Error("Upload could not be completed. Check the record before retrying.");
      const result = await response.json(); router.push(`/records/${result.recordId}`); router.refresh();
    } catch { setError("Upload could not be completed. Check your access, file and size limit; check the record before retrying."); }
    finally { setBusy(false); }
  }
  return <form className="stack" onSubmit={save}>
    <p className="notice warning">DEV: synthetic files only. Files are not malware scanned.</p>
    <label className="stack">Record type<select disabled={Boolean(recordId) || busy} value={definitionId} onChange={event => setDefinitionId(event.target.value)}>{definitions.map(definition => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>
    <label className="stack">Title<input required maxLength={200} value={title} disabled={Boolean(recordId) || busy} onChange={event => setTitle(event.target.value)} /></label>
    <label className="stack">File (PDF, PNG or JPEG; up to {Math.floor(maxBytes / 1048576)} MiB)<input required type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
    {selected ? <p className="muted">{selected.classification.replaceAll("_", " ")} · Definition version {selected.version} · Person visible: {selected.personVisible ? "yes" : "no"}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <button className="button" disabled={busy || !file || !definitionId} type="submit">{busy ? "Uploading…" : recordId ? "Save new version" : "Save record"}</button>
  </form>;
}
