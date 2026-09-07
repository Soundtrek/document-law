import React from "react";
import Link from "next/link";
import { companyPersonIdentity, type CompanyPerson } from "../lib/company-people";

export function CompanyPersonCard({ relationship, canAddRecord, detail = false }: {
  readonly relationship: CompanyPerson; readonly canAddRecord: boolean; readonly detail?: boolean;
}) {
  const { name, email } = companyPersonIdentity(relationship);
  const href = `/company/relationships/${encodeURIComponent(relationship.id)}`;
  const statusLabel = relationship.status.charAt(0) + relationship.status.slice(1).toLowerCase();
  const typeLabel = relationship.relationshipType.charAt(0) + relationship.relationshipType.slice(1).toLowerCase().replaceAll("_", " ");
  return <article className="card company-person-card" aria-label={name}>
    <header className="company-person-identity">
      <span className="company-person-avatar" aria-hidden="true">{Array.from(name)[0]?.toUpperCase()}</span>
      <div><h3>{name}</h3>{name !== email ? <p className="muted">{email}</p> : null}</div>
    </header>
    <div className="actions company-person-meta"><span className="pill" data-status={relationship.status}>{relationship.status}</span><span className="pill info">{relationship.relationshipType}</span></div>
    <div className="company-person-summary"><p>{typeLabel} relationship</p><p className="muted">{statusLabel}</p></div>
    <div className="actions company-person-actions">
      {!detail ? <Link className="button secondary" href={href}>View person</Link> : null}
      {canAddRecord ? <Link className="button" href={`${href}/add-record`}>Add record</Link> : null}
    </div>
  </article>;
}

export function CompanyPeople({ companyId, companyName, roles, canAddPerson, people }: {
  readonly companyId: string; readonly companyName: string; readonly roles: string; readonly canAddPerson: boolean;
  readonly people: readonly { relationship: CompanyPerson; canAddRecord: boolean }[];
}) {
  const addPersonHref = `/company/people/add?companyId=${encodeURIComponent(companyId)}`;
  const active = people.filter(({ relationship }) => relationship.status === "ACTIVE").length;
  const former = people.filter(({ relationship }) => relationship.status === "FORMER" || relationship.status === "ENDED").length;
  return <section className="company-people" id={`company-${companyId}`} aria-label={companyName}>
    <header className="card company-summary">
      <div className="company-summary-info">
        <p className="eyebrow">Company</p><h2>{companyName}</h2><p className="muted">{roles}</p>
        <dl className="company-summary-stats">
          <div><dt>People</dt><dd>{people.length}</dd></div>
          <div><dt>Active</dt><dd>{active}</dd></div>
          <div><dt>Former</dt><dd>{former}</dd></div>
        </dl>
      </div>
      {canAddPerson ? <div className="company-summary-invite">
        <Link className="button" href={addPersonHref}><span aria-hidden="true">+</span> Add person</Link>
        <p className="muted">Invite a person to connect with this company for employment records.</p>
      </div> : null}
    </header>
    <nav className="actions" aria-label="Company workspace"><a className="button secondary" href={`#people-${companyId}`} aria-current="page">People</a>
      {canAddPerson ? <Link className="button secondary" href={`/company/${encodeURIComponent(companyId)}/team`}>Team &amp; Access</Link> : null}
    </nav>
    <section id={`people-${companyId}`} className="company-people-section" aria-label={`People at ${companyName}`}>
      <header className="company-people-heading"><h2>People</h2><p className="muted">People connected to this company through employment relationships.</p></header>
      {people.length ? <div className="company-people-list">
        {people.map(person => <CompanyPersonCard key={person.relationship.id} {...person} />)}
      </div> : <div className="card company-people-empty"><p className="muted">No people connected yet.</p>
        {canAddPerson ? <Link className="button secondary" href={addPersonHref}>Add person</Link> : null}
      </div>}
    </section>
  </section>;
}
