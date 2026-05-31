import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { slugifyLeadLink } from "@/lib/leadsUrl";
import type { Plano, PlanoRecorrencia } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";

const RECORRENCIAS: { value: PlanoRecorrencia; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const emptyForm = {
  nome: "",
  slug: "",
  descricao: "",
  preco: "0",
  recorrencia: "mensal" as PlanoRecorrencia,
  max_whatsapps: "",
  max_usuarios: "",
  max_leads: "",
  ativo: true,
};

function recorrenciaLabel(r: PlanoRecorrencia) {
  return RECORRENCIAS.find((x) => x.value === r)?.label ?? r;
}

export function SysPlansPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("planos").select("*").order("preco");
    if (error) toast.error(error.message);
    setPlanos((data as Plano[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (p: Plano) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      slug: p.slug,
      descricao: p.descricao ?? "",
      preco: String(p.preco),
      recorrencia: p.recorrencia,
      max_whatsapps: p.max_whatsapps != null ? String(p.max_whatsapps) : "",
      max_usuarios: p.max_usuarios != null ? String(p.max_usuarios) : "",
      max_leads: p.max_leads != null ? String(p.max_leads) : "",
      ativo: p.ativo,
    });
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const parseLimit = (v: string) => (v.trim() === "" ? null : Number(v));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.trim();
    const slug = slugifyLeadLink(slugTouched ? form.slug : nome);
    if (!nome || !slug) {
      toast.error("Nome e slug são obrigatórios.");
      return;
    }

    setSubmitting(true);
    const payload = {
      nome,
      slug,
      descricao: form.descricao.trim() || null,
      preco: Number(form.preco) || 0,
      recorrencia: form.recorrencia,
      max_whatsapps: parseLimit(form.max_whatsapps),
      max_usuarios: parseLimit(form.max_usuarios),
      max_leads: parseLimit(form.max_leads),
      ativo: form.ativo,
    };

    try {
      if (editing) {
        const { error } = await supabase.from("planos").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Plano atualizado.");
      } else {
        const { error } = await supabase.from("planos").insert(payload);
        if (error) throw error;
        toast.success("Plano criado.");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: Plano) => {
    if (!confirm(`Excluir o plano "${p.nome}"? Contas vinculadas impedirão a exclusão.`)) return;
    const { error } = await supabase.from("planos").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plano excluído.");
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Gerencie planos e limites do Viziom.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo plano
        </Button>
      </div>

      <DialogRoot open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editing ? "Editar plano" : "Novo plano"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      nome: v,
                      slug: slugTouched ? f.slug : slugifyLeadLink(v),
                    }));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco}
                  onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select
                  value={form.recorrencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, recorrencia: e.target.value as PlanoRecorrencia }))
                  }
                >
                  {RECORRENCIAS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Limite WhatsApp</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.max_whatsapps}
                  onChange={(e) => setForm((f) => ({ ...f, max_whatsapps: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite usuários</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.max_usuarios}
                  onChange={(e) => setForm((f) => ({ ...f, max_usuarios: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite leads</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={form.max_leads}
                  onChange={(e) => setForm((f) => ({ ...f, max_leads: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="ativo"
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                />
                <Label htmlFor="ativo">Plano ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {planos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>R$ {Number(p.preco).toFixed(2)}</TableCell>
                    <TableCell>{recorrenciaLabel(p.recorrencia)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      WA {p.max_whatsapps ?? "∞"} · Users {p.max_usuarios ?? "∞"} · Leads{" "}
                      {p.max_leads ?? "∞"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? "success" : "default"}>
                        {p.ativo ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleDelete(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
