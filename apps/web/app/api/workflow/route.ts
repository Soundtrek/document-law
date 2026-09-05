import { NextResponse } from "next/server";
import { apiSession } from "../../../lib/api-session";
import { authSettings } from "../../../lib/auth";
import { db } from "../../../lib/database";
import { createCompany, invite, acceptInvitation, changeTeam } from "../../../lib/workflow-service";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== authSettings().baseUrl || request.headers.get("x-samma-workflow") !== "1") return new Response(null, { status: 403, headers });
  const session = await apiSession();
  if (!session) return new Response(null, { status: 401, headers });
  try {
    // Bound input before parsing; ignore caller-supplied identity/capability fields.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Invalid request");
    const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 8192) { await reader.cancel(); throw new Error("Invalid request"); } chunks.push(part.value); } } finally { reader.releaseLock(); }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const field = (name: string) => { const value = input[name]; if (typeof value !== "string" || value.length > 300) throw new Error("Invalid request"); return value; };
    const actor = { accountId: session.accountId, sessionToken: session.sessionToken };
    let result: object;
    switch (field("operation")) {
      case "create-company": { const company = await createCompany(db, actor, field("name")); result = { destination: `/company?companyId=${company.id}` }; break; }
      case "invite": {
        const kind = field("kind"); if (kind !== "EMPLOYMENT" && kind !== "MEMBERSHIP") throw new Error("Invalid request");
        const roleIds = input.roleIds ?? []; if (!Array.isArray(roleIds) || !roleIds.every(id => typeof id === "string" && id.length <= 100)) throw new Error("Invalid request");
        const invitation = await invite(db, actor, { companyId: field("companyId"), email: field("email"), kind, roleIds, refresh: input.refresh === true });
        result = { message: invitation.state, ...(invitation.token ? { link: `${authSettings().baseUrl}/invitations/accept#${invitation.token}` } : {}) }; break;
      }
      case "accept": { const accepted = await acceptInvitation(db, actor, field("token")); result = { destination: accepted.kind === "MEMBERSHIP" ? `/company?companyId=${accepted.companyId}` : "/person" }; break; }
      case "team": {
        const action = field("action"); if (!["grant", "revoke", "remove", "cancel"].includes(action)) throw new Error("Invalid request");
        await changeTeam(db, actor, { companyId: field("companyId"), action: action as "grant" | "revoke" | "remove" | "cancel", ...(action === "cancel" ? { invitationId: field("invitationId") } : { memberId: field("memberId"), ...(action !== "remove" ? { roleId: field("roleId") } : {}) }) }); result = { message: "Access updated." }; break;
      }
      default: throw new Error("Invalid request");
    }
    return NextResponse.json(result, { headers });
  } catch { return NextResponse.json({ error: "This action is unavailable. Check your access, invitation expiry and fields. Keep at least one active Company Owner." }, { status: 403, headers }); }
}
