"use client";
import { useState } from "react";

export async function submitAuth(form: HTMLFormElement, action: "signin/keycloak" | "signout") {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Authentication unavailable");
  const { csrfToken } = await response.json();
  if (typeof csrfToken !== "string") throw new Error("Authentication unavailable");
  const csrf = document.createElement("input");
  csrf.type = "hidden"; csrf.name = "csrfToken"; csrf.value = csrfToken; form.appendChild(csrf);
  form.method = "post"; form.action = `/api/auth/${action}`;
  form.submit();
}

export function LogoutButton() {
  const [error, setError] = useState(false);
  return <form onSubmit={event => { event.preventDefault(); void submitAuth(event.currentTarget, "signout").catch(() => setError(true)); }}>
    <input type="hidden" name="callbackUrl" value="/auth/logout" />
    <button className="button secondary" type="submit">Sign out</button>
    {error ? <span role="alert">Sign out unavailable. Please try again.</span> : null}
  </form>;
}
