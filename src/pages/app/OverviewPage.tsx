import { useEffect, useMemo, useState } from "react";
import { DollarSign } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { LeadsWhatsappFilter } from "@/components/leads/LeadsWhatsappFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import {
  type DatePreset,
  getDateRangeFromPreset,
  filterLeadsForDashboard,
  aggregateFunnel,
  leadsByDay,
  isMetaOrigin,
} from "@/lib/leadsAnalytics";
import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";

export function OverviewPage() {
  const { contaAtiva } = useConta();
  const [cliques, setCliques] = useState<LeadsClique[]>([]);
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DatePreset>("este_mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [instanciaId, setInstanciaId] = useState("all");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");

  useEffect(() => {
    if (!contaAtiva) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("leads_cliques")
        .select("*, leads_links(id, nome, slug, instancia_id), leads_jornada_etapas(id, nome, representa_venda)")
        .eq("conta_id", contaAtiva.id)
        .order("convertido_at", { ascending: false, nullsFirst: false })
        .limit(2000),
      supabase
        .from("leads_jornada_etapas")
        .select("*")
        .eq("conta_id", contaAtiva.id)
        .order("posicao"),
    ]).then(([cRes, eRes]) => {
      setCliques((cRes.data as LeadsClique[]) ?? []);
      setEtapas((eRes.data as LeadsJornadaEtapa[]) ?? []);
      setLoading(false);
    });
  }, [contaAtiva?.id]);

  const range = getDateRangeFromPreset(
    preset,
    preset === "personalizado" ? { from: customFrom, to: customTo } : undefined
  );

  const filtered = useMemo(
    () =>
      filterLeadsForDashboard(cliques, range, {
        instanciaId,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
      }),
    [cliques, range, instanciaId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm]
  );

  const funnel = useMemo(() => aggregateFunnel(filtered, etapas), [filtered, etapas]);
  const chartData = useMemo(() => leadsByDay(filtered), [filtered]);
  const metaCount = filtered.filter(isMetaOrigin).length;
  const outrosCount = filtered.length - metaCount;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Métricas de leads convertidos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Período</Label>
            <Select value={preset} onChange={(e) => setPreset(e.target.value as DatePreset)}>
              <option value="este_mes">Este mês</option>
              <option value="mes_passado">Mês passado</option>
              <option value="hoje">Hoje</option>
              <option value="ultimos_7">Últimos 7 dias</option>
              <option value="ultimos_30">Últimos 30 dias</option>
              <option value="todo">Todo o período</option>
              <option value="personalizado">Personalizado</option>
            </Select>
          </div>
          {preset === "personalizado" && (
            <>
              <div className="space-y-1">
                <Label>De</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Até</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <LeadsWhatsappFilter value={instanciaId} onChange={setInstanciaId} />
          </div>
          {(["Source", "Medium", "Campaign", "Content", "Term"] as const).map((label, i) => {
            const setters = [setUtmSource, setUtmMedium, setUtmCampaign, setUtmContent, setUtmTerm];
            const values = [utmSource, utmMedium, utmCampaign, utmContent, utmTerm];
            return (
              <div key={label} className="space-y-1">
                <Label>UTM {label}</Label>
                <Input value={values[i]} onChange={(e) => setters[i](e.target.value)} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-4xl font-bold text-primary">{filtered.length}</p>
          <p className="text-muted-foreground">Leads convertidos no período</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil por etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma etapa com leads no período</p>
            ) : (
              funnel.map((f) => (
                <div key={f.nome}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      {f.nome}
                      {f.representa_venda && <DollarSign className="h-3 w-3 text-success" />}
                    </span>
                    <span className="font-medium">{f.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${Math.max(5, (f.count / (funnel[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por origem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MetaOriginBadge /> Meta
              </span>
              <span className="font-medium">{metaCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Outros</span>
              <span className="font-medium">{outrosCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3F37FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
