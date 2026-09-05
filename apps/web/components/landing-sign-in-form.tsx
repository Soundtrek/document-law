"use client";

import { submitAuth } from "./auth-controls";
import { useState, type FormEvent } from "react";

const emailPattern = String.raw`[^\s@]+@[^\s@]+\.[^\s@]+`;
const emailError = "Enter a valid email address, such as name@example.com.";

export function LandingSignInForm() {
  const [error, setError] = useState("");

  function continueWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("landing-email") as HTMLInputElement;
    const email = input.value.trim();
    if (!new RegExp(`^${emailPattern}$`).test(email)) {
      setError(emailError);
      event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }

    void submitAuth(event.currentTarget, "signin/keycloak").catch(() => setError("Sign in is unavailable. Please try again."));
  }

  return (
    <form action="/api/auth/signin" method="post" className="landing-form" onSubmit={continueWithEmail}>
      <input type="hidden" name="callbackUrl" value="/person" />
      <div className="landing-field">
        <label htmlFor="landing-email">Email address</label>
        <input
          id="landing-email"
          name="login_hint"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@example.com"
          required
          pattern={emailPattern}
          onInvalid={(event) => {
            event.preventDefault();
            setError(emailError);
            event.currentTarget.focus();
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "landing-email-error" : undefined}
          onChange={() => { if (error) setError(""); }}
        />
        {error ? <p className="landing-error" id="landing-email-error" role="alert">{error}</p> : null}
      </div>
      <button className="landing-submit" type="submit">Continue with email</button>
    </form>
  );
}
