import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { SystemLog } from "@/types/usuario";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type LogRow = SystemLog & {
  usuarios: { email: string } | null;
  contas: { nome: string } | null;
};

export function SysLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("system_logs")
      .select("*, usuarios(email), contas(nome)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setLogs((data as LogRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Auditoria de ações administrativas e eventos críticos.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">O que registrar aqui</CardTitle>
          <CardDescription>
            Criação de contas, membros adicionados, alterações de plano, erros de API, login
            suspeito e ações de superadmin. Cada log guarda tipo, nível, mensagem, usuário,
            conta e detalhes em JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Conta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{log.tipo}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.tipo === "backend_erro"
                            ? "destructive"
                            : log.nivel === "erro"
                              ? "destructive"
                              : "default"
                        }
                      >
                        {log.nivel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.mensagem}</TableCell>
                    <TableCell className="text-sm">{log.usuarios?.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{log.contas?.nome ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
