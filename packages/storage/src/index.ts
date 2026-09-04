import { createHash } from "node:crypto";

export type StoredObjectState = "QUARANTINED" | "ACCEPTED" | "REJECTED";

export interface StoredObjectMetadata {
  readonly key: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly state: StoredObjectState;
}

export interface PutObjectInput {
  readonly key: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

export interface StorageProvider {
  putQuarantined(input: PutObjectInput): Promise<StoredObjectMetadata>;
  accept(key: string): Promise<StoredObjectMetadata>;
  reject(key: string): Promise<StoredObjectMetadata>;
  readAccepted(key: string): Promise<Uint8Array | null>;
  metadata(key: string): Promise<StoredObjectMetadata | null>;
  delete(key: string): Promise<void>;
}

const safeId = (value: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Storage IDs must be opaque safe identifiers");
  return value;
};

export const createRecordObjectKey = (recordId: string, fileId: string): string =>
  `records/${safeId(recordId)}/files/${safeId(fileId)}`;

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

interface StoredObjectInternal {
  readonly bytes: Uint8Array;
  metadata: StoredObjectMetadata;
}

export class InMemoryStorageProvider implements StorageProvider {
  readonly #objects = new Map<string, StoredObjectInternal>();

  async putQuarantined(input: PutObjectInput): Promise<StoredObjectMetadata> {
    if (this.#objects.has(input.key)) throw new Error("Object key already exists");
    const metadata: StoredObjectMetadata = {
      key: input.key,
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      checksumSha256: sha256(input.bytes),
      state: "QUARANTINED",
    };
    this.#objects.set(input.key, { bytes: Uint8Array.from(input.bytes), metadata });
    return metadata;
  }

  async accept(key: string): Promise<StoredObjectMetadata> {
    return this.#transition(key, "ACCEPTED");
  }

  async reject(key: string): Promise<StoredObjectMetadata> {
    return this.#transition(key, "REJECTED");
  }

  async readAccepted(key: string): Promise<Uint8Array | null> {
    const object = this.#objects.get(key);
    if (!object || object.metadata.state !== "ACCEPTED") return null;
    return Uint8Array.from(object.bytes);
  }

  async metadata(key: string): Promise<StoredObjectMetadata | null> {
    return this.#objects.get(key)?.metadata ?? null;
  }

  async delete(key: string): Promise<void> {
    this.#objects.delete(key);
  }

  #transition(key: string, state: StoredObjectState): StoredObjectMetadata {
    const object = this.#objects.get(key);
    if (!object) throw new Error("Object not found");
    object.metadata = { ...object.metadata, state };
    return object.metadata;
  }
}
