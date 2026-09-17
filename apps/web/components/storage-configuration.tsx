"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "./page-hero";
import { governanceNavigation } from "./governance-users";

type PublicConfiguration = { id: string; label: string; provider: string; endpoint: string | null; region: string; bucket: string;
  forcePathStyle: boolean; requestTimeoutMs: number; status: string; lastTestedAt: Date | string | null; activatedAt: Date | string | null; updatedAt: Date | string | null };

const formatDate = (value: Date | string | null) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(value)) : "Not yet";

export function StorageConfigurationPanel({ overview, csrf }: { overview: { active: PublicConfiguration | null; drafts: PublicConfiguration[]; allowedHosts: string[] }; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState("");
  async function request(body: Record<string, unknown>) {
    setBusy(String(body.action)); setError(""); setMessage("");
    try {
      const response = await fetch("/api/governance/storage", { method: "POST", headers: { "Content-Type": "application/json", "X-Samma-Csrf": csrf }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errors: Record<string, string> = { invalid: "Check the endpoint, approved host, bucket, region and credentials.",
          connection_failed: "The connection or private object-operation test failed. Nothing was activated.",
          test_required: "Run a fresh successful test before activation.",
          migration_required: "This location cannot be activated while existing files point to the current storage. A controlled migration and reconciliation is required.",
          not_found: "That draft is no longer available." };
        setError(errors[result.code] ?? "The storage configuration could not be changed."); return;
      }
      setMessage(body.action === "save" ? "Draft saved. Test it before activation." : body.action === "test" ? "Connection, write, read and delete test passed." : "Storage configuration activated.");
      router.refresh();
    } catch { setError("The request could not be completed. Try again."); } finally { setBusy(""); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void request({ action: "save", label: form.get("label"), endpoint: form.get("endpoint") || undefined, region: form.get("region"),
      bucket: form.get("bucket"), accessKeyId: form.get("accessKeyId"), secretAccessKey: form.get("secretAccessKey"),
      forcePathStyle: form.get("forcePathStyle") === "on", requestTimeoutMs: Number(form.get("requestTimeoutMs")) });
  }
  const navigation = governanceNavigation.map(item => ({ ...item, active: item.label === "Storage" }));
  return <main className="page-shell">
    <PageHero eyebrow="SAMMA GOVERNANCE" title="Document storage" description="Configure and test a private S3-compatible provider. Existing files are never moved by this screen." nav={navigation} />
    {message ? <p className="notice success" role="status">{message}</p> : null}
    {error ? <p className="notice warning" role="alert">{error}</p> : null}
    <section className="grid">
      <article className="card"><h2>Active provider</h2>{overview.active ? <dl className="directory-details">
        <dt>Name</dt><dd>{overview.active.label}</dd><dt>Provider</dt><dd>{overview.active.provider}</dd><dt>Endpoint</dt><dd>{overview.active.endpoint ?? "Provider default"}</dd>
        <dt>Bucket</dt><dd>{overview.active.bucket}</dd><dt>Region</dt><dd>{overview.active.region}</dd><dt>Path-style requests</dt><dd>{overview.active.forcePathStyle ? "Yes" : "No"}</dd>
        <dt>Activated</dt><dd>{formatDate(overview.active.activatedAt)}</dd>
      </dl> : <p className="empty-state muted">No active storage provider is available.</p>}</article>
      <article className="card"><h2>Safety boundary</h2><p>Changing this configuration does not copy or delete files. A different bucket, endpoint, region or addressing mode is blocked while records exist.</p>
        <p className="muted">Approved endpoint hosts: {overview.allowedHosts.join(", ") || "None configured. Add an operator-approved host before saving a custom endpoint."}</p></article>
    </section>
    <section className="card"><h2>New configuration draft</h2><p className="muted">Credentials are encrypted before database storage and are never displayed again.</p>
      <form className="definition-form" onSubmit={save}><fieldset disabled={Boolean(busy)}><legend>Provider</legend><div className="definition-fields">
        <label className="form-field"><span className="form-label">Configuration name</span><input name="label" required maxLength={100} placeholder="NUC development Garage" /></label>
        <label className="form-field"><span className="form-label">Endpoint</span><input name="endpoint" type="url" maxLength={2048} placeholder="https://s3.example.com" /><span className="form-help">Leave empty only when the provider uses the SDK default endpoint.</span></label>
        <label className="form-field"><span className="form-label">Region</span><input name="region" required maxLength={100} defaultValue="garage" /></label>
        <label className="form-field"><span className="form-label">Bucket</span><input name="bucket" required maxLength={63} /></label>
        <label className="form-field"><span className="form-label">Access key</span><input name="accessKeyId" required maxLength={512} autoComplete="off" /></label>
        <label className="form-field"><span className="form-label">Secret key</span><input name="secretAccessKey" type="password" required maxLength={2048} autoComplete="new-password" /></label>
        <label className="form-field"><span className="form-label">Request timeout (ms)</span><input name="requestTimeoutMs" type="number" required min={100} max={30000} defaultValue={10000} /></label>
        <label className="definition-check"><input name="forcePathStyle" type="checkbox" defaultChecked />Use path-style requests</label>
      </div></fieldset><div className="actions"><button className="button" disabled={Boolean(busy)}>{busy === "save" ? "Saving…" : "Save draft"}</button></div></form>
    </section>
    <section className="card"><h2>Draft configurations</h2>{overview.drafts.length ? <div className="governance-list">{overview.drafts.map(draft => <div className="storage-draft" key={draft.id}>
      <div><strong>{draft.label}</strong><p className="record-meta">{draft.endpoint ?? "Provider default"} · {draft.bucket} · {draft.region}</p><p className="record-meta">Last successful test: {formatDate(draft.lastTestedAt)}</p></div>
      <div className="actions"><button className="button secondary" disabled={Boolean(busy)} onClick={() => void request({ action: "test", id: draft.id })}>{busy === "test" ? "Testing…" : "Test connection"}</button>
        <button className="button" disabled={Boolean(busy) || !draft.lastTestedAt} onClick={() => void request({ action: "activate", id: draft.id })}>{busy === "activate" ? "Activating…" : "Activate"}</button></div>
    </div>)}</div> : <p className="empty-state muted">No saved drafts.</p>}</section>
  </main>;
}
