import { createHmac, timingSafeEqual } from "node:crypto";
export const definitionCsrf = (secret: string, token: string) => createHmac("sha256", secret).update("samma-record-definitions-v1\0").update(token).digest("hex");
export const validDefinitionCsrf = (secret: string, token: string, supplied: string | null) => Boolean(supplied && /^[a-f0-9]{64}$/.test(supplied) && timingSafeEqual(Buffer.from(definitionCsrf(secret, token), "hex"), Buffer.from(supplied, "hex")));
