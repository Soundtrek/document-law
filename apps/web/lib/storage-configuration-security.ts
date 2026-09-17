import { createHmac, timingSafeEqual } from "node:crypto";

export const storageConfigurationCsrf = (secret: string, token: string) =>
  createHmac("sha256", secret).update("samma-storage-configuration-v1\0").update(token).digest("hex");

export const validStorageConfigurationCsrf = (secret: string, token: string, supplied: string | null) =>
  Boolean(supplied && /^[a-f0-9]{64}$/.test(supplied) &&
    timingSafeEqual(Buffer.from(storageConfigurationCsrf(secret, token), "hex"), Buffer.from(supplied, "hex")));
