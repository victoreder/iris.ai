import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConta } from "@/contexts/ContaContext";
import { AdminOnlyNotice } from "@/components/settings/AdminOnlyNotice";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function AccountSettingsPage() {
  const { contaAtiva, isAdmin, refreshContas } = useConta();
  const [nome, setNome] = useState("");
  const [emailContato, setEmailContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contaAtiva) return;
    setNome(contaAtiva.nome);
    setEmailContato(contaAtiva.email_contato ?? "");
    setTelefone(contaAtiva.telefone ?? "");
  }, [contaAtiva]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaAtiva || !isAdmin) return;
    setSaving(true);
    try {
      await apiPost(
        "/api/conta/atualizar-conta",
        {
          nome: nome.trim(),
          emailContato: emailContato.trim(),
          telefone: telefone.trim(),
        },
        contaAtiva.id
      );
      await refreshContas();
      toast.success("Conta atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (!contaAtiva) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da empresa</CardTitle>
        <CardDescription>Dados da empresa vinculada à conta ativa.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <div className="mb-4">
            <AdminOnlyNotice action="editar os dados da empresa" />
          </div>
        )}
        <fieldset disabled={!isAdmin} className="max-w-md space-y-4 border-0 p-0 m-0">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da empresa</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailContato">E-mail de contato</Label>
            <Input
              id="emailContato"
              type="email"
              value={emailContato}
              onChange={(e) => setEmailContato(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          )}
        </form>
        </fieldset>
      </CardContent>
    </Card>
  );
}
