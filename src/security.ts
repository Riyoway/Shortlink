import { createHash } from "node:crypto";
import { json } from "./http";
import { redis } from "./redis";
import type { VercelRequest, VercelResponse } from "./vercel";

interface RateLimitOptions {
  name: string;
  limit: number;
  windowSeconds: number;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function enforceRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  options: RateLimitOptions
): Promise<boolean> {
  const identifier = hashIdentifier(getClientIp(req));
  const windowId = Math.floor(Date.now() / 1000 / options.windowSeconds);
  const key = `shortlink:ratelimit:${options.name}:${identifier}:${windowId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, options.windowSeconds + 5);
  }

  const remaining = Math.max(options.limit - count, 0);
  res.setHeader("x-ratelimit-limit", String(options.limit));
  res.setHeader("x-ratelimit-remaining", String(remaining));
  res.setHeader("x-ratelimit-reset", String((windowId + 1) * options.windowSeconds));

  if (count > options.limit) {
    res.setHeader("retry-after", String(options.windowSeconds));
    json(res, 429, { error: "Too many requests. Try again later." });
    return false;
  }

  return true;
}

export function applySecurityHeaders(res: VercelResponse): void {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
}

export function enforceSameOrigin(req: VercelRequest, res: VercelResponse): boolean {
  if (!MUTATING_METHODS.has(req.method || "GET")) {
    return true;
  }

  const origin = req.headers.origin;
  if (!origin) {
    json(res, 403, { error: "Origin header is required." });
    return false;
  }

  const host = req.headers.host;
  if (!host) {
    json(res, 403, { error: "Host header is required." });
    return false;
  }

  try {
    if (new URL(origin).host !== host) {
      json(res, 403, { error: "Cross-origin requests are not allowed." });
      return false;
    }
  } catch {
    json(res, 403, { error: "Invalid origin." });
    return false;
  }

  return true;
}

function getClientIp(req: VercelRequest): string {
  const forwardedFor = firstHeader(req.headers["x-forwarded-for"]);
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return firstHeader(req.headers["x-real-ip"]) || "unknown";
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
