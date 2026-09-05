"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
type Field = { name: string; label: string; type?: "email" | "text" | "select"; options?: { id: string; label: string }[] };
export function WorkflowForm({ values, fields = [], label, roles = [], accept = false }: { values: Record<string, string | boolean>; fields?: Field[]; label: string; roles?: { id: string; label: string }[]; accept?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [link, setLink] = useState("");
  const tokenInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (accept && tokenInput.current && window.location.hash) { tokenInput.current.value = window.location.hash.slice(1); history.replaceState(null, "", window.location.pathname); } }, [accept]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage(""); setLink("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json", "X-Samma-Workflow": "1" }, body: JSON.stringify({ ...Object.fromEntries(form), ...values, ...(roles.length ? { roleIds: form.getAll("roleIds") } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (result.destination) router.push(result.destination);
      setMessage(result.message ?? "Saved."); setLink(result.link ?? ""); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save. Please try again."); }
    finally { setBusy(false); }
  }
  return <form className="stack" onSubmit={submit}>
    {fields.map(field => <label className="stack" key={field.name}>{field.label}{field.type === "select" ? <select required name={field.name}>{field.options?.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select> : <input required name={field.name} type={field.type ?? "text"} maxLength={field.type === "email" ? 254 : 160} />}</label>)}
    {roles.length ? <fieldset className="stack"><legend>Functional roles</legend>{roles.map(role => <label key={role.id}><input type="checkbox" defaultChecked={values.refresh === true} name="roleIds" value={role.id} /> {role.label}</label>)}</fieldset> : null}
    {accept ? <label className="stack">Invitation code<input required name="token" ref={tokenInput} maxLength={43} autoComplete="off" /></label> : null}
    <button className="button" disabled={busy} type="submit">{busy ? "Saving…" : label}</button>
    {message ? <p role="status">{message}</p> : null}
    {link ? <div className="stack"><label className="stack">DEV invitation link<input readOnly value={link} onFocus={event => event.target.select()} /></label><button type="button" className="button secondary" onClick={() => navigator.clipboard.writeText(link).then(() => setMessage("Link copied. No email was sent.")).catch(() => setMessage("Select and copy the link above."))}>Copy invitation link</button></div> : null}
  </form>;
}
