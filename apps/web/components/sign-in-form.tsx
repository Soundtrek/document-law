"use client";

import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);

  return (
    <div className="stack">
      <label className="stack">
        <strong>Email address</strong>
        <input
          autoComplete="email"
          onChange={(event) => { setEmail(event.target.value); setReady(false); }}
          placeholder="you@example.com"
          style={{ minHeight: 46, border: "1px solid var(--jl-border-strong)", borderRadius: "var(--jl-radius-control)", padding: "0 12px", background: "var(--jl-surface)" }}
          type="email"
          value={email}
        />
      </label>
      <button className="button" disabled={!email} onClick={() => setReady(true)} type="button">Continue with email</button>
      {ready ? <p className="notice warning">Development boundary reached for {email}. Credentials, verification, recovery and MFA will be handled by the OIDC identity provider rather than by Juanity application code.</p> : null}
      <div className="stack">
        <span className="record-meta">Future linked identity providers</span>
        <div className="actions">
          <button className="button secondary" disabled type="button">Google — later</button>
          <button className="button secondary" disabled type="button">Microsoft — later</button>
          <button className="button secondary" disabled type="button">Apple — later</button>
        </div>
      </div>
    </div>
  );
}
