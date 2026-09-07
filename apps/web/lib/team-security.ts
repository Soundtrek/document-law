import { createHmac, timingSafeEqual } from "node:crypto";
export function teamCsrf(secret: string, sessionToken: string) {
  return createHmac("sha256", secret).update("samma-company-team-v1\0").update(sessionToken).digest("hex");
}
export function validTeamCsrf(secret: string, sessionToken: string, supplied: unknown): boolean {
  return typeof supplied === "string" && /^[a-f0-9]{64}$/.test(supplied) &&
    timingSafeEqual(Buffer.from(teamCsrf(secret, sessionToken), "hex"), Buffer.from(supplied, "hex"));
}
export function teamRoleInput(value: unknown): value is { companyId: string; memberId: string; roleIds: string[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const id = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 128;
  return Object.keys(data).sort().join(",") === "companyId,memberId,roleIds" && id(data.companyId) && id(data.memberId) &&
    Array.isArray(data.roleIds) && data.roleIds.length <= 100 && data.roleIds.every(id);
}
