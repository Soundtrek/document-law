import { syntheticDefinitions } from "@samma/domain";
import Link from "next/link";

import { GrantLegalAccessForm } from "../../../../../components/grant-legal-access-form";
import { PageHero } from "../../../../../components/page-hero";

export default function GrantLegalAccessPage() {
  return (
    <main className="page-shell">
      <PageHero
        eyebrow="EMPLOYEE PROFILE · LEGAL ACCESS"
        title="Grant scoped legal access"
        description="External counsel receives a time-bound view of this employment relationship and selected records. They do not become a company member."
        nav={[
          { href: "/company/people/alex", label: "Employee" },
          { href: "/company/people/alex/grant-legal-access", label: "Grant Access", active: true },
          { href: "/legal-access", label: "Legal View" },
        ]}
      />
      <section className="card">
        <GrantLegalAccessForm definitions={syntheticDefinitions} />
        <div className="actions"><Link className="button secondary" href="/company/people/alex">Cancel / Back</Link></div>
      </section>
    </main>
  );
}
