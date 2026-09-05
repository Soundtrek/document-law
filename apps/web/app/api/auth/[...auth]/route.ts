import { handleAuthentication } from "../../../../lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleAuthentication;
export const POST = handleAuthentication;
