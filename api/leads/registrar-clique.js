import {
  attributionFromRequest,
  registrarCliqueCore,
} from "../_lib/registrarCliqueCore.js";
import { sendMetaConversionEvent } from "../_lib/metaConversions.js";
import { getSupabase } from "../_lib.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = req.body || {};
    const attribution = attributionFromRequest(req, {
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      utmTerm: body.utmTerm,
      fbclid: body.fbclid,
      gclid: body.gclid,
      ttclid: body.ttclid,
      referrer: body.referrer,
      landingUrl: body.landingUrl,
      userAgent: body.userAgent,
      fbp: body.fbp,
      fbc: body.fbc,
    });

    const result = await registrarCliqueCore(body.slug, attribution);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    if (body.metaPageView === true) {
      const supabase = getSupabase();
      const { data: clique } = await supabase
        .from("leads_cliques")
        .select("*")
        .eq("id", result.trackingId)
        .maybeSingle();
      const { data: link } = clique?.link_id
        ? await supabase.from("leads_links").select("*").eq("id", clique.link_id).maybeSingle()
        : { data: null };

      if (clique) {
        void sendMetaConversionEvent({
          clique,
          link,
          eventName: "PageView",
          eventId: `pageview_${result.trackingId}`,
          supabase,
        });
      }
    }

    return res.status(200).json({
      success: true,
      trackingId: result.trackingId,
      waUrl: result.waUrl,
    });
  } catch (err) {
    console.error("registrar-clique:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
