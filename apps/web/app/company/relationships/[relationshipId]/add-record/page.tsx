import { notFound } from "next/navigation";
import { requireSession } from "../../../../../lib/access";
import { db } from "../../../../../lib/database";
import { allowedRelationshipDefinitions } from "../../../../../lib/record-service";
import { uploadLimit } from "../../../../../lib/upload-staging";
import { AddRecordForm } from "../../../../../components/add-record-form";
import { PageHero } from "../../../../../components/page-hero";
export default async function AddRecordPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const session = await requireSession(), { relationshipId } = await params;
  const allowed = await allowedRelationshipDefinitions(db, session.accountId, relationshipId);
  if (!allowed.length) notFound();
  return <main className="page-shell"><PageHero eyebrow="RECORDS" title="Add record" description="Add a file to this employment relationship." /><section className="card"><AddRecordForm definitions={allowed} relationshipId={relationshipId} maxBytes={uploadLimit()} /></section></main>;
}
