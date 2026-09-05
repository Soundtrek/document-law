import { syntheticCompany, syntheticMembers, syntheticPerson, syntheticRelationship, syntheticRoleGrants } from "@samma/domain";
import Link from "next/link";

import { PageHero } from "../../components/page-hero";

export default function CompanyInfoCenterPage() {
  const activeMembers = syntheticMembers.filter((member) => member.status === "ACTIVE");

  return (
    <main className="page-shell">
      <PageHero
        eyebrow="COMPANY INFO CENTER"
        title={syntheticCompany.name}
        description="The company workspace centres daily work on people and their company relationships. Staff access is determined by explicit functional roles rather than one broad admin flag."
        nav={[
          { href: "/company", label: "Info Center", active: true },
          { href: "/company/people/alex", label: "People" },
          { href: "/company#team", label: "Team & Access" },
          { href: "/company#activity", label: "Activity" },
        ]}
      />

      <section className="stat-grid">
        <div className="stat"><strong>1</strong><span>Active employee relationships</span></div>
        <div className="stat"><strong>{activeMembers.length}</strong><span>Active company members</span></div>
        <div className="stat"><strong>2</strong><span>Synthetic record definitions in use</span></div>
      </section>

      <section className="grid">
        <article className="card">
          <div className="row">
            <div>
              <p className="eyebrow">People</p>
              <h2>{syntheticPerson.displayName}</h2>
            </div>
            <span className="pill">{syntheticRelationship.status}</span>
          </div>
          <p className="muted">Open the employee relationship profile to add or view role-authorised document knowledge.</p>
          <div className="actions"><Link className="button" href="/company/people/alex">Open employee profile</Link></div>
        </article>

        <article className="card">
          <p className="eyebrow">Needs Attention</p>
          <h2>1 verification record due</h2>
          <p className="muted">Review dates are knowledge attached to the record. The old file can remain retained while a replacement is requested.</p>
          <div className="actions"><Link className="button secondary" href="/company/people/alex">Review employee</Link></div>
        </article>

        <article className="card full" id="team">
          <div className="row">
            <div>
              <p className="eyebrow">Team & Access</p>
              <h2>Company members and functional roles</h2>
            </div>
            <Link className="button" href="/company/team/invite">Invite staff</Link>
          </div>
          <div className="stack">
            {syntheticMembers.map((member) => {
              const roles = syntheticRoleGrants.filter((grant) => grant.companyMemberId === member.id && !grant.revokedAt).map((grant) => grant.roleCode);
              return (
                <div className="record-row" key={member.id}>
                  <div className="record-title">
                    <strong>{member.accountId}</strong>
                    <span className="record-meta">Synthetic account · {member.status}</span>
                  </div>
                  <div className="actions">{roles.map((role) => <span className="pill" key={role}>{role}</span>)}</div>
                </div>
              );
            })}
          </div>
          <p className="notice">Owner governs company membership, but Owner alone is not a universal sensitive-record permission. Functional roles are explicit and combinable.</p>
        </article>

        <article className="card full" id="activity">
          <p className="eyebrow">Activity</p>
          <h2>Security-relevant changes will be visible here</h2>
          <p className="muted">Member invitations, role grants/revocations, record creation and sensitive access are designed to emit structured audit events.</p>
        </article>
      </section>
    </main>
  );
}
