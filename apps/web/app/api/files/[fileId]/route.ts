import { Readable } from "node:stream";
import { verifiedStream } from "@samma/storage";
import { apiSession } from "../../../../lib/api-session";
import { db } from "../../../../lib/database";
import { canReadStoredRecord } from "../../../../lib/record-access";
import { getStorage } from "../../../../lib/storage";
import { sanitiseFilename } from "../../../../lib/upload-staging";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await apiSession();
  if (!session) return new Response(null, { status: 401 });
  const { fileId } = await params;
  const file = await db.recordFile.findUnique({ where: { id: fileId }, include: { record: { include: { definitionVersion: true } } } });
  if (!file || !file.acceptedAt || !["ACCEPTED", "NOT_SCANNED_DEV"].includes(file.scanStatus) ||
    (file.scanStatus === "NOT_SCANNED_DEV" && (process.env.SAMMA_ENV !== "development" || process.env.SAMMA_SCAN_POLICY !== "not-scanned-dev")) ||
    !await canReadStoredRecord(db, session.accountId, file.record, "download")) return new Response(null, { status: 404 });
  try {
    const storage = getStorage(), metadata = await storage.metadata(file.storageKey);
    if (!metadata || metadata.state !== "ACCEPTED" || metadata.checksumSha256 !== file.checksumSha256 || metadata.sizeBytes !== file.sizeBytes || metadata.contentType !== file.contentType) throw new Error("Object mismatch");
    await db.activityEvent.create({ data: { type: "RECORD_FILE_DOWNLOAD", actorAccountId: session.accountId, recordId: file.recordId,
      companyId: file.record.companyId, personId: file.record.personId, relationshipId: file.record.relationshipId, summary: "Authorised private file download requested." } });
    const stream = await storage.readAcceptedStream(file.storageKey);
    if (!stream) throw new Error("Object unavailable");
    const filename = encodeURIComponent(sanitiseFilename(file.originalFilename)).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(Readable.toWeb(Readable.from(verifiedStream(stream, file))) as ReadableStream<Uint8Array>, { headers: {
      "Content-Type": file.contentType, "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "X-Samma-Scan-Status": file.scanStatus,
    } });
  } catch { return new Response("File temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
