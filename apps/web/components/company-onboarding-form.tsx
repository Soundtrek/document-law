"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompanyOnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="landing-form" onSubmit={async event => {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/onboarding/company", { method: "POST", body });
      if (!response.ok) throw new Error();
      router.push("/company"); router.refresh();
    } catch { setError("Company setup could not be completed. Check the name and try again, or restart from Create account."); setBusy(false); }
  }}>
    <div className="landing-field"><label htmlFor="company-name">Company name</label>
      <input id="company-name" name="name" autoComplete="organization" required maxLength={160} disabled={busy} />
    </div>
    {error ? <p className="landing-error" role="alert">{error}</p> : null}
    <button className="landing-submit" type="submit" disabled={busy}>{busy ? "Creating workspace…" : "Create company workspace"}</button>
  </form>;
}
