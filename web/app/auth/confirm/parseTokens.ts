/**
 * Parse Supabase auth tokens from a URL hash fragment.
 *
 * Supabase sends users back to the confirmation URL with tokens in the hash
 * (e.g. `#access_token=…&refresh_token=…&type=signup`). This helper extracts
 * the two tokens we need to hand off to the Mogster app.
 *
 * Returns `null` if the hash is empty, malformed, or missing either token.
 * `URLSearchParams.get()` URL-decodes values automatically.
 */
export function parseTokensFromHash(
  hash: string,
): { accessToken: string; refreshToken: string } | null {
  if (!hash || !hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
