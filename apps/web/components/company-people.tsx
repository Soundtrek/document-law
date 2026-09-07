import React from "react";
import Link from "next/link";
import { companyPersonIdentity, type CompanyPerson } from "../lib/company-people";

export function CompanyPersonCard({ relationship, canAddRecord, detail = false }: {
  readonly relationship: CompanyPerson; readonly canAddRecord: boolean; readonly detail?: boolean;
}) {
  const { name, email } = companyPersonIdentity(relationship);
  const href = `/company/relationships/${encodeURIComponent(relationship.id)}`;
  return <article className="card company-person-card" aria-label={name}>
    <h3>{name}</h3>
    {name !== email ? <p className="muted">{email}</p> : null}
    <div className="actions company-person-meta"><span className="pill">{relationship.status}</span><span className="pill info">{relationship.relationshipType}</span></div>
    <div className="actions">
      {!detail ? <Link className="button secondary" href={href}>View person</Link> : null}
      {canAddRecord ? <Link className="button" href={`${href}/add-record`}>Add record</Link> : null}
    </div>
  </article>;
}

export function CompanyPeople({ companyId, companyName, roles, canAddPerson, people }: {
  readonly companyId: string; readonly companyName: string; readonly roles: string; readonly canAddPerson: boolean;
  readonly people: readonly { relationship: CompanyPerson; canAddRecord: boolean }[];
}) {
  return <article className="card company-people"><h2>{companyName}</h2><p>{roles}</p>
    <h3>People</h3>
    {canAddPerson ? <div className="actions"><Link className="button" href={`/company/people/add?companyId=${encodeURIComponent(companyId)}`}>Add person</Link></div> : null}
    <div className="stack company-people-list">
      {people.length ? people.map(person => <CompanyPersonCard key={person.relationship.id} {...person} />) : <p className="muted">No employment relationships yet.</p>}
    </div>
  </article>;
}
