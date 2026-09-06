"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Invitation = { id: string; invitedEmail: string; expiresAt: string; company: { name: string } };
async function post(csrf: string, data: object) {
  const response = await fetch("/api/employment-invitations", { method: "POST", headers: { "Content-Type": "application/json", "X-SAMMA-CSRF": csrf }, body: JSON.stringify(data) });
  if (!response.ok) {
    if (response.status === 422) throw new Error("Enter a valid email address.");
    if (response.status === 409) throw new Error("This invitation is no longer pending. Refresh to see the current state.");
    if ([401, 403].includes(response.status)) throw new Error("This action is unavailable for your account. Sign in again or refresh the page.");
    throw new Error("The invitation could not be updated. Please try again.");
  }
  return response.json();
}
export function AddPersonForm({ companyId, csrf }: { companyId: string; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [result, setResult] = useState<{ created: boolean; mailDelivered: boolean } | null>(null);
  return <><form className="landing-form" onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget; const email = new FormData(form).get("email");
    setBusy(true); setError(""); setResult(null);
    try { setResult(await post(csrf, { action: "send", companyId, email })); form.reset(); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Invitation unavailable."); }
    finally { setBusy(false); }
  }}>
    <div className="landing-field"><label htmlFor="invite-email">Email address</label><input id="invite-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></div>
    <button className="landing-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send invite"}</button>
    {error ? <p role="alert" className="landing-error">{error}</p> : null}
  </form>{result ? <div role="status"><h2>{result.created ? result.mailDelivered ? "Invitation sent" : "Invitation created" : "Invitation already pending"}</h2><p>Pending acceptance</p>
    {result.created && !result.mailDelivered ? <p>Email could not be delivered. The invitation is available in the person’s inbox. To send a new email, revoke it below and invite again.</p> : null}</div> : null}</>;
}
export function EmploymentInvitationList({ invitations, csrf, company = false }: { invitations: Invitation[]; csrf: string; company?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [resolved, setResolved] = useState<string[]>([]);
  async function act(id: string, action: "accept" | "decline" | "revoke") {
    setBusy(id); setError(""); setMessage("");
    try {
      await post(csrf, { action, invitationId: id }); setResolved(previous => [...previous, id]);
      setMessage(action === "accept" ? "Invitation accepted. Your company relationship is active." : action === "decline" ? "Invitation declined." : "Invitation revoked."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Invitation unavailable."); }
    finally { setBusy(null); }
  }
  return <div>{invitations.filter(invitation => !resolved.includes(invitation.id)).map(invitation => <div key={invitation.id} className="employment-invitation">
    <h3>{company ? invitation.invitedEmail : invitation.company.name}</h3>
    {!company ? <p>{invitation.invitedEmail}</p> : <p className="muted">Pending acceptance</p>}
    <p className="muted">Expires <time dateTime={invitation.expiresAt}>{new Date(invitation.expiresAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" })} SAST</time></p>
    <div className="employment-actions">{company ? <button className="button secondary" disabled={busy !== null} onClick={() => void act(invitation.id, "revoke")}>Revoke</button> : <>
      <button className="button" disabled={busy !== null} onClick={() => void act(invitation.id, "accept")}>{busy === invitation.id ? "Updating…" : "Accept"}</button>
      <button className="button secondary" disabled={busy !== null} onClick={() => void act(invitation.id, "decline")}>Decline</button></>}</div>
  </div>)}{message ? <p role="status">{message}</p> : null}{error ? <p role="alert" className="landing-error">{error}</p> : null}</div>;
}
