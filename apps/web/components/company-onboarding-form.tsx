"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { companySetupMessage } from "../lib/company-setup-errors";
import { OnboardingChoices } from "./onboarding-choices";

export function CompanyOnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [restart, setRestart] = useState(false);
  return <><form className="landing-form" onSubmit={async event => {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/onboarding/company", { method: "POST", body });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(companySetupMessage(result.code));
        setRestart(["setup_expired", "identity_mismatch", "session_required"].includes(result.code));
        setBusy(false); return;
      }
      router.push("/company"); router.refresh();
    } catch { setError(companySetupMessage("unexpected")); setBusy(false); }
  }}>
    <div className="landing-field"><label htmlFor="company-name">Company name</label>
      <input id="company-name" name="name" autoComplete="organization" required maxLength={160} disabled={busy} />
    </div>
    {error ? <p className="landing-error" role="alert">{error}</p> : null}
    <button className="landing-submit" type="submit" disabled={busy}>{busy ? "Creating workspace…" : "Create company workspace"}</button>
  </form>{restart ? <OnboardingChoices companyOnly /> : null}</>;
}
