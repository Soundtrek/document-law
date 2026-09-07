import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../../components/page-hero";
import { CompanyPersonCard } from "../../../../components/company-people";
import { requireSession } from "../../../../lib/access";
import { db } from "../../../../lib/database";
import { companyPersonDetail, companyPersonIdentity } from "../../../../lib/company-people";
import { allowedRelationshipDefinitions } from "../../../../lib/record-service";
import { relationshipRecords } from "../../../../lib/record-queries";
import { RelationshipRecords } from "../../../../components/relationship-records";

export default async function CompanyPersonPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const session = await requireSession(), { relationshipId } = await params;
  const relationship = await companyPersonDetail(db, session.accountId, relationshipId);
  if (!relationship) notFound();
  const definitions = await allowedRelationshipDefinitions(db, session.accountId, relationship.id);
  const records = await relationshipRecords(db, session.accountId, relationship.id);
  return <main className="page-shell">
    <PageHero eyebrow="PEOPLE" title={companyPersonIdentity(relationship).name} description={relationship.company.name} />
    <CompanyPersonCard relationship={relationship} canAddRecord={definitions.length > 0} detail />
    <RelationshipRecords records={records} relationshipId={relationship.id} canAddRecord={definitions.length > 0} />
    <Link href="/company">Back to Company Info Center</Link>
  </main>;
}
