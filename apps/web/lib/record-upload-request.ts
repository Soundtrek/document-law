import type { createPrismaClient } from "@samma/database";
import { uploadContext } from "./record-service";
import { sanitiseFilename } from "./upload-staging";

// Called only after resolving the verified session. Headers select a mode, never authority.
export async function authoriseUploadRequest(db: ReturnType<typeof createPrismaClient>, accountId: string, request: Request) {
  try {
    const header = (name: string) => decodeURIComponent(request.headers.get(name) ?? "");
    const actorKind = header("x-samma-actor") || "COMPANY";
    if (actorKind !== "PERSON" && actorKind !== "COMPANY") throw new Error("Invalid actor context");
    const relationshipId = header("x-samma-relationship"), definitionId = header("x-samma-definition");
    const title = header("x-samma-title").trim(), recordId = header("x-samma-record");
    const filename = sanitiseFilename(header("x-samma-filename"));
    if (!relationshipId || !definitionId || !title || title.length > 200 || [relationshipId, definitionId, recordId].some(id => id.length > 100)) throw new Error("Invalid upload fields");
    await uploadContext(db, accountId, relationshipId, definitionId, recordId || undefined, actorKind);
    return { accountId, actorKind, relationshipId, definitionId, title, filename, ...(recordId ? { recordId } : {}) } as const;
  } catch {
    // No untrusted IDs, title, filename, body or headers enter the audit trail.
    await db.activityEvent.create({ data: { type: "RECORD_UPLOAD_DENIED", actorAccountId: accountId, summary: "Record upload authorisation or field validation denied." } });
    throw new Error("Upload not authorised");
  }
}
