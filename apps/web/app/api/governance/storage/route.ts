import { apiSession } from "../../../../lib/api-session";
import { authSettings } from "../../../../lib/auth";
import { db } from "../../../../lib/database";
import { checkGovernanceAccess } from "../../../../lib/governance-authorisation";
import { activateStorageConfiguration, saveStorageConfiguration, StorageConfigurationError, testStorageConfiguration } from "../../../../lib/storage-configuration";
import { validStorageConfigurationCsrf } from "../../../../lib/storage-configuration-security";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const allowedKeys = new Set(["action", "id", "label", "endpoint", "region", "bucket", "accessKeyId", "secretAccessKey", "forcePathStyle", "requestTimeoutMs"]);

export async function POST(request: Request) {
  const auth = authSettings();
  if (request.headers.get("origin") !== auth.baseUrl) return new Response(null, { status: 403, headers });
  const session = await apiSession();
  if (!session) return new Response(null, { status: 401, headers });
  if (!validStorageConfigurationCsrf(auth.secret, session.sessionToken, request.headers.get("x-samma-csrf"))) return new Response(null, { status: 403, headers });
  if (!await checkGovernanceAccess(db, session, ["platform.system.configure"], process.env.SAMMA_ENV !== "development" || process.env.SAMMA_GOVERNANCE_MFA_REQUIRED !== "false")) {
    return new Response(null, { status: 403, headers });
  }
  if (request.headers.get("content-type") !== "application/json") return new Response(null, { status: 415, headers });
  try {
    const text = await request.text();
    if (text.length > 8192) return new Response(null, { status: 413, headers });
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(key => !allowedKeys.has(key))) return new Response(null, { status: 400, headers });
    const body = data as Record<string, unknown>;
    if (body.action === "save") {
      if (typeof body.label !== "string" || typeof body.region !== "string" || typeof body.bucket !== "string" ||
          typeof body.accessKeyId !== "string" || typeof body.secretAccessKey !== "string" || typeof body.forcePathStyle !== "boolean" ||
          typeof body.requestTimeoutMs !== "number" || !(body.endpoint === undefined || typeof body.endpoint === "string")) return new Response(null, { status: 400, headers });
      const result = await saveStorageConfiguration(db, session.accountId, { label: body.label, endpoint: body.endpoint as string | undefined,
        region: body.region, bucket: body.bucket, accessKeyId: body.accessKeyId, secretAccessKey: body.secretAccessKey,
        forcePathStyle: body.forcePathStyle, requestTimeoutMs: body.requestTimeoutMs });
      return Response.json(result, { status: 201, headers });
    }
    if ((body.action === "test" || body.action === "activate") && typeof body.id === "string" && /^[0-9a-f-]{36}$/.test(body.id)) {
      if (body.action === "test") return Response.json(await testStorageConfiguration(db, session.accountId, body.id), { headers });
      await activateStorageConfiguration(db, session.accountId, body.id);
      return Response.json({ activated: true }, { headers });
    }
    return new Response(null, { status: 400, headers });
  } catch (error) {
    if (error instanceof SyntaxError) return new Response(null, { status: 400, headers });
    if (error instanceof StorageConfigurationError) {
      const status = error.code === "not_found" ? 404 : error.code === "migration_required" || error.code === "test_required" ? 409 : 422;
      return Response.json({ code: error.code }, { status, headers });
    }
    console.error("Storage configuration operation failed");
    return Response.json({ code: "unexpected" }, { status: 500, headers });
  }
}
