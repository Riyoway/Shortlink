import { randomBytes } from "node:crypto";
import { fetchLinkMetadata, isPublicHttpUrl } from "./metadata";
import { redis } from "./redis";

export interface LinkRecord {
  slug: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  visits: number;
  title?: string;
  siteName?: string;
  faviconUrl?: string;
}

type LinkResult =
  | { ok: true; created: boolean; link: LinkRecord }
  | { ok: false; status: number; error: string };

const SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/;
const RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_SLUG_LENGTH = 6;
const SLUG_INDEX_KEY = "shortlink:slugs";

export async function listLinks(): Promise<LinkRecord[]> {
  const slugs = await redis.smembers<string[]>(SLUG_INDEX_KEY);
  if (slugs.length === 0) return [];

  const records = await Promise.all(slugs.map((slug) => getLink(slug)));
  return records
    .filter((record): record is LinkRecord => Boolean(record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLink(slug: string): Promise<LinkRecord | null> {
  return redis.get<LinkRecord>(linkKey(slug));
}

export async function createOrUpdateLink(body: unknown): Promise<LinkResult> {
  const { slug: requestedSlug, originalSlug, url } = parseLinkBody(body);
  const slug = requestedSlug || (await generateAvailableSlug());

  if (originalSlug && !isValidSlug(originalSlug)) {
    return {
      ok: false,
      status: 400,
      error: "Original slug is invalid."
    };
  }

  if (!isValidSlug(slug)) {
    return {
      ok: false,
      status: 400,
      error: "Slug must be 2-64 characters: letters, numbers, _, or -."
    };
  }

  if (!isValidDestination(url)) {
    return {
      ok: false,
      status: 400,
      error: "URL must be a public http:// or https:// URL."
    };
  }

  if (originalSlug && originalSlug !== slug && (await getLink(slug))) {
    return {
      ok: false,
      status: 409,
      error: "That custom slug is already in use."
    };
  }

  const existing = await getLink(originalSlug || slug);
  const now = new Date().toISOString();
  const metadata = await fetchLinkMetadata(url);
  const link: LinkRecord = {
    slug,
    url,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    visits: existing?.visits ?? 0,
    ...metadata
  };

  await redis.set(linkKey(slug), link);
  await redis.sadd(SLUG_INDEX_KEY, slug);
  if (originalSlug && originalSlug !== slug) {
    await deleteLink(originalSlug);
  }

  return { ok: true, created: !existing, link };
}

export async function deleteLink(slug: string): Promise<void> {
  await redis.del(linkKey(slug));
  await redis.srem(SLUG_INDEX_KEY, slug);
}

export async function incrementVisits(link: LinkRecord): Promise<void> {
  await redis.set(linkKey(link.slug), {
    ...link,
    visits: link.visits + 1
  });
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

async function generateAvailableSlug(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = randomSlug(DEFAULT_SLUG_LENGTH);
    if (!(await getLink(slug))) {
      return slug;
    }
  }

  return randomSlug(DEFAULT_SLUG_LENGTH + 2);
}

function randomSlug(length: number): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => RANDOM_ALPHABET[byte % RANDOM_ALPHABET.length]).join("");
}

function parseLinkBody(body: unknown): { slug: string; originalSlug: string; url: string } {
  if (!body || typeof body !== "object") {
    return { slug: "", originalSlug: "", url: "" };
  }

  const candidate = body as Record<string, unknown>;
  return {
    slug: typeof candidate.slug === "string" ? candidate.slug.trim() : "",
    originalSlug: typeof candidate.originalSlug === "string" ? candidate.originalSlug.trim() : "",
    url: typeof candidate.url === "string" ? candidate.url.trim() : ""
  };
}

function isValidDestination(value: string): boolean {
  try {
    const url = new URL(value);
    return isPublicHttpUrl(url);
  } catch {
    return false;
  }
}

function linkKey(slug: string): string {
  return `shortlink:link:${slug}`;
}
