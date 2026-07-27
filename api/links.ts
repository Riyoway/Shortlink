import { requireAdmin } from "../src/auth";
import { createOrUpdateLink, listLinks } from "../src/links";
import { json, readJsonBody } from "../src/http";
import type { VercelRequest, VercelResponse } from "../src/vercel";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    return json(res, 200, { links: await listLinks() });
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const result = await createOrUpdateLink(body);

    if (!result.ok) {
      return json(res, result.status, { error: result.error });
    }

    return json(res, result.created ? 201 : 200, { link: result.link });
  }

  res.setHeader("allow", "GET, POST");
  return res.status(405).send("Method Not Allowed");
}
