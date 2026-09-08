import { hasDocumentSettingsCapability } from "../../lib/definition-policy";
import { PageHero } from "../../components/page-hero";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { hasInvitationCapability } from "../../lib/employment-service";
import { CompanyPeople } from "../../components/company-people";
import { companyPersonSelect } from "../../lib/company-people";
import { allowedRelationshipDefinitions } from "../../lib/record-service";
export default async function CompanyPage() {
  const session = await requireSession();
  const memberships = await db.companyMember.findMany({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: { include: { relationships: { select: companyPersonSelect, orderBy: { createdAt: "asc" } } } }, roleGrants: { where: { revokedAt: null, functionalRole: { active: true } }, include: { functionalRole: true } } } });
  const companies = await Promise.all(memberships.map(async member => ({
    member,
    people: await Promise.all(member.company.relationships.map(async relationship => ({
      relationship, canAddRecord: (await allowedRelationshipDefinitions(db, session.accountId, relationship.id)).length > 0,
    }))),
  })));
  return <main className="page-shell"><PageHero eyebrow="COMPANY" title="Company Info Center" description="Companies where you have active membership." />
    <section className="company-workspaces">{companies.length ? companies.map(({ member, people }) => <CompanyPeople key={member.id}
      companyId={member.companyId} companyName={member.company.name}
      roles={member.roleGrants.map(grant => grant.functionalRole.label).join(", ") || "No functional roles assigned"}
      canManageDocuments={hasDocumentSettingsCapability(member.roleGrants)} canAddPerson={hasInvitationCapability(member.roleGrants)} people={people} />) : <article className="card"><h2>No company access yet</h2><p className="muted">An authorised company owner can arrange your membership.</p></article>}</section>
  </main>;
}
