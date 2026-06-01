import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Crown,
  MessageCircle,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";
import type { Plano } from "@/types/usuario";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PLANOS_LP_URL = "https://lp.viziom.ia.br/planos";
const PLANOS_DESTAQUE = new Set(["start", "pro"]);

const RECORRENCIA: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

interface PlanUsage {
  whatsapps: number;
  usuarios: number;
  leads: number;
}

function formatPreco(preco: number) {
  return Number(preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function formatLimite(max: number | null) {
  if (max == null) return "Ilimitado";
  return max.toLocaleString("pt-BR");
}

function PlanLimitBar({
  label,
  icon: Icon,
  used,
  max,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  used: number;
  max: number | null;
}) {
  const unlimited = max == null;
  const pct = unlimited ? 0 : max <= 0 ? 100 : Math.min(100, Math.round((used / max) * 100));
  const nearLimit = !unlimited && pct >= 85;
  const atLimit = !unlimited && pct >= 100;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              {unlimited ? "Sem limite definido" : `${pct}% do limite utilizado`}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{used.toLocaleString("pt-BR")}</span>
          {!unlimited && ` / ${max.toLocaleString("pt-BR")}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              atLimit ? "bg-destructive" : nearLimit ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plano,
  isCurrent,
}: {
  plano: Plano;
  isCurrent: boolean;
}) {
  const features = [
    { label: "WhatsApps", value: formatLimite(plano.max_whatsapps) },
    { label: "Usuários", value: formatLimite(plano.max_usuarios) },
    { label: "Leads", value: formatLimite(plano.max_leads) },
  ];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-5 transition-all",
        isCurrent
          ? "border-primary bg-gradient-to-b from-primary/[0.08] to-card shadow-[0_0_0_1px_rgba(63,55,255,0.15),0_12px_40px_-12px_rgba(63,55,255,0.35)]"
          : "border-border bg-card hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{plano.nome}</h3>
        {isCurrent && (
          <Badge variant="primary" className="shrink-0 gap-1 px-2.5">
            <Crown className="h-3 w-3" />
            Plano atual
          </Badge>
        )}
      </div>
      <div className="mb-4">
        {plano.descricao && (
          <p className="text-sm leading-relaxed text-muted-foreground">{plano.descricao}</p>
        )}
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            R$ {formatPreco(plano.preco)}
          </span>
          <span className="text-sm text-muted-foreground">
            /{RECORRENCIA[plano.recorrencia]?.toLowerCase() ?? plano.recorrencia}
          </span>
        </div>
      </div>

      <ul className="mt-auto space-y-2.5">
        {features.map(({ label, value }) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{value}</span> {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function BillingSettingsPage() {
  const { contaAtiva } = useConta();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [planosDisponiveis, setPlanosDisponiveis] = useState<Plano[]>([]);
  const [usage, setUsage] = useState<PlanUsage>({ whatsapps: 0, usuarios: 0, leads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contaAtiva) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const [planoRes, planosRes, waRes, membrosRes, leadsRes] = await Promise.all([
        contaAtiva.plano_id
          ? supabase.from("planos").select("*").eq("id", contaAtiva.plano_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("planos").select("*").eq("ativo", true).order("preco"),
        supabase
          .from("leads_instancias_whatsapp")
          .select("id", { count: "exact", head: true })
          .eq("conta_id", contaAtiva.id),
        supabase
          .from("conta_membros")
          .select("id", { count: "exact", head: true })
          .eq("conta_id", contaAtiva.id),
        supabase
          .from("leads_cliques")
          .select("id", { count: "exact", head: true })
          .eq("conta_id", contaAtiva.id)
          .eq("status", "convertido")
          .is("clique_principal_id", null),
      ]);

      if (cancelled) return;

      const planosFiltrados = ((planosRes.data as Plano[]) ?? []).filter((planoItem) =>
        PLANOS_DESTAQUE.has(planoItem.nome.trim().toLowerCase())
      );

      setPlano((planoRes.data as Plano) ?? null);
      setPlanosDisponiveis(planosFiltrados);
      setUsage({
        whatsapps: waRes.count ?? 0,
        usuarios: membrosRes.count ?? 0,
        leads: leadsRes.count ?? 0,
      });
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [contaAtiva]);

  if (!contaAtiva) return null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Plano e uso</CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                Acompanhe o consumo da sua conta e compare os planos disponíveis no Viziom.
              </CardDescription>
            </div>
            {!loading && plano && (
              <Badge variant="primary" className="gap-1.5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                {plano.nome}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-8 px-0 pb-0">
          {loading ? (
            <BillingSkeleton />
          ) : (
            <>
              {plano ? (
                <>
                  <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[#000415] via-[#1a1040] to-primary p-6 text-white sm:p-8">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
                    />

                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                          Plano contratado
                        </p>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                          {plano.nome}
                        </h2>
                        {plano.descricao && (
                          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
                            {plano.descricao}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-wide text-white/50">Investimento</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">
                          R$ {formatPreco(plano.preco)}
                        </p>
                        <p className="text-sm text-white/60">
                          {RECORRENCIA[plano.recorrencia] ?? plano.recorrencia}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Uso da conta</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <PlanLimitBar
                        label="WhatsApps conectados"
                        icon={MessageCircle}
                        used={usage.whatsapps}
                        max={plano.max_whatsapps}
                      />
                      <PlanLimitBar
                        label="Membros da equipe"
                        icon={Users}
                        used={usage.usuarios}
                        max={plano.max_usuarios}
                      />
                      <PlanLimitBar
                        label="Leads convertidos"
                        icon={Target}
                        used={usage.leads}
                        max={plano.max_leads}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Crown className="h-6 w-6" />
                  </div>
                  <p className="text-base font-medium text-foreground">Nenhum plano vinculado</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Esta conta ainda não possui um plano ativo. Confira as opções disponíveis ou
                    fale com o time Viziom.
                  </p>
                </div>
              )}

              {planosDisponiveis.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Planos disponíveis</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Compare limites e recursos de cada plano do Viziom.
                    </p>
                  </div>
                  <div
                    className={cn(
                      "grid gap-4",
                      planosDisponiveis.length === 1 && "max-w-sm",
                      planosDisponiveis.length === 2 && "md:grid-cols-2",
                      planosDisponiveis.length >= 3 && "md:grid-cols-2 xl:grid-cols-3"
                    )}
                  >
                    {planosDisponiveis.map((p) => (
                      <PlanCard key={p.id} plano={p} isCurrent={p.id === plano?.id} />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Quer fazer upgrade, comparar recursos em detalhe ou falar com vendas?
                </p>
                <Button asChild size="lg" className="mt-4 gap-2 px-8">
                  <a href={PLANOS_LP_URL} target="_blank" rel="noopener noreferrer">
                    Visualizar planos
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
