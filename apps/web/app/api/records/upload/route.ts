import { NextResponse } from "next/server";
import { apiSession } from "../../../../lib/api-session";
import { authSettings } from "../../../../lib/auth";
import { db } from "../../../../lib/database";
import { uploadContext, persistRelationshipUpload } from "../../../../lib/record-service";
import { getStorage, getScanner, scanPolicy } from "../../../../lib/storage";
import { stageUpload, sanitiseFilename, uploadLimit } from "../../../../lib/upload-staging";
export const runtime = "nodejs";
let inFlight = 0;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== authSettings().baseUrl || request.headers.get("x-samma-upload") !== "1") return new Response(null, { status: 403 });
  const session = await apiSession();
  if (!session) return new Response(null, { status: 401 });
  if (inFlight >= 2) return NextResponse.json({ error: "Uploads are busy. Try again shortly." }, { status: 429 });
  const header = (name: string) => decodeURIComponent(request.headers.get(name) ?? "");
  let input: { accountId: string; relationshipId: string; definitionId: string; title: string; filename: string; recordId?: string };
  try {
    const relationshipId = header("x-samma-relationship"), definitionId = header("x-samma-definition"), title = header("x-samma-title").trim(), recordId = header("x-samma-record");
    const filename = sanitiseFilename(header("x-samma-filename"));
    if (!relationshipId || !definitionId || !title || title.length > 200 || [relationshipId, definitionId, recordId].some(id => id.length > 100)) throw new Error("Invalid upload fields");
    input = { accountId: session.accountId, relationshipId, definitionId, title, filename, ...(recordId ? { recordId } : {}) };
    await uploadContext(db, session.accountId, relationshipId, definitionId, recordId || undefined);
  } catch { return NextResponse.json({ error: "Upload is not authorised or its fields are invalid." }, { status: 403 }); }
  inFlight++;
  let staged: Awaited<ReturnType<typeof stageUpload>> | undefined;
  try {
    const storage = getStorage(), directory = process.env.SAMMA_UPLOAD_STAGING_DIR;
    if (!directory) throw new Error("Staging is not configured");
    staged = await stageUpload(request, directory, uploadLimit());
    // Do not commit after logout/revocation while consuming the upload.
    const current = await apiSession();
    if (!current || current.accountId !== session.accountId || request.signal.aborted) return new Response(null, { status: 401 });
    const result = await persistRelationshipUpload(db, storage, getScanner(), scanPolicy(), { ...input, source: staged.source, contentType: staged.contentType, sessionToken: current.sessionToken });
    return NextResponse.json({ recordId: result.record.id, fileId: result.file.id, scanStatus: result.file.scanStatus }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload could not be completed. Use a PDF, PNG or JPEG within the size limit; check the record before retrying." }, { status: 503 });
  } finally {
    try { await staged?.cleanup(); } finally { inFlight--; }
  }
}
