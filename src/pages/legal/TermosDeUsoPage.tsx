import { LegalDocument } from "@/components/legal/LegalDocument";
import { termosDeUsoIntro, termosDeUsoSections } from "@/content/termosDeUsoSections";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function TermosDeUsoPage() {
  useDocumentTitle("Termos de Uso — Viziom");

  return (
    <LegalDocument
      title="Termos e Condições Gerais de Uso"
      intro={termosDeUsoIntro}
      sections={termosDeUsoSections}
      crossLink={{ href: "/politica-de-privacidade", label: "Política de Privacidade" }}
    />
  );
}
