"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { classifications, directions, directionLabel, retentionModes, type DefinitionPolicyInput } from "../lib/definition-policy";
export function DefinitionForm({ initial, definitionId, expectedVersion, roles, csrf, companyId, base }: {
  initial: DefinitionPolicyInput; definitionId?: string; expectedVersion?: number;
  roles: { id: string; code: string; label: string }[]; csrf: string; companyId: string | null; base: string;
}) {
  const [policy, setPolicy] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [reviewUnit, setReviewUnit] = useState("months"), [retentionUnit, setRetentionUnit] = useState("months");
  const router = useRouter();
  const set = <K extends keyof DefinitionPolicyInput>(key: K, value: DefinitionPolicyInput[K]) => setPolicy(p => ({ ...p, [key]: value }));
  async function save(action: "save" | "activate" | "deactivate") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/record-definitions", { method: "POST", headers: { "Content-Type": "application/json", "X-Samma-Csrf": csrf },
        body: JSON.stringify({ action, companyId, definitionId, expectedVersion, ...(action === "save" ? { policy } : {}) }) });
      const result = await response.json();
      if (!response.ok) { setError(result.code === "conflict" ? "The code is already used or this definition changed. Refresh and try again." : result.code === "denied" ? "Your access has changed. Sign in again or contact your company owner." : "Check the fields and active role choices, then try again."); return; }
      router.push(`${base}/${result.definitionId}`); router.refresh();
    } catch { setError("Could not save. Please try again."); } finally { setBusy(false); }
  }
  return <form className="definition-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save("save"); }}>
    <fieldset disabled={busy}><legend>Identity</legend><div className="definition-fields">
      <label>Name<input required maxLength={160} value={policy.name} onChange={e => set("name", e.target.value)} /></label>
      <label>Stable code<input required maxLength={80} pattern={definitionId ? undefined : "[A-Z][A-Z0-9_]*"} readOnly={Boolean(definitionId)} value={policy.code} onChange={e => set("code", e.target.value.toUpperCase())} /><span className="muted">Choose once. Used for reporting and integrations.</span></label>
      <label>Category<input required maxLength={100} value={policy.category} onChange={e => set("category", e.target.value)} /></label>
      <label>Description<textarea maxLength={2000} value={policy.description} onChange={e => set("description", e.target.value)} /></label>
    </div></fieldset>
    <fieldset disabled={busy}><legend>Direction and Person access</legend><div className="definition-fields">
      <label>Direction<select value={policy.direction} onChange={e => set("direction", e.target.value as DefinitionPolicyInput["direction"])}>{directions.map(d => <option key={d} value={d}>{directionLabel(d)}</option>)}</select></label>
      <label className="definition-check"><input type="checkbox" checked={policy.personVisible} onChange={e => set("personVisible", e.target.checked)} />Person visible</label>
    </div></fieldset>
    <fieldset disabled={busy}><legend>Company access</legend><p className="muted">Selected roles may create and read according to the document direction. OWNER only has document access when selected.</p><div className="definition-roles">{roles.map(role => <label className="definition-check" key={role.id}><input type="checkbox" checked={policy.roleIds.includes(role.id)} onChange={e => set("roleIds", e.target.checked ? [...policy.roleIds, role.id] : policy.roleIds.filter(id => id !== role.id))} />{role.label} <span className="muted">{role.code}</span></label>)}</div></fieldset>
    <fieldset disabled={busy}><legend>Classification</legend><label>Classification<select value={policy.classification} onChange={e => set("classification", e.target.value as DefinitionPolicyInput["classification"])}>{classifications.map(c => <option key={c}>{c}</option>)}</select></label></fieldset>
    <fieldset disabled={busy}><legend>Review / renewal</legend><label className="definition-check"><input type="checkbox" checked={policy.reviewMonths !== null} onChange={e => set("reviewMonths", e.target.checked ? 1 : null)} />Review required</label>
      {policy.reviewMonths !== null ? <div className="definition-fields"><label>Review period<input required type="number" min={1} max={reviewUnit === "years" ? 1000 : 12000} value={policy.reviewMonths / (reviewUnit === "years" ? 12 : 1)} onChange={e => set("reviewMonths", Number(e.target.value) * (reviewUnit === "years" ? 12 : 1))} /></label><label>Review unit<select value={reviewUnit} onChange={e => { setReviewUnit(e.target.value); set("reviewMonths", 1 * (e.target.value === "years" ? 12 : 1)); }}><option value="months">Months</option><option value="years">Years</option></select></label></div> : <p className="muted">No scheduled review.</p>}
    </fieldset>
    <fieldset disabled={busy}><legend>Retention</legend><label>Retention policy<select value={policy.retentionMode} onChange={e => { const mode = e.target.value as DefinitionPolicyInput["retentionMode"]; setPolicy(p => ({ ...p, retentionMode: mode, retentionMonths: mode === "NONE" ? null : p.retentionMonths ?? 1 })); }}>{retentionModes.map(mode => <option key={mode} value={mode}>{({ NONE: "Not configured", FIXED_FROM_CREATED: "Fixed from created", FIXED_FROM_RELATIONSHIP_END: "Fixed from relationship end" })[mode]}</option>)}</select></label>
      {policy.retentionMode !== "NONE" ? <div className="definition-fields"><label>Retention period<input required type="number" min={1} max={retentionUnit === "years" ? 1000 : 12000} value={(policy.retentionMonths ?? 1) / (retentionUnit === "years" ? 12 : 1)} onChange={e => set("retentionMonths", Number(e.target.value) * (retentionUnit === "years" ? 12 : 1))} /></label><label>Retention unit<select value={retentionUnit} onChange={e => { setRetentionUnit(e.target.value); set("retentionMonths", 1 * (e.target.value === "years" ? 12 : 1)); }}><option value="months">Months</option><option value="years">Years</option></select></label></div> : null}
      {policy.retentionMode === "FIXED_FROM_RELATIONSHIP_END" ? <p className="muted">The period starts when the relationship ends. Until then, the retention date is pending.</p> : null}
    </fieldset>
    <fieldset disabled={busy}><legend>Notification and availability</legend><label>Notification policy<select value="NONE" disabled><option>NONE</option></select></label><label className="definition-check"><input type="checkbox" checked={policy.active} onChange={e => set("active", e.target.checked)} />Active for new records</label></fieldset>
    {error ? <p className="notice warning" role="alert">{error}</p> : null}
    <div className="actions"><button className="button" disabled={busy}>{busy ? "Saving…" : definitionId ? "Save as new version" : "Create definition"}</button>
      {definitionId ? <button className="button secondary" type="button" disabled={busy} onClick={() => void save(initial.active ? "deactivate" : "activate")}>{initial.active ? "Deactivate" : "Activate"}</button> : null}</div>
  </form>;
}
