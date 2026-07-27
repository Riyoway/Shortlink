import { isIP } from "node:net";

export interface LinkMetadata {
  title: string;
  siteName: string;
  faviconUrl: string;
}

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

export async function fetchLinkMetadata(value: string): Promise<LinkMetadata> {
  const url = new URL(value);
  const siteName = normalizeHost(url.hostname);
  const fallback = createFallbackMetadata(url, siteName);

  if (!isPublicHttpUrl(url)) {
    return fallback;
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "ShortlinkBot/1.0"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(3000)
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
      return fallback;
    }

    const html = (await response.text()).slice(0, 100_000);
    return {
      title: extractTitle(html) || fallback.title,
      siteName: extractMetaContent(html, "og:site_name") || siteName,
      faviconUrl: resolveFavicon(html, url) || fallback.faviconUrl
    };
  } catch {
    return fallback;
  }
}

export function isPublicHttpUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (hostname === "metadata.google.internal") return false;

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    return !PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(hostname));
  }

  if (ipVersion === 6) {
    return !["::1", "::", "fe80"].some((prefix) => hostname.startsWith(prefix));
  }

  return true;
}

function createFallbackMetadata(url: URL, siteName: string): LinkMetadata {
  return {
    title: siteName,
    siteName,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`
  };
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

function extractTitle(html: string): string {
  return (
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
  ).trim();
}

function extractMetaContent(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return decodeHtml(match?.[1] || match?.[2] || "").trim();
}

function resolveFavicon(html: string, url: URL): string {
  const match = html.match(/<link[^>]+rel=["'][^"']*(?:icon|shortcut icon|apple-touch-icon)[^"']*["'][^>]*>/i);
  const href = match?.[0].match(/href=["']([^"']+)["']/i)?.[1];
  if (!href) return "";

  try {
    return new URL(decodeHtml(href), url.origin).toString();
  } catch {
    return "";
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}
