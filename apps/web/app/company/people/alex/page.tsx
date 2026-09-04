import {
  buildCompanyEmployeeRecordProjection,
  recentActivityForRelationship,
  syntheticActivities,
  syntheticCompany,
  syntheticDefinitions,
  syntheticOwnerActor,
  syntheticPerson,
  syntheticRecords,
  syntheticRelationship,
} from "@juanity/domain";
import Link from "next/link";

import { ActivityList } from "../../../../components/activity-list";
import { PageHero } from "../../../../components/page-hero";
import { RecordList } from "../../../../components/record-list";

const now = "2026-09-05T10:00:00.000Z";

export default function CompanyEmployeeProfilePage() {
  const records = buildCompanyEmployeeRecordProjection(
    syntheticOwnerActor,
    syntheticRelationship,
    syntheticRecords,
    syntheticDefinitions,
    now,
  );
  const activity = recentActivityForRelationship(syntheticRelationship.id, syntheticActivities);

  return (
    <main className="page-shell">
      <PageHero
        eyebrow={`${syntheticCompany.name} · EMPLOYEE PROFILE`}
        title={syntheticPerson.displayName}
        description="This page is the company-side view of one Person ↔ Company relationship. It contains only relationship-scoped information and records authorised for the current member's functional roles."
        nav={[
          { href: "/company/people/alex", label: "Overview", active: true },
          { href: "/company/people/alex#records", label: "Records" },
          { href: "/company/people/alex#activity", label: "Activity" },
          { href: "/legal-access", label: "Legal Access" },
        ]}
      />

      <section className="grid">
        <article className="card">
          <div className="row">
            <div>
              <p className="eyebrow">Relationship</p>
              <h2>{syntheticRelationship.relationshipType}</h2>
            </div>
            <span className="pill">{syntheticRelationship.status}</span>
          </div>
          <p className="muted">Reference: {syntheticRelationship.externalReference}</p>
          <p className="muted">The employee's independent Juanity account remains separate from this company relationship.</p>
        </article>

        <article className="card">
          <p className="eyebrow">Quick Actions</p>
          <h2>Keep routine work inside three clicks</h2>
          <div className="actions">
            <Link className="button" href="/company/people/alex/add-record">Add record</Link>
            <Link className="button secondary" href="/company/people/alex/grant-legal-access">Grant Legal Access</Link>
          </div>
          <p className="muted">Record type, visibility, retention and review behaviour come from the active Governance definition rather than being reconfigured here.</p>
        </article>

        <article className="card full" id="records">
          <div className="row">
            <div>
              <p className="eyebrow">Shared Relationship Records</p>
              <h2>{records.length} records visible to this HR-enabled synthetic actor</h2>
            </div>
            <span className="pill info">OWNER + HR</span>
          </div>
          <RecordList records={records} />
          <p className="notice">If this actor only held OWNER, the domain policy tests prove these HR/Payroll records would not automatically become visible.</p>
        </article>

        <article className="card full" id="activity">
          <p className="eyebrow">Activity</p>
          <h2>Relationship history</h2>
          <ActivityList events={activity} />
        </article>
      </section>
    </main>
  );
}
