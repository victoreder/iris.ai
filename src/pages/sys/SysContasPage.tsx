import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiPostAuth } from "@/lib/api";
import { startImpersonate } from "@/lib/impersonate";
import { supabase } from "@/lib/supabase";
import type { Conta } from "@/types/database";
import type { Plano } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";

const SENHA_PADRAO = "Padrao123456";

type ContaRow = Conta & { planos: Plano | null };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function toInputDate(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function SysContasPage() {
  const [contas, setContas] = useState<ContaRow[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ContaRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [planoId, setPlanoId] = useState("");

  const [editNome, setEditNome] = useState("");
  const [editStatus, setEditStatus] = useState<Conta["status"]>("ativa");
  const [editPlanoId, setEditPlanoId] = useState("");
  const [editVencimento, setEditVencimento] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [contasRes, planosRes] = await Promise.all([
      supabase.from("contas").select("*, planos(*)").order("created_at", { ascending: false }),
      supabase.from("planos").select("*").order("preco"),
    ]);
    if (contasRes.error) toast.error(contasRes.error.message);
    if (planosRes.error) toast.error(planosRes.error.message);
    setContas((contasRes.data as ContaRow[]) ?? []);
    const lista = (planosRes.data as Plano[]) ?? [];
    setPlanos(lista);
    setPlanoId((prev) => prev || lista.find((p) => p.ativo)?.id || lista[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const plano = planos.find((p) => p.id === planoId);
      await apiPostAuth<{ success: boolean }>("/api/admin/criar-cliente", {
        email: email.trim(),
        telefone: telefone.trim(),
        planoId,
        planoSlug: plano?.slug,
      });
      toast.success("Conta criada.");
      setCreateOpen(false);
      setEmail("");
      setTelefone("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = async (conta: ContaRow) => {
    setEditing(conta);
    setEditNome(conta.onboarding_pendente ? "" : conta.nome);
    setEditStatus(conta.status);
    setEditPlanoId(conta.plano_id ?? "");
    setEditVencimento(toInputDate(conta.data_vencimento));
    setEditOpen(true);

    const { data: membros } = await supabase
      .from("conta_membros")
      .select("user_id, papel")
      .eq("conta_id", conta.id)
      .in("papel", ["admin", "membro"]);

    if (!membros?.length) {
      setAdminUserId(null);
      return;
    }

    const userIds = membros.map((m) => m.user_id);
    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("id, superadmin")
      .in("id", userIds);

    const elegiveis = new Set(
      (usuarios ?? []).filter((u) => !u.superadmin).map((u) => u.id)
    );
    const adminMembro = membros.find((m) => m.papel === "admin" && elegiveis.has(m.user_id));
    const qualquerMembro = membros.find((m) => elegiveis.has(m.user_id));
    setAdminUserId(adminMembro?.user_id ?? qualquerMembro?.user_id ?? null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await apiPostAuth("/api/admin/atualizar-conta", {
        contaId: editing.id,
        status: editStatus,
        planoId: editPlanoId || null,
        dataVencimento: editVencimento || null,
        nome: !editing.onboarding_pendente && editNome.trim() ? editNome.trim() : undefined,
      });
      toast.success("Conta atualizada.");
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenovar = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await apiPostAuth("/api/admin/registrar-pagamento", { contaId: editing.id });
      toast.success("Pagamento registrado — vencimento estendido.");
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renovar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!adminUserId) {
      toast.error(
        "Nenhum usuário elegível para impersonar nesta conta (superadmins são excluídos)."
      );
      return;
    }
    try {
      await startImpersonate(adminUserId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao impersonar.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas</h1>
          <p className="text-muted-foreground">Gerencie empresas, planos e vencimentos.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nova conta</Button>
      </div>

      <DialogRoot open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          title="Nova conta"
          description="A empresa define o nome no primeiro acesso (onboarding)."
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Senha inicial: <strong>{SENHA_PADRAO}</strong> — oriente o cliente a trocar no
              primeiro login.
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={planoId} onChange={(e) => setPlanoId(e.target.value)} required>
                {planos.filter((p) => p.ativo).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Criando…" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Editar conta">
          {editing && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {!editing.onboarding_pendente && (
                <div className="space-y-2">
                  <Label>Nome da empresa</Label>
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} required />
                </div>
              )}
              {editing.onboarding_pendente && (
                <p className="text-sm text-muted-foreground italic">
                  Nome será definido no onboarding pelo cliente.
                </p>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Conta["status"])}
                >
                  <option value="ativa">Ativa</option>
                  <option value="suspensa">Suspensa</option>
                  <option value="cancelada">Cancelada</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={editPlanoId} onChange={(e) => setEditPlanoId(e.target.value)}>
                  <option value="">—</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de vencimento</Label>
                <Input
                  type="date"
                  value={editVencimento}
                  onChange={(e) => setEditVencimento(e.target.value)}
                />
              </div>
              <DialogFooter className="flex-wrap justify-between sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!adminUserId || submitting}
                    onClick={() => void handleImpersonate()}
                  >
                    <Eye className="h-4 w-4" />
                    Entrar como cliente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => void handleRenovar()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Registrar pagamento
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </DialogRoot>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.onboarding_pendente ? (
                        <span className="italic text-muted-foreground">Onboarding</span>
                      ) : (
                        c.nome
                      )}
                    </TableCell>
                    <TableCell>{c.email_contato ?? "—"}</TableCell>
                    <TableCell>{c.planos?.nome ?? "—"}</TableCell>
                    <TableCell>{formatDate(c.data_vencimento)}</TableCell>
                    <TableCell>
                      {c.onboarding_pendente ? (
                        <Badge variant="warning">Onboarding</Badge>
                      ) : (
                        <Badge variant={c.status === "ativa" ? "success" : "warning"}>
                          {c.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => void openEdit(c)}>
                        <Pencil className="h-4 w-4" />
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
  );
}
