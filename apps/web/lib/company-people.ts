import type { createPrismaClient, Prisma } from "@samma/database";

type Database = ReturnType<typeof createPrismaClient>;
export const companyPersonSelect = {
  id: true, status: true, relationshipType: true,
  person: { select: { displayName: true, account: { select: { primaryEmail: true } } } },
  employmentInvitations: { where: { acceptedAt: { not: null } }, orderBy: { acceptedAt: "desc" }, take: 1, select: { invitedEmail: true } },
} satisfies Prisma.PersonCompanyRelationshipSelect;

export type CompanyPerson = Prisma.PersonCompanyRelationshipGetPayload<{ select: typeof companyPersonSelect }>;
export function companyPersonIdentity(relationship: CompanyPerson) {
  const email = relationship.employmentInvitations[0]?.invitedEmail ?? relationship.person.account.primaryEmail;
  return { name: relationship.person.displayName.trim() || email, email };
}

export function companyPersonDetail(db: Database, accountId: string, relationshipId: string) {
  return db.personCompanyRelationship.findFirst({
    where: { id: relationshipId, company: { status: "ACTIVE", members: { some: { accountId, status: "ACTIVE" } } } },
    select: { ...companyPersonSelect, company: { select: { name: true } } },
  });
}
