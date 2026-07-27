import { clearSessionCookie, createSessionCookie, validateAdminCredentials } from "../src/session";
import { json, readJsonBody } from "../src/http";
import type { VercelRequest, VercelResponse } from "../src/vercel";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const { username, password } = parseLoginBody(body);

    if (!validateAdminCredentials(username, password)) {
      return json(res, 401, { error: "Invalid username or password." });
    }

    res.setHeader("set-cookie", createSessionCookie(username));
    return json(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    res.setHeader("set-cookie", clearSessionCookie());
    return json(res, 200, { ok: true });
  }

  res.setHeader("allow", "POST, DELETE");
  return res.status(405).send("Method Not Allowed");
}

function parseLoginBody(body: unknown): { username: string; password: string } {
  if (!body || typeof body !== "object") {
    return { username: "", password: "" };
  }

  const candidate = body as Record<string, unknown>;
  return {
    username: typeof candidate.username === "string" ? candidate.username : "",
    password: typeof candidate.password === "string" ? candidate.password : ""
  };
}
