import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { startImpersonate } from "@/lib/impersonate";
import { supabase } from "@/lib/supabase";
import type { Usuario } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type UsuarioRow = Usuario & {
  conta_membros: { conta_id: string; papel: string; contas: { nome: string } | null }[];
};

export function SysUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    const [usuariosRes, membrosRes] = await Promise.all([
      supabase.from("usuarios").select("*").order("created_at", { ascending: false }),
      supabase
        .from("conta_membros")
        .select("user_id, conta_id, papel, contas(nome)"),
    ]);

    if (usuariosRes.error) toast.error(usuariosRes.error.message);
    if (membrosRes.error) toast.error(membrosRes.error.message);

    const membrosByUser = new Map<string, UsuarioRow["conta_membros"]>();
    for (const m of membrosRes.data ?? []) {
      const row = m as {
        user_id: string;
        conta_id: string;
        papel: string;
        contas: { nome: string } | null;
      };
      const list = membrosByUser.get(row.user_id) ?? [];
      list.push({
        conta_id: row.conta_id,
        papel: row.papel,
        contas: row.contas,
      });
      membrosByUser.set(row.user_id, list);
    }

    setUsuarios(
      ((usuariosRes.data as Usuario[]) ?? []).map((u) => ({
        ...u,
        conta_membros: membrosByUser.get(u.id) ?? [],
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtrados = usuarios.filter((u) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.nome ?? "").toLowerCase().includes(q)
    );
  });

  const handleImpersonate = async (u: UsuarioRow) => {
    if (u.superadmin) {
      toast.error("Não é possível impersonar superadmin.");
      return;
    }
    try {
      await startImpersonate(u.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao impersonar.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">Todos os usuários provisionados no Viziom.</p>
      </div>

      <Input
        placeholder="Buscar por e-mail ou nome…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Contas</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome ?? "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {u.conta_membros?.length
                        ? u.conta_membros
                            .map((m) => m.contas?.nome ?? "—")
                            .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {u.superadmin ? (
                        <Badge variant="primary">Superadmin</Badge>
                      ) : (
                        <Badge variant="default">Usuário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!u.superadmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Entrar como este usuário"
                          onClick={() => void handleImpersonate(u)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
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
