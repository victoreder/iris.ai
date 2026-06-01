import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EMPRESA_LEGAL } from "@/config/empresaLegal";
import { cn } from "@/lib/utils";

export type LegalSectionDef = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  intro: ReactNode;
  sections: LegalSectionDef[];
  crossLink?: { href: string; label: string };
};

export function LegalDocument({ title, intro, sections, crossLink }: LegalDocumentProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveId(section.id);
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
      <aside className="mb-8 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neste documento</p>
        <nav className="space-y-1 text-sm">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "block rounded-md px-2 py-1.5 transition-colors",
                activeId === s.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {s.title}
            </a>
          ))}
        </nav>
        {crossLink && (
          <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
            Consulte também{" "}
            <Link to={crossLink.href} className="font-medium text-primary hover:underline">
              {crossLink.label}
            </Link>
            .
          </p>
        )}
      </aside>

      <article className="min-w-0">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{EMPRESA_LEGAL.razaoSocial}</span> — CNPJ{" "}
              {EMPRESA_LEGAL.cnpj}
            </p>
            <p>Data de disponibilização: {EMPRESA_LEGAL.dataDisponibilizacao}</p>
            <p>Última atualização: {EMPRESA_LEGAL.ultimaAtualizacao}</p>
          </div>
          <div className="mt-6 text-base leading-relaxed text-muted-foreground">{intro}</div>
        </header>

        <div className="space-y-12">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                {index + 1}. {section.title}
              </h2>
              <div>{section.content}</div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
