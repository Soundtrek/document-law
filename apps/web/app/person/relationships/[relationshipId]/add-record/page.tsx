import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../../lib/access";
import { db } from "../../../../../lib/database";
import { allowedRelationshipDefinitions } from "../../../../../lib/record-service";
import { uploadLimit } from "../../../../../lib/upload-staging";
import { AddRecordForm } from "../../../../../components/add-record-form";
import { PageHero } from "../../../../../components/page-hero";

export default async function ShareDocumentPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const session = await requireSession(), { relationshipId } = await params;
  const relationship = await db.personCompanyRelationship.findFirst({ where: { id: relationshipId,
    person: { accountId: session.accountId }, status: "ACTIVE", company: { status: "ACTIVE" } }, include: { company: { select: { name: true } } } });
  if (!relationship) notFound();
  const definitions = await allowedRelationshipDefinitions(db, session.accountId, relationship.id, "PERSON");
  if (!definitions.length) notFound();
  return <main className="page-shell">
    <PageHero eyebrow="MY COMPANIES" title={`Share document with ${relationship.company.name}`} description="Choose a record type and upload your document." />
    <section className="card"><AddRecordForm definitions={definitions} relationshipId={relationship.id} actorKind="PERSON" maxBytes={uploadLimit()} /></section>
    <Link href="/person#companies">Back to Personal Info Center</Link>
  </main>;
}
