/**
 * Accept common X / Twitter status URLs and bare status IDs.
 * Examples:
 *  - https://x.com/user/status/123
 *  - https://twitter.com/user/status/123?s=20
 *  - https://mobile.twitter.com/user/status/123
 *  - https://x.com/i/web/status/123
 *  - 1234567890123456789  (bare snowflake id)
 */
export function parseXStatusUrl(input: string): {
  url: string;
  statusId: string;
  handle?: string;
} | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare numeric status id
  if (/^\d{5,25}$/.test(raw)) {
    return {
      url: `https://x.com/i/web/status/${raw}`,
      statusId: raw,
    };
  }

  let url: URL;
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    url = new URL(withProto);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isX =
    host === "x.com" ||
    host === "twitter.com" ||
    host === "mobile.twitter.com" ||
    host === "mobile.x.com" ||
    host.endsWith(".x.com") ||
    host.endsWith(".twitter.com");

  if (!isX) return null;

  // /user/status/ID or /i/web/status/ID or /i/status/ID
  const path = url.pathname;
  const m =
    path.match(/\/status(?:es)?\/(\d{5,25})/i) ||
    path.match(/\/i\/web\/status\/(\d{5,25})/i);

  if (!m?.[1]) return null;

  const statusId = m[1];
  const handleMatch = path.match(/^\/([A-Za-z0-9_]{1,15})\/status/i);
  const handle =
    handleMatch &&
    handleMatch[1] &&
    !["i", "intent", "share", "home"].includes(handleMatch[1].toLowerCase())
      ? handleMatch[1]
      : undefined;

  const clean = handle
    ? `https://x.com/${handle}/status/${statusId}`
    : `https://x.com/i/web/status/${statusId}`;

  return { url: clean, statusId, handle };
}

export function looksLikeXUrl(input: string): boolean {
  return parseXStatusUrl(input) !== null;
}
