import {
  attributionFromRequest,
  registrarCliqueCore,
} from "../_lib/registrarCliqueCore.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const slug = req.query.slug ?? req.query.s;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const landingFromQuery = req.query.landing_url;
    const attribution = attributionFromRequest(req, {
      landingUrl:
        landingFromQuery != null
          ? String(landingFromQuery)
          : host && slug
            ? `${proto}://${host}/l/${encodeURIComponent(String(slug))}${req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`
            : null,
    });

    const result = await registrarCliqueCore(slug, attribution);

    if (!result.ok) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(result.status).send(
        `<!doctype html><html lang="pt-BR"><body style="font-family:system-ui;padding:24px;text-align:center"><p>${result.error}</p></body></html>`
      );
    }

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, result.waUrl);
  } catch (err) {
    console.error("redirecionar:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
