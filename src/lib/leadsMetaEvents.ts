/** Valor salvo no banco quando a etapa não dispara evento Meta. */
export const META_EVENTO_NENHUM = "";

export const LEADS_META_EVENTOS_OPTIONS = [
  { value: META_EVENTO_NENHUM, label: "Não enviar nenhum evento" },
  { value: "Lead", label: "Lead (interesse)" },
  { value: "Purchase", label: "Compra" },
  { value: "Contact", label: "Contato" },
  { value: "CompleteRegistration", label: "Cadastro concluído" },
  { value: "Subscribe", label: "Assinatura" },
  { value: "InitiateCheckout", label: "Início de checkout" },
  { value: "AddToCart", label: "Adicionar ao carrinho" },
  { value: "ViewContent", label: "Visualização de conteúdo" },
  { value: "Schedule", label: "Agendamento" },
  { value: "SubmitApplication", label: "Candidatura enviada" },
] as const;

export type LeadsMetaEvento = (typeof LEADS_META_EVENTOS_OPTIONS)[number]["value"];

export function getMetaEventoLabel(eventoMeta: string | null | undefined): string {
  const trimmed = eventoMeta?.trim() ?? "";
  if (!trimmed) return "Não enviar nenhum evento";
  return LEADS_META_EVENTOS_OPTIONS.find((o) => o.value === trimmed)?.label ?? trimmed;
}

export function shouldSendMetaEvent(eventoMeta: string | null | undefined): boolean {
  return Boolean(eventoMeta?.trim());
}
