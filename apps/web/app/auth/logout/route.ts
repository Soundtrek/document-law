import { authSettings } from "../../../lib/auth";

// Legacy callback/bookmarks must not initiate provider logout through an unprotected GET.
export async function GET() {
  return new Response(null, { status: 303, headers: {
    Location: new URL("/", authSettings().baseUrl).href,
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
  } });
}
