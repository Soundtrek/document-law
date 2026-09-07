"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamRole } from "../lib/company-team";

type Invitation = { id: string; invitedEmail: string; expiresAt: string; company: { name: string }; initialRoles: { functionalRole: TeamRole }[] };
async function post(csrf: string, data: object) {
  const response = await fetch("/api/company/team-invitations", { method: "POST", headers: { "Content-Type": "application/json", "X-SAMMA-CSRF": csrf }, body: JSON.stringify(data) });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    if (response.status === 422) throw new Error(result.code === "invalid_email" ? "Enter a valid email address." : "One of these roles is no longer available. Refresh and try again.");
    if (response.status === 409) throw new Error("This invitation is no longer available. Refresh to see the current state.");
    if ([401, 403].includes(response.status)) throw new Error("This action is unavailable for your account. Sign in again or refresh the page.");
    throw new Error("The invitation could not be updated. Please try again.");
  }
  return response.json();
}
export function AddTeamMember({ companyId, roles, csrf }: { companyId: string; roles: TeamRole[]; csrf: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return <div className="team-invite-composer"><button className="button" type="button" disabled={busy} aria-expanded={open} aria-controls="add-team-member-form" onClick={() => { setOpen(!open); setError(""); }}>+ Add team member</button>
    {open ? <form id="add-team-member-form" className="stack team-access-form" onSubmit={async event => {
      event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
      setBusy(true); setError(""); setMessage("");
      try {
        const result = await post(csrf, { action: "send", companyId, email: data.get("email"), roleIds: data.getAll("roleIds") });
        setMessage(!result.created ? "Invitation already pending. Revoke it to change the initial roles or send a new email." : result.mailDelivered ? "Invitation sent. Access begins after acceptance." : "Invitation created, but email delivery failed. It is available in the recipient’s inbox. Revoke and invite again to resend the email.");
        form.reset(); setOpen(false); router.refresh();
      } catch (error) { setError(error instanceof Error ? error.message : "Invitation unavailable."); }
      finally { setBusy(false); }
    }}>
      <div className="landing-field"><label htmlFor="team-invite-email">Email address</label><input id="team-invite-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></div>
      <fieldset disabled={busy}><legend>Initial roles</legend>{roles.map(role => <label key={role.id} className="team-role-option"><input type="checkbox" name="roleIds" value={role.id} /><span><strong>{role.code}</strong><span className="muted">{role.label}</span></span></label>)}</fieldset>
      <div className="actions"><button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Send invite"}</button><button className="button secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
      {error ? <p role="alert" className="landing-error">{error}</p> : null}
    </form> : null}{message ? <p role="status" className="notice">{message}</p> : null}</div>;
}
export function TeamInvitationList({ invitations, csrf, company = false }: { invitations: Invitation[]; csrf: string; company?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [resolved, setResolved] = useState<string[]>([]);
  async function act(id: string, action: "accept" | "decline" | "revoke") {
    setBusy(id); setError(""); setMessage("");
    try {
      await post(csrf, { action, invitationId: id }); setResolved(previous => [...previous, id]);
      setMessage(action === "accept" ? "Invitation accepted. Your company team access is active." : action === "decline" ? "Invitation declined." : "Invitation revoked."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Invitation unavailable."); }
    finally { setBusy(null); }
  }
  return <div>{invitations.filter(invitation => !resolved.includes(invitation.id)).map(invitation => <article key={invitation.id} className="employment-invitation">
    <h3>{company ? invitation.invitedEmail : invitation.company.name}</h3>
    {!company ? <p>Invites you to join its SAMMA team.</p> : null}
    <p>Roles: {invitation.initialRoles.map(row => row.functionalRole.code).join(", ") || "No functional roles assigned"}</p><span className="pill">PENDING</span>
    <p className="muted">Expires <time dateTime={invitation.expiresAt}>{new Date(invitation.expiresAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" })} SAST</time></p>
    <div className="employment-actions">{company ? <button className="button secondary" disabled={busy !== null} onClick={() => void act(invitation.id, "revoke")}>Revoke</button> : <>
      <button className="button" disabled={busy !== null} onClick={() => void act(invitation.id, "accept")}>{busy === invitation.id ? "Updating…" : "Accept"}</button>
      <button className="button secondary" disabled={busy !== null} onClick={() => void act(invitation.id, "decline")}>Decline</button></>}</div>
  </article>)}{message ? <p role="status">{message}</p> : null}{error ? <p role="alert" className="landing-error">{error}</p> : null}</div>;
}
