import {
  buildLegalRecordProjection,
  syntheticCompany,
  syntheticDefinitions,
  syntheticLegalGrant,
  syntheticPerson,
  syntheticRecords,
  syntheticRelationship,
} from "@juanity/domain";

import { PageHero } from "../../components/page-hero";
import { RecordList } from "../../components/record-list";

const now = "2026-09-05T10:00:00.000Z";

export default function LegalAccessPage() {
  const records = buildLegalRecordProjection(
    syntheticLegalGrant,
    syntheticRelationship,
    syntheticRecords,
    syntheticDefinitions,
    now,
  );

  return (
    <main className="page-shell">
      <PageHero
        eyebrow="RESTRICTED LEGAL ACCESS"
        title={`${syntheticPerson.displayName} ↔ ${syntheticCompany.name}`}
        description="External legal professionals receive explicit relationship-scoped access grants. They do not become company members and do not inherit unrelated personal or company information."
        nav={[
          { href: "/legal-access", label: "Granted Relationship", active: true },
          { href: "/legal-access#records", label: "Records" },
          { href: "/legal-access#audit", label: "Access Terms" },
        ]}
      />

      <section className="grid">
        <article className="card">
          <p className="eyebrow">Grant Scope</p>
          <h2>Represents: {syntheticLegalGrant.represents}</h2>
          <div className="stack">
            <span className="record-meta">Starts: {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(syntheticLegalGrant.startsAt))}</span>
            <span className="record-meta">Expires: {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(syntheticLegalGrant.expiresAt))}</span>
          </div>
          <div className="actions">
            <span className="pill">View enabled</span>
            <span className="pill warning">Download {syntheticLegalGrant.canDownload ? "enabled" : "disabled"}</span>
          </div>
        </article>

        <article className="card" id="audit">
          <p className="eyebrow">Security Boundary</p>
          <h2>Every protected request re-checks scope</h2>
          <p className="muted">The grant is checked against relationship, definition/category scope, status and expiry. Sensitive access can be recorded in the audit trail.</p>
        </article>

        <article className="card full" id="records">
          <div className="row">
            <div>
              <p className="eyebrow">Authorised Records</p>
              <h2>{records.length} record visible under this synthetic grant</h2>
            </div>
            <span className="pill info">Time-bound</span>
          </div>
          <RecordList records={records} emptyText="No records are included in this legal-access scope." />
        </article>
      </section>
    </main>
  );
}
