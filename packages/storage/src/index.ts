import { createHash } from "node:crypto";

export type StoredObjectState = "QUARANTINED" | "ACCEPTED" | "REJECTED";
export interface StoredObjectMetadata {
  readonly key: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly state: StoredObjectState;
}
// Reopenable, bounded content. Paths and provider URLs never enter domain code.
export interface UploadSource {
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  open(): AsyncIterable<Uint8Array>;
}
export type UploadContent = { readonly bytes: Uint8Array } | { readonly source: UploadSource };
export type PutObjectInput = { readonly key: string; readonly contentType: string } & UploadContent;
export interface StorageProvider {
  putQuarantined(input: PutObjectInput): Promise<StoredObjectMetadata>;
  accept(key: string): Promise<StoredObjectMetadata>;
  reject(key: string): Promise<StoredObjectMetadata>;
  readAccepted(key: string): Promise<Uint8Array | null>;
  readAcceptedStream(key: string): Promise<AsyncIterable<Uint8Array> | null>;
  metadata(key: string): Promise<StoredObjectMetadata | null>;
  delete(key: string): Promise<void>;
  ready(): Promise<void>;
}
const safeId = (value: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Storage IDs must be opaque safe identifiers");
  return value;
};
export const createRecordObjectKey = (recordId: string, fileId: string): string =>
  `records/${safeId(recordId)}/files/${safeId(fileId)}`;
export const validateObjectKey = (key: string): void => {
  if (!/^records\/[A-Za-z0-9_-]+\/files\/[A-Za-z0-9_-]+$/.test(key)) throw new Error("Invalid object key");
};
export const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export const contentInfo = (content: UploadContent) => "bytes" in content
  ? { sizeBytes: content.bytes.byteLength, checksumSha256: sha256(content.bytes) }
  : { sizeBytes: content.source.sizeBytes, checksumSha256: content.source.checksumSha256 };
export async function* contentStream(content: UploadContent): AsyncIterable<Uint8Array> {
  if ("bytes" in content) yield content.bytes;
  else yield* content.source.open();
}
export async function* verifiedStream(stream: AsyncIterable<Uint8Array>, expected: Pick<StoredObjectMetadata, "sizeBytes" | "checksumSha256">): AsyncIterable<Uint8Array> {
  const hash = createHash("sha256"); let size = 0;
  for await (const chunk of stream) {
    size += chunk.byteLength;
    if (size > expected.sizeBytes) throw new Error("Object size mismatch");
    hash.update(chunk); yield chunk;
  }
  if (size !== expected.sizeBytes || hash.digest("hex") !== expected.checksumSha256) throw new Error("Object integrity mismatch");
}
export async function collect(stream: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
export class InMemoryStorageProvider implements StorageProvider {
  readonly #objects = new Map<string, { bytes: Uint8Array; metadata: StoredObjectMetadata }>();
  async putQuarantined(input: PutObjectInput): Promise<StoredObjectMetadata> {
    validateObjectKey(input.key);
    if (this.#objects.has(input.key)) throw new Error("Object key already exists");
    const info = contentInfo(input);
    const bytes = await collect(verifiedStream(contentStream(input), info));
    const metadata: StoredObjectMetadata = { key: input.key, contentType: input.contentType, ...info, state: "QUARANTINED" };
    this.#objects.set(input.key, { bytes: Uint8Array.from(bytes), metadata });
    return metadata;
  }
  async accept(key: string) { return this.#transition(key, "ACCEPTED"); }
  async reject(key: string) { return this.#transition(key, "REJECTED"); }
  async readAccepted(key: string): Promise<Uint8Array | null> {
    const stream = await this.readAcceptedStream(key); return stream ? collect(stream) : null;
  }
  async readAcceptedStream(key: string): Promise<AsyncIterable<Uint8Array> | null> {
    const object = this.#objects.get(key);
    if (!object || object.metadata.state !== "ACCEPTED") return null;
    return contentStream({ bytes: Uint8Array.from(object.bytes) });
  }
  async metadata(key: string) { return this.#objects.get(key)?.metadata ?? null; }
  async delete(key: string) { this.#objects.delete(key); }
  async ready() {}
  #transition(key: string, state: StoredObjectState): StoredObjectMetadata {
    const object = this.#objects.get(key);
    if (!object) throw new Error("Object not found");
    if (object.metadata.state !== "QUARANTINED") throw new Error("Invalid storage transition");
    object.metadata = { ...object.metadata, state }; return object.metadata;
  }
}
export { S3StorageProvider } from "./s3";
export { storageSettings, createStorageProvider } from "./config";
