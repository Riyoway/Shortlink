import type { VercelRequest, VercelResponse } from "./vercel";

export function json(res: VercelResponse, status: number, payload: unknown) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.status(status).send(JSON.stringify(payload));
}

export async function readJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}
