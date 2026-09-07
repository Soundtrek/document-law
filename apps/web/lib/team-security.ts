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

type TeamInvitationInput = { action: "send"; companyId: string; email: string; roleIds: string[] } |
  { action: "accept" | "decline" | "revoke"; invitationId: string };
export function teamInvitationInput(value: unknown): value is TeamInvitationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const id = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 128;
  if (data.action === "send") return Object.keys(data).sort().join(",") === "action,companyId,email,roleIds" && id(data.companyId) &&
    typeof data.email === "string" && data.email.length <= 254 && Array.isArray(data.roleIds) && data.roleIds.length <= 100 && data.roleIds.every(id);
  return ["accept", "decline", "revoke"].includes(String(data.action)) && Object.keys(data).sort().join(",") === "action,invitationId" && id(data.invitationId);
}
