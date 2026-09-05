"use client";
import Link from "next/link";
import { useState } from "react";
import { submitAuth } from "./auth-controls";

export function OnboardingChoices() {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return <section className="onboarding-entry" aria-labelledby="onboarding-title">
    <h2 id="onboarding-title">Create your account</h2>
    <p className="eyebrow">I&apos;m joining as</p>
    <div className="onboarding-choices">
      {[
        { value: "PERSON", label: "Person", description: "For individuals who want to receive and manage their employment records." },
        { value: "COMPANY", label: "Company", description: "For organisations that want to manage employment records for their people." },
      ].map(choice => <form key={choice.value} onSubmit={event => {
        event.preventDefault(); setBusy(true); setError(false);
        void submitAuth(event.currentTarget, "signin/keycloak").catch(() => { setBusy(false); setError(true); });
      }}>
        <input type="hidden" name="onboardingChoice" value={choice.value} />
        <input type="hidden" name="callbackUrl" value="/person" />
        <button className="onboarding-choice" type="submit" disabled={busy} aria-label={choice.label}>
          <strong>{choice.label}</strong><span>{choice.description}</span><span className="onboarding-continue">Continue →</span>
        </button>
      </form>)}
    </div>
    {error ? <p className="landing-error" role="alert">Sign in is unavailable. Please try again.</p> : null}
    <p className="muted">Already have an account? <Link href="/sign-in">Sign in</Link></p>
  </section>;
}
