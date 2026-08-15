export const LEAD_DETAIL_SELECT =
  "*, leads_links(id, nome, slug, instancia_id), leads_jornada_etapas(id, nome, representa_venda, valor_venda), responsavel:usuarios!leads_cliques_responsavel_id_fkey(id, nome, email, foto_url)";
