import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { ContaMembro, ContaPapel } from "@/types/database";
import type { Usuario } from "@/types/usuario";
import { AdminOnlyNotice } from "@/components/settings/AdminOnlyNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogContent, DialogFooter, DialogRoot, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MembroRow = ContaMembro & { usuarios: Usuario | null };

const PAPEL_LABEL: Record<ContaPapel, string> = {
  admin: "Admin",
  membro: "Membro",
  visualizador: "Visualizador",
};

export function TeamSettingsPage() {
  const { user } = useAuth();
  const { contaAtiva, isAdmin } = useConta();
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMembro, setEditingMembro] = useState<MembroRow | null>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<ContaPapel>("membro");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);

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

  const resetAddForm = () => {
    setEmail("");
    setNome("");
    setPapel("membro");
  };

  const openEditDialog = (membro: MembroRow) => {
    if (!isAdmin) return;
    setEditingMembro(membro);
    setNome(membro.usuarios?.nome ?? "");
    setPapel(membro.papel);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingMembro(null);
    setNome("");
    setPapel("membro");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaAtiva || !isAdmin) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; invited?: boolean }>(
        "/api/conta/adicionar-membro",
        {
          email: email.trim(),
          nome: nome.trim(),
          papel,
        },
        contaAtiva.id
      );
      toast.success(
        res.invited
          ? "Convite enviado por e-mail. Ao criar a conta, o membro já terá acesso."
          : "Membro adicionado à equipe."
      );
      resetAddForm();
      setAddDialogOpen(false);
      await loadMembros();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaAtiva || !isAdmin || !editingMembro) return;
    setSubmitting(true);
    try {
      await apiPost(
        "/api/conta/atualizar-membro",
        {
          membroId: editingMembro.id,
          nome: nome.trim(),
          papel,
        },
        contaAtiva.id
      );
      toast.success("Membro atualizado.");
      closeEditDialog();
      await loadMembros();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!contaAtiva || !isAdmin || !editingMembro) return;
    const label = editingMembro.usuarios?.nome || editingMembro.usuarios?.email || "este membro";
    if (!window.confirm(`Remover ${label} da equipe?`)) return;

    setRemoving(true);
    try {
      await apiPost(
        "/api/conta/remover-membro",
        { membroId: editingMembro.id },
        contaAtiva.id
      );
      toast.success("Membro removido da equipe.");
      closeEditDialog();
      await loadMembros();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setRemoving(false);
    }
  };

  const canEditMembro = (membro: MembroRow) =>
    isAdmin && membro.user_id !== user?.id;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Membros com acesso a esta conta.</CardDescription>
          </div>
          {isAdmin && (
            <DialogRoot open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  <Plus className="h-4 w-4" />
                  Adicionar membro
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Adicionar membro"
                description="Enviaremos um convite por e-mail. Ao aceitar e criar a conta, o membro já ficará vinculado a esta empresa."
              >
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeMembro">Nome</Label>
                    <Input
                      id="nomeMembro"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailMembro">E-mail</Label>
                    <Input
                      id="emailMembro"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="papelMembro">Papel</Label>
                    <Select
                      id="papelMembro"
                      value={papel}
                      onChange={(e) => setPapel(e.target.value as ContaPapel)}
                    >
                      <option value="admin">Admin</option>
                      <option value="membro">Membro</option>
                      <option value="visualizador">Visualizador</option>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddDialogOpen(false)}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Enviando…" : "Enviar convite"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </DialogRoot>
          )}
        </CardHeader>
        <CardContent>
          {!isAdmin && (
            <div className="mb-4">
              <AdminOnlyNotice action="adicionar, editar ou remover membros" />
            </div>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : membros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {membros.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.usuarios?.nome ?? "—"}</TableCell>
                    <TableCell>{m.usuarios?.email ?? "—"}</TableCell>
                    <TableCell>{PAPEL_LABEL[m.papel] ?? m.papel}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Editar ${m.usuarios?.nome ?? "membro"}`}
                          onClick={() => openEditDialog(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DialogRoot
        open={editDialogOpen && isAdmin}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent
          title="Editar membro"
          description="Altere o nome ou papel do membro nesta conta."
        >
          {editingMembro && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editNome">Nome</Label>
                <Input
                  id="editNome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">E-mail</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingMembro.usuarios?.email ?? ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPapel">Papel</Label>
                <Select
                  id="editPapel"
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as ContaPapel)}
                >
                  <option value="admin">Admin</option>
                  <option value="membro">Membro</option>
                  <option value="visualizador">Visualizador</option>
                </Select>
              </div>

              {editingMembro.user_id === user?.id && (
                <p className="text-xs text-muted-foreground">
                  Para editar seu próprio perfil ou senha, use Configurações → Perfil.
                </p>
              )}

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                {canEditMembro(editingMembro) ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleRemove()}
                    disabled={submitting || removing}
                  >
                    {removing ? "Removendo…" : "Remover membro"}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditDialog}
                    disabled={submitting || removing}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting || removing}>
                    {submitting ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </DialogRoot>
    </>
  );
}
