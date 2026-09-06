"use client";
import { useState } from "react";
import { submitAuth } from "./auth-controls";

export function CompanyRegistrationResume() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <form onSubmit={event => {
    event.preventDefault(); setBusy(true); setError(false);
    void submitAuth(event.currentTarget, "signin/keycloak").catch(() => { setBusy(false); setError(true); });
  }}>
    <input type="hidden" name="onboardingChoice" value="COMPANY" />
    <input type="hidden" name="onboardingAction" value="resume-company" />
    <input type="hidden" name="callbackUrl" value="/onboarding/company" />
    <button className="button" type="submit" disabled={busy}>Continue Company setup</button>
    {error ? <p role="alert">Sign in is unavailable. Please try again.</p> : null}
  </form>;
}
