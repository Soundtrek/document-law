import { syntheticDefinitions } from "@juanity/domain";

import { PageHero } from "../../components/page-hero";
import { canRenderSyntheticGovernance } from "../../lib/dev-security";

const formatMonths = (months?: number): string => months === undefined ? "Not configured" : `${months} months`;

export default function GovernancePage() {
  const developmentAccess = canRenderSyntheticGovernance();

  return (
    <main className="page-shell">
      <PageHero
        eyebrow="JUANITY GOVERNANCE"
        title="Record policy and platform controls"
        description="Governance is Juanity's restricted policy surface—not a generic company admin area. Production access requires verified identity, MFA and explicit Governance capabilities on every protected request."
        nav={[
          { href: "/governance", label: "Definitions", active: true },
          { href: "/governance#roles", label: "Role Policy" },
          { href: "/governance#audit", label: "Audit" },
          { href: "/", label: "Exit Governance" },
        ]}
      />

      {!developmentAccess ? (
        <section className="card">
          <p className="eyebrow">Access unavailable</p>
          <h2>Governance data is fail-closed without the approved identity path</h2>
          <p className="muted">Set JUANITY_DEV_IDENTITY_ENABLED=true only in a non-production development environment to view synthetic Governance fixtures. Production will use the OIDC/MFA capability boundary.</p>
        </section>
      ) : (
        <>
          <p className="notice warning">Synthetic development access is active. The principal passes verified-email, MFA and platform.definitions.manage checks in the development identity boundary.</p>

          <section className="grid">
            <article className="card full">
              <div className="row">
                <div>
                  <p className="eyebrow">Versioned Record Definitions</p>
                  <h2>Juanity sets policy once; daily users get smart defaults</h2>
                </div>
                <button className="button" type="button">New definition</button>
              </div>
              <div className="stack">
                {syntheticDefinitions.map((definition) => (
                  <article className="record-row" key={definition.id}>
                    <div className="record-title">
                      <strong>{definition.name}</strong>
                      <span className="record-meta">Version {definition.version} · {definition.context} · {definition.category}</span>
                      <span className="record-meta">Retention: {formatMonths(definition.retentionMonths)} · Review: {formatMonths(definition.reviewMonths)}</span>
                    </div>
                    <div className="actions">
                      <span className="pill info">{definition.classification.replaceAll("_", " ")}</span>
                      {definition.allowedCompanyRoles.map((role) => <span className="pill" key={role}>{role}</span>)}
                    </div>
                  </article>
                ))}
              </div>
              <p className="notice">Definitions are immutable by version. A policy change creates a new version; historic records remain bound to the definition version that governed them unless an explicit migration is approved.</p>
            </article>

            <article className="card" id="roles">
              <p className="eyebrow">Role Policy</p>
              <h2>Functional access, not universal admin</h2>
              <p className="muted">Company members may combine Owner, HR, Payroll, Clerk, Legal and other approved roles. Owner governs membership but does not silently inherit all sensitive-record access.</p>
            </article>

            <article className="card" id="audit">
              <p className="eyebrow">Audit</p>
              <h2>Policy changes are security events</h2>
              <p className="muted">Definition versions, role changes, Legal Access grants and sensitive record operations are designed to preserve actor, context and timestamp without copying document contents into logs.</p>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
