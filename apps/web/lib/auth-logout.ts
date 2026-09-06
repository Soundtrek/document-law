// Only trusted server configuration and the just-revoked session supply logout parameters.
export function providerLogoutUrl(settings: { issuer: string; clientId: string; baseUrl: string }, idToken?: string | null): string {
  const target = new URL(`${settings.issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`);
  target.searchParams.set("client_id", settings.clientId);
  target.searchParams.set("post_logout_redirect_uri", new URL("/", settings.baseUrl).href);
  // Older sessions have no hint; retain Keycloak's confirmation safeguard for those sessions.
  if (idToken) target.searchParams.set("id_token_hint", idToken);
  return target.href;
}
