export const ONBOARDING_TAMANHO_OPCOES = [
  "Até 3 funcionários",
  "4 a 5",
  "5 a 10",
  "Acima de 10 funcionários",
] as const;

export const ONBOARDING_COMO_CONHECEU_OPCOES = [
  { value: "anuncios", label: "Anúncios" },
  { value: "instagram", label: "Perfil do Instagram" },
  { value: "google", label: "Pesquisando no google" },
  { value: "parceiros", label: "Parceiros" },
  { value: "indicacao", label: "Indicação de alguém" },
] as const;

export type OnboardingComoConheceu = (typeof ONBOARDING_COMO_CONHECEU_OPCOES)[number]["value"];

const PARCEIRO_PREFIX = "parceiros:";

export function isNomeEmpresaPlaceholder(nome: string | null | undefined): boolean {
  const n = (nome ?? "").trim().toLowerCase();
  return !n || n === "pendente" || n === "onboarding pendente";
}

export function formatComoConheceu(valor: OnboardingComoConheceu, nomeParceiro?: string): string {
  if (valor === "parceiros") {
    const nome = nomeParceiro?.trim();
    return nome ? `${PARCEIRO_PREFIX}${nome}` : "parceiros";
  }
  return valor;
}

export function parseComoConheceu(stored: string | null | undefined): {
  valor: OnboardingComoConheceu | "";
  nomeParceiro: string;
} {
  const raw = (stored ?? "").trim();
  if (!raw) return { valor: "", nomeParceiro: "" };
  if (raw.startsWith(PARCEIRO_PREFIX)) {
    return { valor: "parceiros", nomeParceiro: raw.slice(PARCEIRO_PREFIX.length) };
  }
  const known = ONBOARDING_COMO_CONHECEU_OPCOES.find((o) => o.value === raw);
  if (known) return { valor: known.value, nomeParceiro: "" };
  return { valor: "", nomeParceiro: "" };
}
