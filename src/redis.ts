import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: requiredEnv("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"),
  token: requiredEnv("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN")
});

function requiredEnv(primary: string, fallback: string): string {
  const value = process.env[primary] || process.env[fallback];
  if (!value) {
    throw new Error(`Missing ${primary} or ${fallback}.`);
  }

  return value;
}
