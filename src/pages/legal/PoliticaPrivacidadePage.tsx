import { LegalDocument } from "@/components/legal/LegalDocument";
import { politicaPrivacidadeIntro, politicaPrivacidadeSections } from "@/content/politicaPrivacidadeSections";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function PoliticaPrivacidadePage() {
  useDocumentTitle("Política de Privacidade — Viziom");

  return (
    <LegalDocument
      title="Aviso de Privacidade"
      intro={politicaPrivacidadeIntro}
      sections={politicaPrivacidadeSections}
      crossLink={{ href: "/termos-de-uso", label: "Termos de Uso" }}
    />
  );
}
