import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";
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
      const { error } = await supabase
        .from("contas")
        .update({
          nome: nome.trim(),
          email_contato: emailContato.trim() || null,
          telefone: telefone.trim() || null,
        })
        .eq("id", contaAtiva.id);
      if (error) throw error;
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
        <CardDescription>
          Informações editáveis pelo admin. Plano, status e slug são gerenciados pelo Viziom.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da empresa</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={!isAdmin}
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
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug (somente leitura)</Label>
            <Input value={contaAtiva.slug} disabled />
          </div>
          <div className="space-y-2">
            <Label>Status (somente leitura)</Label>
            <Input value={contaAtiva.status} disabled className="capitalize" />
          </div>
          {isAdmin && (
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
