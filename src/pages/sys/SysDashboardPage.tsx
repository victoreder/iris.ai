import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_COLORS = {
  Ativas: "#3F37FF",
  Suspensas: "#ef4444",
  Onboarding: "#f59e0b",
  Canceladas: "#94a3b8",
};

type ContaDash = Conta & { planos: Plano | null };

export function SysDashboardPage() {
  const [contas, setContas] = useState<ContaDash[]>([]);
  const [usuarios, setUsuarios] = useState(0);
  const [leads, setLeads] = useState(0);
  const [feedbackAberto, setFeedbackAberto] = useState(0);
  const [errosBackend, setErrosBackend] = useState(0);

  useEffect(() => {
    void Promise.all([
      supabase.from("contas").select("*, planos(nome, slug)"),
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
    ]).then(([c, u, l, f, e]) => {
      setContas((c.data as ContaDash[]) ?? []);
      setUsuarios(u.count ?? 0);
      setLeads(l.count ?? 0);
      setFeedbackAberto(f.count ?? 0);
      setErrosBackend(e.count ?? 0);
    });
  }, []);

  const metrics = useMemo(() => {
    const ativas = contas.filter((c) => c.status === "ativa" && !c.onboarding_pendente).length;
    const onboarding = contas.filter((c) => c.onboarding_pendente).length;
    const suspensas = contas.filter((c) => c.status === "suspensa" && !c.onboarding_pendente).length;
    const canceladas = contas.filter((c) => c.status === "cancelada").length;
    const vencendoEm7 = contas.filter((c) => {
      if (!c.data_vencimento || c.status !== "ativa") return false;
      const diff = new Date(c.data_vencimento).getTime() - Date.now();
      return diff >= 0 && diff <= 7 * 86400000;
    }).length;
    return { ativas, suspensas, onboarding, canceladas, vencendoEm7, total: contas.length };
  }, [contas]);

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
    for (const c of contas) {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, total]) => ({ mes, total }));
  }, [contas]);

  const porPlano = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contas) {
      if (c.onboarding_pendente) continue;
      const nome = c.planos?.nome ?? "Sem plano";
      map.set(nome, (map.get(nome) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([plano, total]) => ({ plano, total }));
  }, [contas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Métricas globais do Viziom.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Contas ativas", value: metrics.ativas },
          { label: "Suspensas", value: metrics.suspensas },
          { label: "Vence em 7 dias", value: metrics.vencendoEm7 },
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
                  <YAxis type="category" dataKey="plano" width={80} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3F37FF" radius={[0, 4, 4, 0]} />
                </BarChart>
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
    </div>
  );
}
