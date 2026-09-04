import { syntheticDefinitions, syntheticOwnerActor } from "@juanity/domain";
import Link from "next/link";

import { AddRecordForm } from "../../../../../components/add-record-form";
import { PageHero } from "../../../../../components/page-hero";

export default function AddRecordPage() {
  const allowedDefinitions = syntheticDefinitions.filter((definition) =>
    definition.allowedCompanyRoles.some((role) => syntheticOwnerActor.roleCodes.includes(role)),
  );

  return (
    <main className="page-shell">
      <PageHero
        eyebrow="EMPLOYEE PROFILE · ADD RECORD"
        title="Add a relationship record"
        description="Daily users choose the approved record type and file. Juanity Governance supplies the security, visibility, retention and review defaults."
        nav={[
          { href: "/company/people/alex", label: "Employee" },
          { href: "/company/people/alex/add-record", label: "Add Record", active: true },
          { href: "/governance", label: "Definitions" },
        ]}
      />
      <section className="card">
        <AddRecordForm definitions={allowedDefinitions} />
        <div className="actions"><Link className="button secondary" href="/company/people/alex">Cancel / Back</Link></div>
      </section>
    </main>
  );
}
