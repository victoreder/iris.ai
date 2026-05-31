import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { ContaMembro, ContaPapel } from "@/types/database";
import type { Usuario } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MembroRow = ContaMembro & { usuarios: Usuario | null };

export function TeamSettingsPage() {
  const { contaAtiva, isAdmin } = useConta();
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<ContaPapel>("membro");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadMembros = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conta_membros")
      .select("*, usuarios(*)")
      .eq("conta_id", contaAtiva.id)
      .order("created_at");

    if (error) toast.error(error.message);
    setMembros((data as MembroRow[]) ?? []);
    setLoading(false);
  }, [contaAtiva]);

  useEffect(() => {
    void loadMembros();
  }, [loadMembros]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaAtiva || !isAdmin) return;
    setSubmitting(true);
    try {
      await apiPost<{ success: boolean }>(
        "/api/conta/adicionar-membro",
        {
          email: email.trim(),
          nome: nome.trim(),
          papel,
          senhaTemporaria: senha || undefined,
        },
        contaAtiva.id
      );
      toast.success("Membro adicionado.");
      setEmail("");
      setNome("");
      setSenha("");
      await loadMembros();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Membros com acesso a esta conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membros.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.usuarios?.nome ?? "—"}</TableCell>
                    <TableCell>{m.usuarios?.email ?? "—"}</TableCell>
                    <TableCell className="capitalize">{m.papel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar membro</CardTitle>
            <CardDescription>
              Informe o e-mail. Se o usuário não existir, será criado no sistema com a senha
              temporária (opcional).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomeMembro">Nome</Label>
                <Input id="nomeMembro" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="papel">Papel</Label>
                <Select
                  id="papel"
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as ContaPapel)}
                >
                  <option value="admin">Admin</option>
                  <option value="membro">Membro</option>
                  <option value="visualizador">Visualizador</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha temporária (novos usuários)</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  minLength={6}
                  placeholder="Opcional se já existir"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
