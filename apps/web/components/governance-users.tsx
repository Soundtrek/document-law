import React from "react";
import Link from "next/link";
import { PageHero } from "./page-hero";
import type { UserDirectoryDetail, UserDirectoryList, UserDirectoryView } from "../lib/governance-users";

export const governanceNavigation = [
  { href: "/governance", label: "Definitions" },
  { href: "/governance#roles", label: "Roles" },
  { href: "/governance/users", label: "Users" },
  { href: "/governance#audit", label: "Audit / Security" },
];
const usersNavigation = governanceNavigation.map(item => ({ ...item, active: item.label === "Users" }));
const date = (value: Date) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" }).format(value);
const status = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
const name = (person: { displayName: string } | null) => person?.displayName.trim() || "Name not provided";
const directoryLink = (query: string, view: UserDirectoryView, page = 1) => {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return `/governance/users${params.size ? `?${params}` : ""}`;
};
const directoryViews = [
  { value: "all", label: "All" }, { value: "person", label: "Person" },
  { value: "company", label: "Company user" }, { value: "governance", label: "Governance" },
] as const;

export function GovernanceUsers({ result }: { result: UserDirectoryList }) {
  return <main className="page-shell">
    <PageHero eyebrow="SAMMA GOVERNANCE" title="Users" description="Find an account and review its contact and company connections." nav={usersNavigation} />
    <section className="card">
      <form action="/governance/users" method="get" className="directory-search">
        {result.view !== "all" ? <input type="hidden" name="view" value={result.view} /> : null}
        <div className="landing-field"><label htmlFor="user-search">Search users</label><input id="user-search" type="search" name="q" maxLength={200} defaultValue={result.query} placeholder="Name or email address" /></div>
        <button className="button" type="submit">Search</button>
        {result.query ? <Link className="button secondary" href={directoryLink("", result.view)}>Clear</Link> : null}
      </form>
      <nav className="context-nav directory-filters" aria-label="User filters">
        {directoryViews.map(view => <Link key={view.value} href={directoryLink(result.query, view.value)} data-active={result.view === view.value ? "true" : "false"} aria-current={result.view === view.value ? "page" : undefined}>{view.label}</Link>)}
      </nav>
      <div className="directory-table-scroll" role="region" aria-label="User directory" tabIndex={0}>
        <table className="directory-table"><caption className="muted">{result.users.length} users on this page · Page {result.page}</caption><thead><tr>
          {['Name', 'Email', 'Status', 'Email verified', 'Created', 'Relationships', 'Memberships', 'Governance'].map(label => <th key={label} scope="col">{label}</th>)}
        </tr></thead><tbody>{result.users.map(user => <tr key={user.id}>
          <th scope="row"><Link href={`/governance/users/${encodeURIComponent(user.id)}`}>{name(user.person)}</Link></th>
          <td>{user.primaryEmail}</td><td>{status(user.status)}</td><td>{user.emailVerified ? "Yes" : "No"}</td><td><time dateTime={user.createdAt.toISOString()}>{date(user.createdAt)}</time></td>
          <td>{user.person?._count.relationships ?? 0}</td><td>{user._count.companyMemberships}</td><td>{user.governanceGrants.length ? "Yes" : "No"}</td>
        </tr>)}</tbody></table>
      </div>
      {!result.users.length ? <p className="muted">{result.query ? "No users match your search." : "No users to display."}</p> : null}
      <div className="row"><p className="muted directory-note">Counts include current and historical connections.</p><nav className="actions" aria-label="User directory pages">
        {result.page > 1 ? <Link className="button secondary" href={directoryLink(result.query, result.view, result.page - 1)}>Previous</Link> : null}
        {result.hasNext ? <Link className="button secondary" href={directoryLink(result.query, result.view, result.page + 1)}>Next</Link> : null}
      </nav></div>
    </section>
  </main>;
}

const activityLabels: Record<string, string> = {
  AUTH_LOGIN: "Signed in", AUTH_LOGOUT: "Signed out", AUTH_LOGIN_DENIED: "Sign-in denied",
  AUTH_SESSIONS_REVOKED: "Revoked SAMMA sessions", GOVERNANCE_ACCESS: "Governance access allowed", GOVERNANCE_DENIED: "Governance access denied",
};

export function GovernanceUserDetail({ user }: { user: UserDirectoryDetail }) {
  return <main className="page-shell">
    <PageHero eyebrow="SAMMA GOVERNANCE" title={name(user.person)} description="Account details and company connections." nav={usersNavigation} />
    <div><Link className="button secondary" href="/governance/users">Back to users</Link></div>
    <section className="grid">
      <article className="card"><h2>Account</h2><dl className="directory-details">
        <dt>Account ID</dt><dd>{user.id}</dd><dt>Primary email</dt><dd>{user.primaryEmail}</dd><dt>Email verified</dt><dd>{user.emailVerified ? "Yes" : "No"}</dd><dt>Status</dt><dd>{status(user.status)}</dd><dt>Created</dt><dd><time dateTime={user.createdAt.toISOString()}>{date(user.createdAt)}</time></dd>
      </dl></article>
      <article className="card"><h2>Contact</h2><dl className="directory-details"><dt>Display name</dt><dd>{name(user.person)}</dd><dt>Email</dt><dd>{user.primaryEmail}</dd></dl></article>
      <article className="card"><h2>Relationships</h2>{user.person?.relationships.length ? user.person.relationships.map(relationship => <div className="record-row" key={relationship.id}><div className="record-title"><strong>{relationship.company.name}</strong><span className="record-meta">{relationship.relationshipType}</span></div><span className="pill">{status(relationship.status)}</span></div>) : <p className="muted">No company relationships.</p>}</article>
      <article className="card"><h2>Memberships</h2>{user.companyMemberships.length ? user.companyMemberships.map(member => {
        const active = member.status === "ACTIVE" && member.company.status === "ACTIVE";
        return <div className="record-row" key={member.id}><div className="record-title"><strong>{member.company.name}</strong><span className="record-meta">Membership: {status(member.status)} · Company: {status(member.company.status)}</span><span className="record-meta">{active ? `Functional roles: ${member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "None"}` : "No active company access"}</span>{!active && member.roleGrants.length ? <span className="record-meta">Unrevoked roles (inactive): {member.roleGrants.map(grant => grant.functionalRole.label).join(", ")}</span> : null}</div><span className={`pill${active ? "" : " warning"}`}>{active ? "Active" : "Inactive"}</span></div>;
      }) : <p className="muted">No company memberships.</p>}</article>
      <article className="card"><h2>Governance</h2>{user.governanceGrants.length ? <><p className="muted">Current capability grants{user.status !== "ACTIVE" ? " (account access disabled)" : ""}</p><ul className="directory-capabilities">{[...new Set(user.governanceGrants.map(grant => grant.capability))].map(capability => <li key={capability}>{capability}</li>)}</ul></> : <p className="muted">No Governance capabilities.</p>}</article>
      <article className="card"><h2>Activity</h2><p className="muted">Recent authentication and Governance actions by this account. Times shown in South Africa time.</p>{user.activity.length ? user.activity.map(event => <div className="record-row" key={event.id}><strong>{activityLabels[event.type] ?? "Account activity"}</strong><time className="record-meta" dateTime={event.occurredAt.toISOString()}>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(event.occurredAt)}</time></div>) : <p className="muted">No recent activity available.</p>}</article>
    </section>
  </main>;
}
