"use client";

import type { RecordDefinitionVersion } from "@samma/domain";
import { useState } from "react";

export function GrantLegalAccessForm({ definitions }: { readonly definitions: readonly RecordDefinitionVersion[] }) {
  const [email, setEmail] = useState("");
  const [definitionId, setDefinitionId] = useState(definitions[0]?.definitionId ?? "");
  const [days, setDays] = useState("30");
  const [sent, setSent] = useState(false);

  return (
    <div className="stack">
      <label className="stack">
        <strong>1. Legal professional email</strong>
        <input
          onChange={(event) => { setEmail(event.target.value); setSent(false); }}
          placeholder="lawyer@example.com"
          style={{ minHeight: 44, border: "1px solid var(--samma-border-strong)", borderRadius: "var(--samma-radius-control)", padding: "0 12px", background: "var(--samma-surface)" }}
          type="email"
          value={email}
        />
      </label>

      <div className="grid">
        <label className="stack">
          <strong>2. Record scope</strong>
          <select
            onChange={(event) => { setDefinitionId(event.target.value); setSent(false); }}
            style={{ minHeight: 44, border: "1px solid var(--samma-border-strong)", borderRadius: "var(--samma-radius-control)", padding: "0 12px", background: "var(--samma-surface)" }}
            value={definitionId}
          >
            {definitions.map((definition) => <option key={definition.id} value={definition.definitionId}>{definition.name}</option>)}
          </select>
        </label>
        <label className="stack">
          <strong>Expiry</strong>
          <select
            onChange={(event) => { setDays(event.target.value); setSent(false); }}
            style={{ minHeight: 44, border: "1px solid var(--samma-border-strong)", borderRadius: "var(--samma-radius-control)", padding: "0 12px", background: "var(--samma-surface)" }}
            value={days}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
      </div>

      <div className="row">
        <span className="record-meta">Default: view-only, one employment relationship, explicit definition scope, automatic expiry.</span>
        <button className="button" disabled={!email || !definitionId} onClick={() => setSent(true)} type="button">3. Send access</button>
      </div>

      {sent ? <p className="notice warning">Synthetic Legal Access grant prepared for {email} for {days} days. No invitation was sent. The integrated workflow will persist a LegalAccessGrant and send a verified-email invitation.</p> : null}
    </div>
  );
}
