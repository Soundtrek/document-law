"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const emailPattern = String.raw`[^\s@]+@[^\s@]+\.[^\s@]+`;
const emailError = "Enter a valid email address, such as name@example.com.";

export function LandingSignInForm() {
  const router = useRouter();
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

    // Temporary handoff only; this does not authenticate or create an account.
    // Avoid putting the email into URLs, referrers or server request logs.
    try {
      sessionStorage.setItem("samma.sign-in.email", email);
    } catch {
      // The existing sign-in form remains usable when browser storage is blocked.
    }
    router.push("/sign-in");
  }

  return (
    <form action="/sign-in" className="landing-form" onSubmit={continueWithEmail}>
      <div className="landing-field">
        <label htmlFor="landing-email">Email address</label>
        <input
          id="landing-email"
          // No name: native fallback navigation must not put the email in a URL.
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
