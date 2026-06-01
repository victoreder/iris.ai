import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import type { Conta } from "@/types/database";
import type { Plano } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  Ativas: "#3F37FF",
  Suspensas: "#ef4444",
  Onboarding: "#f59e0b",
  Canceladas: "#94a3b8",
};

type ContaDash = Conta & { planos: Plano | null };
type ContaMetrica = {
  contaId: string;
  nome: string;
  plano: string;
  status: Conta["status"];
  onboardingPendente: boolean;
  dataVencimento: string | null;
  usuarios: number;
  conexoes: number;
  leadsConvertidos: number;
  limiteUsuarios: number | null;
  limiteConexoes: number | null;
  limiteLeads: number | null;
};

type PeriodoFiltro = "7d" | "30d" | "90d";
type StatusFiltro = "todos" | "ativa" | "suspensa" | "cancelada" | "onboarding";

function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasEntre(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function SysDashboardPage() {
  const [contas, setContas] = useState<ContaDash[]>([]);
  const [usuariosPorConta, setUsuariosPorConta] = useState<Record<string, number>>({});
  const [conexoesPorConta, setConexoesPorConta] = useState<Record<string, number>>({});
  const [leadsConvPorConta, setLeadsConvPorConta] = useState<Record<string, number>>({});
  const [renovacoesPorDia, setRenovacoesPorDia] = useState<Record<string, number>>({});
  const [cancelamentosPorDia, setCancelamentosPorDia] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState(0);
  const [leads, setLeads] = useState(0);
  const [feedbackAberto, setFeedbackAberto] = useState(0);
  const [errosBackend, setErrosBackend] = useState(0);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30d");
  const [planoFiltro, setPlanoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [focoRisco, setFocoRisco] = useState<"todos" | "vencimento" | "limite" | "inativa">("todos");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const inicio90Dias = new Date(Date.now() - 90 * 86400000).toISOString();
      const [c, u, l, f, e, membros, conexoes, leadsConv, logsPag, logsCancel] = await Promise.all([
        supabase.from("contas").select("*, planos(*)"),
        supabase.from("usuarios").select("id", { count: "exact", head: true }),
        supabase.from("leads_cliques").select("id", { count: "exact", head: true }),
        supabase
          .from("feedback")
          .select("id", { count: "exact", head: true })
          .in("status", ["aberto", "em_analise"]),
        supabase
          .from("system_logs")
          .select("id", { count: "exact", head: true })
          .eq("tipo", "backend_erro")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("conta_membros").select("conta_id"),
        supabase.from("leads_instancias_whatsapp").select("conta_id"),
        supabase
          .from("leads_cliques")
          .select("conta_id")
          .eq("status", "convertido")
          .is("clique_principal_id", null),
        supabase
          .from("system_logs")
          .select("created_at")
          .eq("tipo", "pagamento_registrado")
          .gte("created_at", inicio90Dias),
        supabase
          .from("system_logs")
          .select("created_at")
          .eq("tipo", "conta_status_alterado")
          .gte("created_at", inicio90Dias),
      ]);

      setContas((c.data as ContaDash[]) ?? []);
      setUsuarios(u.count ?? 0);
      setLeads(l.count ?? 0);
      setFeedbackAberto(f.count ?? 0);
      setErrosBackend(e.count ?? 0);

      const contaUsuariosMap: Record<string, number> = {};
      for (const row of membros.data ?? []) {
        contaUsuariosMap[row.conta_id] = (contaUsuariosMap[row.conta_id] ?? 0) + 1;
      }
      setUsuariosPorConta(contaUsuariosMap);

      const contaConexoesMap: Record<string, number> = {};
      for (const row of conexoes.data ?? []) {
        contaConexoesMap[row.conta_id] = (contaConexoesMap[row.conta_id] ?? 0) + 1;
      }
      setConexoesPorConta(contaConexoesMap);

      const contaLeadsMap: Record<string, number> = {};
      for (const row of leadsConv.data ?? []) {
        contaLeadsMap[row.conta_id] = (contaLeadsMap[row.conta_id] ?? 0) + 1;
      }
      setLeadsConvPorConta(contaLeadsMap);

      const pagamentosMap: Record<string, number> = {};
      for (const row of logsPag.data ?? []) {
        const dia = new Date(row.created_at).toISOString().slice(0, 10);
        pagamentosMap[dia] = (pagamentosMap[dia] ?? 0) + 1;
      }
      setRenovacoesPorDia(pagamentosMap);

      const cancelMap: Record<string, number> = {};
      for (const row of logsCancel.data ?? []) {
        const dia = new Date(row.created_at).toISOString().slice(0, 10);
        cancelMap[dia] = (cancelMap[dia] ?? 0) + 1;
      }
      setCancelamentosPorDia(cancelMap);
      setLoading(false);
    }

    void loadDashboard();
  }, []);

  const planosDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          contas
            .map((c) => c.planos?.nome)
            .filter((nome): nome is string => Boolean(nome))
        )
      ),
    [contas]
  );

  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => {
      if (planoFiltro !== "todos" && (c.planos?.nome ?? "Sem plano") !== planoFiltro) return false;
      if (statusFiltro === "onboarding" && !c.onboarding_pendente) return false;
      if (statusFiltro !== "todos" && statusFiltro !== "onboarding" && c.status !== statusFiltro) return false;
      if (statusFiltro !== "onboarding" && c.onboarding_pendente && statusFiltro !== "todos") return false;
      return true;
    });
  }, [contas, planoFiltro, statusFiltro]);

  const diasPeriodo = periodo === "7d" ? 7 : periodo === "30d" ? 30 : 90;
  const inicioPeriodoMs = Date.now() - diasPeriodo * 86400000;

  const contasComMetricas = useMemo<ContaMetrica[]>(() => {
    return contasFiltradas.map((c) => ({
      contaId: c.id,
      nome: c.onboarding_pendente ? "Onboarding pendente" : c.nome,
      plano: c.planos?.nome ?? "Sem plano",
      status: c.status,
      onboardingPendente: c.onboarding_pendente,
      dataVencimento: c.data_vencimento,
      usuarios: usuariosPorConta[c.id] ?? 0,
      conexoes: conexoesPorConta[c.id] ?? 0,
      leadsConvertidos: leadsConvPorConta[c.id] ?? 0,
      limiteUsuarios: c.planos?.max_usuarios ?? null,
      limiteConexoes: c.planos?.max_whatsapps ?? null,
      limiteLeads: c.planos?.max_leads ?? null,
    }));
  }, [contasFiltradas, usuariosPorConta, conexoesPorConta, leadsConvPorConta]);

  const metrics = useMemo(() => {
    const ativas = contasComMetricas.filter((c) => c.status === "ativa" && !c.onboardingPendente).length;
    const onboarding = contasComMetricas.filter((c) => c.onboardingPendente).length;
    const suspensas = contasComMetricas.filter((c) => c.status === "suspensa" && !c.onboardingPendente).length;
    const canceladas = contasComMetricas.filter((c) => c.status === "cancelada").length;
    const vencendoEm7 = contasComMetricas.filter((c) => {
      if (!c.dataVencimento || c.status !== "ativa" || c.onboardingPendente) return false;
      const diff = new Date(c.dataVencimento).getTime() - Date.now();
      return diff >= 0 && diff <= 7 * 86400000;
    }).length;
    const mrr = contasFiltradas
      .filter((c) => c.status === "ativa" && !c.onboarding_pendente)
      .reduce((acc, c) => acc + Number(c.planos?.preco ?? 0), 0);

    const renovacoesPeriodo = Object.entries(renovacoesPorDia)
      .filter(([dia]) => new Date(dia).getTime() >= inicioPeriodoMs)
      .reduce((acc, [, total]) => acc + total, 0);
    const cancelamentosPeriodo = Object.entries(cancelamentosPorDia)
      .filter(([dia]) => new Date(dia).getTime() >= inicioPeriodoMs)
      .reduce((acc, [, total]) => acc + total, 0);

    const baseRenovavel = contasComMetricas.filter((c) => {
      if (!c.dataVencimento || c.onboardingPendente || c.status === "cancelada") return false;
      const d = new Date(c.dataVencimento).getTime();
      return d >= inicioPeriodoMs && d <= Date.now();
    }).length;
    const taxaRenovacao = baseRenovavel > 0 ? Math.round((renovacoesPeriodo / baseRenovavel) * 100) : 0;

    return {
      ativas,
      suspensas,
      onboarding,
      canceladas,
      vencendoEm7,
      total: contasComMetricas.length,
      mrr,
      renovacoesPeriodo,
      cancelamentosPeriodo,
      taxaRenovacao,
    };
  }, [cancelamentosPorDia, contasComMetricas, contasFiltradas, inicioPeriodoMs, renovacoesPorDia]);

  const pieData = useMemo(
    () =>
      [
        { name: "Ativas", value: metrics.ativas },
        { name: "Suspensas", value: metrics.suspensas },
        { name: "Onboarding", value: metrics.onboarding },
        { name: "Canceladas", value: metrics.canceladas },
      ].filter((d) => d.value > 0),
    [metrics]
  );

  const barMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contasFiltradas) {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, total]) => ({ mes, total }));
  }, [contasFiltradas]);

  const porPlano = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contasFiltradas) {
      if (c.onboarding_pendente) continue;
      const nome = c.planos?.nome ?? "Sem plano";
      map.set(nome, (map.get(nome) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([plano, total]) => ({ plano, total }));
  }, [contasFiltradas]);

  const serieOperacional = useMemo(() => {
    const dias: { dia: string; renovacoes: number; cancelamentos: number }[] = [];
    for (let i = diasPeriodo - 1; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dias.push({
        dia: date.slice(5),
        renovacoes: renovacoesPorDia[date] ?? 0,
        cancelamentos: cancelamentosPorDia[date] ?? 0,
      });
    }
    return dias;
  }, [cancelamentosPorDia, diasPeriodo, renovacoesPorDia]);

  const funilAtivacao = useMemo(() => {
    const criadas = contasFiltradas.length;
    const onboardingConcluido = contasFiltradas.filter((c) => !c.onboarding_pendente).length;
    const comConexao = contasFiltradas.filter((c) => (conexoesPorConta[c.id] ?? 0) > 0).length;
    const comLeadConvertido = contasFiltradas.filter((c) => (leadsConvPorConta[c.id] ?? 0) > 0).length;
    return [
      { value: criadas, name: "Criadas" },
      { value: onboardingConcluido, name: "Onboarding" },
      { value: comConexao, name: "Com conexão" },
      { value: comLeadConvertido, name: "Com lead convertido" },
    ];
  }, [contasFiltradas, conexoesPorConta, leadsConvPorConta]);

  const contasEmRisco = useMemo(() => {
    const risco = contasComMetricas
      .filter((c) => !c.onboardingPendente && c.status !== "cancelada")
      .map((c) => {
        const dias = diasEntre(c.dataVencimento);
        const pertoVencimento = dias != null && dias >= 0 && dias <= 7;
        const semConexao = c.conexoes === 0;
        const limiteUsuarios = c.limiteUsuarios ? c.usuarios / c.limiteUsuarios >= 0.8 : false;
        const limiteConexoes = c.limiteConexoes ? c.conexoes / c.limiteConexoes >= 0.8 : false;
        const limiteLeads = c.limiteLeads ? c.leadsConvertidos / c.limiteLeads >= 0.8 : false;
        const pertoLimite = limiteUsuarios || limiteConexoes || limiteLeads;
        const riscoTipo = pertoVencimento ? "vencimento" : pertoLimite ? "limite" : semConexao ? "inativa" : "todos";
        return {
          ...c,
          diasVencimento: dias,
          pertoVencimento,
          pertoLimite,
          semConexao,
          riscoTipo,
        };
      })
      .filter((c) => c.pertoVencimento || c.pertoLimite || c.semConexao);

    if (focoRisco === "todos") return risco.slice(0, 8);
    return risco.filter((c) => c.riscoTipo === focoRisco).slice(0, 8);
  }, [contasComMetricas, focoRisco]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select id="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano">Plano</Label>
              <Select id="plano" value={planoFiltro} onChange={(e) => setPlanoFiltro(e.target.value)}>
                <option value="todos">Todos</option>
                {planosDisponiveis.map((plano) => (
                  <option key={plano} value={plano}>
                    {plano}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}>
                <option value="todos">Todos</option>
                <option value="ativa">Ativas</option>
                <option value="suspensa">Suspensas</option>
                <option value="cancelada">Canceladas</option>
                <option value="onboarding">Onboarding</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Carregando dashboard…</CardContent>
        </Card>
      ) : (
        <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "MRR estimado", value: formatBRL(metrics.mrr) },
          { label: "Contas ativas", value: metrics.ativas },
          { label: "Suspensas", value: metrics.suspensas },
          { label: "Vence em 7 dias", value: metrics.vencendoEm7 },
          { label: "Renovações no período", value: metrics.renovacoesPeriodo },
          { label: "Taxa de renovação", value: `${metrics.taxaRenovacao}%` },
          { label: "Cancelamentos no período", value: metrics.cancelamentosPeriodo },
          { label: "Usuários", value: usuarios },
          { label: "Leads totais", value: leads },
          { label: "Em onboarding", value: metrics.onboarding },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência operacional</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieOperacional}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="renovacoes" stroke="#3F37FF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelamentos" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das contas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas por plano</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porPlano.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porPlano} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="plano" width={120} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3F37FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de ativação</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funilAtivacao} isAnimationActive>
                  {funilAtivacao.map((entry, index) => (
                    <Cell key={entry.name} fill={["#3F37FF", "#5b55ff", "#7b76ff", "#a7a4ff"][index]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita estimada por mês (6 últimos)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {barMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={barMes.map((p) => ({ ...p, receita: p.total * (metrics.mrr / Math.max(metrics.ativas, 1)) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="receita" stroke="#3F37FF" fill="#3F37FF33" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Novas contas por mês</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {barMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3F37FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Contas em risco</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "todos", label: "Todas" },
                { id: "vencimento", label: "Vencimento" },
                { id: "limite", label: "Perto do limite" },
                { id: "inativa", label: "Sem conexão" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFocoRisco(item.id as typeof focoRisco)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    focoRisco === item.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {contasEmRisco.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta em risco no filtro atual.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Sinal de risco</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasEmRisco.map((conta) => (
                    <TableRow key={conta.contaId}>
                      <TableCell className="font-medium">{conta.nome}</TableCell>
                      <TableCell>{conta.plano}</TableCell>
                      <TableCell>
                        {conta.pertoVencimento && (
                          <Badge variant="warning" className="mr-1">
                            Vence em {conta.diasVencimento} dia(s)
                          </Badge>
                        )}
                        {conta.pertoLimite && <Badge variant="destructive">Limite alto (&gt;=80%)</Badge>}
                        {!conta.pertoVencimento && !conta.pertoLimite && conta.semConexao && (
                          <Badge>Sem conexão ativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/admin/contas">Ver conta</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {(feedbackAberto > 0 || errosBackend > 0) && (
        <Card>
          <CardContent className="space-y-1 py-4 text-sm">
            {feedbackAberto > 0 && (
              <p>
                <strong>{feedbackAberto}</strong> feedback(s) aguardando análise.
              </p>
            )}
            {errosBackend > 0 && (
              <p className="text-red-700">
                <strong>{errosBackend}</strong> erro(s) de backend nos últimos 7 dias — veja Logs.
              </p>
            )}
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
