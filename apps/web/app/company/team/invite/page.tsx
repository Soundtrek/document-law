import { syntheticRoleDefinitions } from "@juanity/domain";
import Link from "next/link";

import { InviteMemberForm } from "../../../../components/invite-member-form";
import { PageHero } from "../../../../components/page-hero";

export default function InviteCompanyMemberPage() {
  return (
    <main className="page-shell">
      <PageHero
        eyebrow="COMPANY · TEAM & ACCESS"
        title="Invite company staff"
        description="Invite one human account and assign the functional roles they actually perform. Roles can be combined for a one-person company or split across a larger team."
        nav={[
          { href: "/company", label: "Company" },
          { href: "/company/team/invite", label: "Invite Staff", active: true },
          { href: "/company#team", label: "Team & Access" },
        ]}
      />
      <section className="card">
        <InviteMemberForm roles={syntheticRoleDefinitions} />
        <div className="actions"><Link className="button secondary" href="/company#team">Cancel / Back</Link></div>
      </section>
    </main>
  );
}
