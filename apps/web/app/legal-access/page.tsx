import { PageHero } from "../../components/page-hero";
import { RecordList } from "../../components/record-list";
import { requireSession } from "../../lib/access";
import { db } from "../../lib/database";
import { canReadStoredRecord, domainDefinition, domainRecord } from "../../lib/record-access";
export default async function LegalAccessPage() {
  const session = await requireSession();
  const now = new Date();
  const grants = await db.legalAccessGrant.findMany({ where: { grantedToAccountId: session.accountId, status: "ACTIVE", revokedAt: null, canView: true, startsAt: { lte: now }, expiresAt: { gt: now } } });
  const stored = await db.record.findMany({ where: { context: "RELATIONSHIP", relationshipId: { in: grants.map(grant => grant.relationshipId) }, status: { not: "DELETED" } }, include: { definitionVersion: true } });
  const visible = [];
  for (const row of stored) if (await canReadStoredRecord(db, session.accountId, row)) visible.push({ record: domainRecord(row), definition: domainDefinition(row.definitionVersion), reviewDue: !!row.reviewDueAt && row.reviewDueAt < now });
  return <main className="page-shell"><PageHero eyebrow="LEGAL ACCESS" title="Records shared with you" description="Access follows your active, time-bound grants." /><section className="card"><RecordList records={visible} /></section></main>;
}
