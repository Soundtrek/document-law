"use client";

import { useEffect, useRef, useState } from "react";

export function SignInForm() {
  const emailInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const email = sessionStorage.getItem("samma.sign-in.email");
      sessionStorage.removeItem("samma.sign-in.email");
      if (email && emailInput.current) emailInput.current.value = email;
    } catch {
      // Email entry still works when browser storage is unavailable.
    }
  }, []);
  const [ready, setReady] = useState(false);

  return (
    <form className="stack" onSubmit={(event) => { event.preventDefault(); setReady(true); }}>
      <label className="stack">
        <strong>Email address</strong>
        <input
          autoComplete="email"
          onChange={() => setReady(false)}
          ref={emailInput}
          required
          placeholder="name@example.com"
          style={{ minHeight: 46, border: "1px solid var(--samma-border-strong)", borderRadius: "var(--samma-radius-control)", padding: "0 12px", background: "var(--samma-surface)" }}
          type="email"
        />
      </label>
      <button className="button" type="submit">Continue with email</button>
      {ready ? <p className="notice warning">Email verification is not available in this preview. No verification email has been sent.</p> : null}
      <div className="stack">
        <span className="record-meta">Future linked identity providers</span>
        <div className="actions">
          <button className="button secondary" disabled type="button">Google — later</button>
          <button className="button secondary" disabled type="button">Microsoft — later</button>
          <button className="button secondary" disabled type="button">Apple — later</button>
        </div>
      </div>
    </form>
  );
}
