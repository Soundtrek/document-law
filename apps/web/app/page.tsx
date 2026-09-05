import Link from "next/link";

import { PageHero } from "../components/page-hero";

export default function HomePage() {
  return (
    <main className="page-shell">
      <PageHero
        eyebrow="V1 DEVELOPMENT FOUNDATION"
        title="Document knowledge, routed to the right people."
        description="This synthetic development shell proves the SAMMA Person ↔ Company ↔ Relationship model, configurable record policy, scoped legal access and Governance separation before real identity and object storage are connected."
      />

      <section className="grid">
        <article className="card">
          <p className="eyebrow">Person</p>
          <h2>Personal Info Center</h2>
          <p className="muted">See company relationships, records made available to you, items due for review and recent updates.</p>
          <div className="actions"><Link className="button" href="/person">Open Person view</Link></div>
        </article>

        <article className="card">
          <p className="eyebrow">Company</p>
          <h2>Company Info Center</h2>
          <p className="muted">Work from the employee relationship profile, with access constrained by company membership and functional roles.</p>
          <div className="actions"><Link className="button" href="/company">Open Company view</Link></div>
        </article>

        <article className="card">
          <p className="eyebrow">External counsel</p>
          <h2>Legal Access</h2>
          <p className="muted">A restricted view of one granted relationship and its approved records—without turning the lawyer into a company member.</p>
          <div className="actions"><Link className="button" href="/legal-access">Open Legal view</Link></div>
        </article>

        <article className="card">
          <p className="eyebrow">SAMMA only</p>
          <h2>Governance</h2>
          <p className="muted">Versioned record definitions, retention/review policy and platform controls. This route will require verified identity, MFA and Governance capabilities.</p>
          <div className="actions"><Link className="button" href="/governance">Open Governance shell</Link></div>
        </article>
      </section>

      <section className="card full">
        <div className="row">
          <div>
            <p className="eyebrow">Runtime status</p>
            <h2>Safe to run without production services</h2>
          </div>
          <span className="pill info">Synthetic fixtures only</span>
        </div>
        <p className="muted">No real employee information, live identity provider, payment gateway or S3 bucket is required for this first build. Those integrations attach through the prepared boundaries later.</p>
      </section>
    </main>
  );
}
