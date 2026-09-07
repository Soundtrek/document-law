"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember, TeamRole } from "../lib/company-team";
export function CompanyTeamMember({ member, roles, companyId, csrf }: {
  readonly member: TeamMember; readonly roles: TeamRole[]; readonly companyId: string; readonly csrf: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(member.roles.map(role => role.id));
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/company/team", { method: "POST", headers: { "content-type": "application/json", "x-samma-csrf": csrf },
        body: JSON.stringify({ companyId, memberId: member.id, roleIds: selected }) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setMessage(result.code === "last_owner" ? "At least one active Company Owner is required." : response.status === 403 ? "You no longer have permission to manage this team." : "Access could not be saved. Refresh and try again.");
        return;
      }
      setEditing(false); setMessage("Access saved."); router.refresh();
    } catch { setMessage("Access could not be saved. Check your connection and try again."); }
    finally { setSaving(false); }
  }
  return <article className="card company-person-card company-team-card" aria-label={member.name}>
    <header className="company-person-identity"><span className="company-person-avatar" aria-hidden="true">{Array.from(member.name)[0]?.toUpperCase()}</span>
      <div><h3>{member.name}</h3><p className="muted">{member.email}</p></div></header>
    <div className="actions company-person-meta"><span className="pill">{member.status}</span></div>
    <div className="actions company-person-meta" aria-label="Functional roles">{member.roles.length ? member.roles.map(role => <span key={role.id} className="pill info" title={role.label}>{role.code}</span>) : <p className="muted">No functional roles assigned.</p>}</div>
    {member.status === "ACTIVE" ? editing ? <form className="stack team-access-form" onSubmit={save}>
      <fieldset disabled={saving}><legend>Functional roles</legend>{roles.map(role => <label key={role.id} className="team-role-option">
        <input type="checkbox" checked={selected.includes(role.id)} onChange={event => setSelected(current => event.target.checked ? [...current, role.id] : current.filter(id => id !== role.id))} />
        <span><strong>{role.code}</strong><span className="muted">{role.label}</span></span>
      </label>)}</fieldset>
      <div className="actions company-person-actions"><button className="button" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button>
        <button className="button secondary" disabled={saving} type="button" onClick={() => { setEditing(false); setMessage(""); }}>Cancel</button></div>
    </form> : <div className="actions company-person-actions"><button className="button secondary" type="button" onClick={() => { setSelected(member.roles.map(role => role.id)); setMessage(""); setEditing(true); }}>Manage access</button></div> : null}
    {message ? <p role="status" className="notice">{message}</p> : null}
  </article>;
}
