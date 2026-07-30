/**
 * returnTo is attacker-influenceable (query string), so allow only same-app
 * absolute paths — reject "//host", "/\host" and scheme-bearing values to
 * prevent a post-login open redirect.
 */
export function safeReturnTo(raw: string | null | undefined): string {
  const candidate = raw || "/";
  return /^\/(?![/\\])/.test(candidate) ? candidate : "/";
}
