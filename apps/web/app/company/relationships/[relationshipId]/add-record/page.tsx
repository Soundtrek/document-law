import Link from "next/link";
import { relationshipProfile } from "../../../../../lib/workflow-service";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../../lib/access";
import { db } from "../../../../../lib/database";
import { domainDefinition } from "../../../../../lib/record-access";
import { uploadContext } from "../../../../../lib/record-service";
import { uploadLimit } from "../../../../../lib/upload-staging";
import { AddRecordForm } from "../../../../../components/add-record-form";
import { PageHero } from "../../../../../components/page-hero";
export default async function AddRecordPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const session = await requireSession(), { relationshipId } = await params;
  await relationshipProfile(db, session.accountId, relationshipId).catch(() => notFound());
  const definitions = await db.recordDefinitionVersion.findMany({ where: { active: true, context: "RELATIONSHIP", recordDefinition: { active: true } }, orderBy: { version: "desc" } });
  const allowed = [];
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.recordDefinitionId)) continue;
    seen.add(definition.recordDefinitionId);
    try { await uploadContext(db, session.accountId, relationshipId, definition.id); allowed.push(domainDefinition(definition)); } catch { /* deny by default */ }
  }

  return <main className="page-shell"><PageHero eyebrow="RECORDS" title="Add record" description="Add a file to this employment relationship." /><Link href={`/company/people/${relationshipId}`}>Employee profile</Link><section className="card">{allowed.length ? <AddRecordForm definitions={allowed} relationshipId={relationshipId} maxBytes={uploadLimit()} /> : <p>No record types are currently available for your functional roles.</p>}</section></main>;
}
