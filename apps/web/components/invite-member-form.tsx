"use client";

import type { FunctionalRoleDefinition } from "@juanity/domain";
import { useState } from "react";

export function InviteMemberForm({ roles }: { readonly roles: readonly FunctionalRoleDefinition[] }) {
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const toggleRole = (code: string) => {
    setSelectedRoles((current) => current.includes(code) ? current.filter((role) => role !== code) : [...current, code]);
    setSent(false);
  };

  return (
    <div className="stack">
      <label className="stack">
        <strong>1. Staff email</strong>
        <input
          onChange={(event) => { setEmail(event.target.value); setSent(false); }}
          placeholder="staff@example.com"
          style={{ minHeight: 44, border: "1px solid var(--jl-border-strong)", borderRadius: "var(--jl-radius-control)", padding: "0 12px", background: "var(--jl-surface)" }}
          type="email"
          value={email}
        />
      </label>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend><strong>2. Functional roles</strong></legend>
        <div className="actions">
          {roles.map((role) => (
            <label className="pill" key={role.code}>
              <input checked={selectedRoles.includes(role.code)} onChange={() => toggleRole(role.code)} type="checkbox" />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="row">
        <span className="record-meta">One human account may hold several roles. Owner remains governance, not automatic HR/Payroll/Legal access.</span>
        <button className="button" disabled={!email || selectedRoles.length === 0} onClick={() => setSent(true)} type="button">3. Send invite</button>
      </div>

      {sent ? <p className="notice warning">Synthetic invitation prepared for {email}. No email was sent. Real invitations will bind a single company, target email, role scope and expiry through the identity/mail adapters.</p> : null}
    </div>
  );
}
