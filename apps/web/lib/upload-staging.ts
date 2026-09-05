import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { UploadSource } from "@samma/storage";
export function sanitiseFilename(input: string): string {
  const name = input.normalize("NFKC").replaceAll("\\", "/").split("/").at(-1) ?? "document";
  return name.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 180) || "document";
}
export function detectContentType(prefix: Uint8Array): string {
  const bytes = Buffer.from(prefix);
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  throw new Error("Use a PDF, PNG or JPEG file");
}
export function uploadLimit(env = process.env): number {
  const limit = Number(env.SAMMA_UPLOAD_MAX_BYTES ?? 10485760);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25 * 1024 * 1024) throw new Error("Invalid upload size configuration");
  return limit;
}
export async function stageUpload(request: Request, directory: string, maxBytes: number): Promise<{ source: UploadSource; contentType: string; cleanup(): Promise<void> }> {
  const root = await lstat(directory), containerRoot = await lstat("/");
  if (!root.isDirectory() || root.isSymbolicLink() || root.dev === containerRoot.dev) throw new Error("A separate mounted staging directory is required");
  if (!request.body) throw new Error("Empty upload");
  const stated = request.headers.get("content-length");
  if (stated && (!/^\d+$/.test(stated) || Number(stated) > maxBytes)) throw new Error("Upload exceeds the size limit");
  const temporary = await mkdtemp(join(directory, "samma-upload-")), path = join(temporary, "content");
  const cleanup = () => rm(temporary, { recursive: true, force: true });
  const hash = createHash("sha256"); let sizeBytes = 0, prefix = Buffer.alloc(0);
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream<Uint8Array>), new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        sizeBytes += chunk.length;
        if (sizeBytes > maxBytes) { callback(new Error("Upload exceeds the size limit")); return; }
        hash.update(chunk);
        if (prefix.length < 512) prefix = Buffer.concat([prefix, chunk.subarray(0, 512 - prefix.length)]);
        callback(null, chunk);
      },
    }), createWriteStream(path, { flags: "wx", mode: 0o600 }), { signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]) });
    if (!sizeBytes || (stated && sizeBytes !== Number(stated))) throw new Error("Empty or truncated upload");
    const contentType = detectContentType(prefix), checksumSha256 = hash.digest("hex");
    return { source: { sizeBytes, checksumSha256, open: () => createReadStream(path) }, contentType, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
