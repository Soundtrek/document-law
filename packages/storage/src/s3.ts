import { Readable } from "node:stream";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, HeadBucketCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { collect, contentInfo, contentStream, validateObjectKey, verifiedStream, type StorageProvider, type PutObjectInput, type StoredObjectMetadata, type StoredObjectState } from "./index";
export interface S3Settings {
  endpoint?: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; forcePathStyle: boolean; timeoutMs: number;
}
const missing = (error: unknown) => typeof error === "object" && error !== null && "$metadata" in error && (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404;
export class S3StorageProvider implements StorageProvider {
  readonly client: S3Client;
  constructor(readonly settings: S3Settings, client?: S3Client) {
    this.client = client ?? new S3Client({
      ...(settings.endpoint ? { endpoint: settings.endpoint } : {}), region: settings.region,
      credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
      forcePathStyle: settings.forcePathStyle, maxAttempts: 1,
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
      requestHandler: new NodeHttpHandler({ connectionTimeout: 3000, requestTimeout: settings.timeoutMs, throwOnRequestTimeout: true }),
    });
  }
  private options() { return { abortSignal: AbortSignal.timeout(this.settings.timeoutMs) }; }
  async ready() { await this.client.send(new HeadBucketCommand({ Bucket: this.settings.bucket }), this.options()); }
  async putQuarantined(input: PutObjectInput): Promise<StoredObjectMetadata> {
    validateObjectKey(input.key);
    if (await this.metadata(input.key)) throw new Error("Object key already exists");
    const info = contentInfo(input);
    if (!Number.isSafeInteger(info.sizeBytes) || info.sizeBytes <= 0 || !/^[a-f0-9]{64}$/.test(info.checksumSha256)) throw new Error("Invalid content metadata");
    const metadata: StoredObjectMetadata = { key: input.key, contentType: input.contentType, ...info, state: "QUARANTINED" };
    const body = Readable.from(verifiedStream(contentStream(input), info));
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.settings.bucket, Key: input.key,
        Body: body, ContentLength: info.sizeBytes, ContentType: input.contentType,
        Metadata: { state: "QUARANTINED", sha256: info.checksumSha256 } }), this.options());
      // Independent streamed readback also verifies providers without checksum-header support.
      const stored = await this.getStream(input.key);
      if (!stored) throw new Error("Quarantine readback failed");
      for await (const chunk of verifiedStream(stored, info)) void chunk;
      return metadata;
    } catch (error) {
      // A timed-out PUT may have succeeded. Only this freshly generated key is eligible.
      try { await this.delete(input.key); } catch { throw new Error("Storage write failed; object reconciliation required"); }
      throw error;
    } finally { body.destroy(); }
  }
  async metadata(key: string): Promise<StoredObjectMetadata | null> {
    validateObjectKey(key);
    try {
      const row = await this.client.send(new HeadObjectCommand({ Bucket: this.settings.bucket, Key: key }), this.options());
      const state = row.Metadata?.state;
      if (!["QUARANTINED", "ACCEPTED", "REJECTED"].includes(state ?? "") || !/^[a-f0-9]{64}$/.test(row.Metadata?.sha256 ?? "") || !Number.isSafeInteger(row.ContentLength) || !row.ContentType) throw new Error("Invalid stored object metadata");
      return { key, contentType: row.ContentType, sizeBytes: row.ContentLength!, checksumSha256: row.Metadata!.sha256!, state: state as StoredObjectState };
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  private async transition(key: string, state: StoredObjectState) {
    const current = await this.metadata(key);
    if (!current || current.state !== "QUARANTINED") throw new Error("Invalid storage transition");
    await this.client.send(new CopyObjectCommand({ Bucket: this.settings.bucket, Key: key,
      CopySource: `${this.settings.bucket}/${key}`, MetadataDirective: "REPLACE", ContentType: current.contentType,
      Metadata: { state, sha256: current.checksumSha256 } }), this.options());
    const updated = await this.metadata(key);
    if (!updated || updated.state !== state || updated.checksumSha256 !== current.checksumSha256 || updated.sizeBytes !== current.sizeBytes) throw new Error("Storage transition failed");
    return updated;
  }
  async accept(key: string) { return this.transition(key, "ACCEPTED"); }
  async reject(key: string) { return this.transition(key, "REJECTED"); }
  private async getStream(key: string): Promise<AsyncIterable<Uint8Array> | null> {
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.settings.bucket, Key: key }), this.options());
      if (!object.Body) throw new Error("Missing object body");
      return object.Body as AsyncIterable<Uint8Array>;
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  async readAcceptedStream(key: string): Promise<AsyncIterable<Uint8Array> | null> {
    const metadata = await this.metadata(key);
    if (!metadata || metadata.state !== "ACCEPTED") return null;
    const stream = await this.getStream(key); return stream ? verifiedStream(stream, metadata) : null;
  }
  async readAccepted(key: string) { const stream = await this.readAcceptedStream(key); return stream ? collect(stream) : null; }
  async delete(key: string) {
    validateObjectKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.settings.bucket, Key: key }), this.options());
  }
}
