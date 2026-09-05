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
  const definitions = await db.recordDefinitionVersion.findMany({ where: { active: true, context: "RELATIONSHIP", recordDefinition: { active: true } }, orderBy: { version: "desc" } });
  const allowed = [];
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.recordDefinitionId)) continue;
    seen.add(definition.recordDefinitionId);
    try { await uploadContext(db, session.accountId, relationshipId, definition.id); allowed.push(domainDefinition(definition)); } catch { /* deny by default */ }
  }
  if (!allowed.length) notFound();
  return <main className="page-shell"><PageHero eyebrow="RECORDS" title="Add record" description="Add a file to this employment relationship." /><section className="card"><AddRecordForm definitions={allowed} relationshipId={relationshipId} maxBytes={uploadLimit()} /></section></main>;
}
