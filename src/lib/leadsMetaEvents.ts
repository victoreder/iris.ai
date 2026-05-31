export const LEADS_META_EVENTOS = [
  "Lead",
  "Purchase",
  "Contact",
  "CompleteRegistration",
  "Subscribe",
  "InitiateCheckout",
  "AddToCart",
  "ViewContent",
  "Schedule",
  "SubmitApplication",
] as const;

export type LeadsMetaEvento = (typeof LEADS_META_EVENTOS)[number];
