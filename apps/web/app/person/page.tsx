import {
  buildPersonRecordProjection,
  recentActivityForRelationship,
  syntheticActivities,
  syntheticCompany,
  syntheticDefinitions,
  syntheticPerson,
  syntheticRecords,
  syntheticRelationship,
} from "@samma/domain";
import Link from "next/link";

import { ActivityList } from "../../components/activity-list";
import { PageHero } from "../../components/page-hero";
import { RecordList } from "../../components/record-list";

const now = "2026-09-05T10:00:00.000Z";

export default function PersonInfoCenterPage() {
  const records = buildPersonRecordProjection(syntheticPerson.id, syntheticRecords, syntheticDefinitions, now);
  const reviewDue = records.filter((item) => item.reviewDue);
  const activity = recentActivityForRelationship(syntheticRelationship.id, syntheticActivities);

  return (
    <main className="page-shell">
      <PageHero
        eyebrow="PERSON INFO CENTER"
        title={syntheticPerson.displayName}
        description="Your employment relationships, records and actions stay attached to your SAMMA account even when a company relationship later ends."
        nav={[
          { href: "/person", label: "Info Center", active: true },
          { href: "/person#companies", label: "My Companies" },
          { href: "/person#records", label: "My Records" },
          { href: "/person#activity", label: "Activity" },
        ]}
      />

      <section className="grid">
        <article className="card full">
          <div className="row">
            <div>
              <p className="eyebrow">Needs Action</p>
              <h2>{reviewDue.length === 0 ? "Nothing due right now" : `${reviewDue.length} record needs review`}</h2>
            </div>
            {reviewDue.length > 0 ? <span className="pill warning">Review due</span> : <span className="pill">Up to date</span>}
          </div>
          {reviewDue.length > 0 ? <RecordList records={reviewDue} /> : <p className="muted">SAMMA will surface configured renewal/review dates here without deleting the historical record.</p>}
        </article>

        <article className="card" id="companies">
          <p className="eyebrow">My Companies</p>
          <h2>{syntheticCompany.name}</h2>
          <div className="row">
            <span className="pill">{syntheticRelationship.status}</span>
            <span className="record-meta">{syntheticRelationship.relationshipType}</span>
          </div>
          <p className="muted">Only records made available within this relationship appear here. The company does not gain access to unrelated private-person records.</p>
        </article>

        <article className="card">
          <p className="eyebrow">Account</p>
          <h2>Independent SAMMA identity</h2>
          <p className="muted">Your SAMMA account is separate from the employer relationship and is designed to survive job changes and future linked login providers.</p>
          <div className="actions"><Link className="button secondary" href="/">Back to development home</Link></div>
        </article>

        <article className="card full" id="records">
          <div className="row">
            <div>
              <p className="eyebrow">My Records</p>
              <h2>{syntheticCompany.name}</h2>
            </div>
            <span className="pill info">{records.length} visible</span>
          </div>
          <RecordList records={records} />
        </article>

        <article className="card full" id="activity">
          <p className="eyebrow">Recent Activity</p>
          <h2>Relationship updates</h2>
          <ActivityList events={activity} />
        </article>
      </section>
    </main>
  );
}
