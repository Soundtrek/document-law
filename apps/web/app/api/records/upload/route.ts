import { NextResponse } from "next/server";
import { apiSession } from "../../../../lib/api-session";
import { authSettings } from "../../../../lib/auth";
import { db } from "../../../../lib/database";
import { persistRelationshipUpload } from "../../../../lib/record-service";
import { authoriseUploadRequest } from "../../../../lib/record-upload-request";
import { getStorage, getScanner, scanPolicy } from "../../../../lib/storage";
import { stageUpload, uploadLimit } from "../../../../lib/upload-staging";
export const runtime = "nodejs";
let inFlight = 0;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== authSettings().baseUrl || request.headers.get("x-samma-upload") !== "1") return new Response(null, { status: 403 });
  const session = await apiSession();
  if (!session) return new Response(null, { status: 401 });
  if (inFlight >= 2) return NextResponse.json({ error: "Uploads are busy. Try again shortly." }, { status: 429 });
  let input: Awaited<ReturnType<typeof authoriseUploadRequest>>;
  try {
    input = await authoriseUploadRequest(db, session.accountId, request);
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
