import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";
import { slugifyConta } from "@/lib/leadsUrl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { contaAtiva, refreshContas, isAdmin, loading } = useConta();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!contaAtiva) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (!contaAtiva.onboarding_pendente) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Aguardando configuração</CardTitle>
            <CardDescription>
              O administrador da conta precisa concluir o cadastro da empresa.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empresa = nome.trim();
    const slugFinal = slugifyConta(slugTouched ? slug : empresa);

    if (!empresa) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    if (!slugFinal || slugFinal.length < 2) {
      toast.error("Slug inválido.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("contas")
        .update({
          nome: empresa,
          slug: slugFinal,
          onboarding_pendente: false,
        })
        .eq("id", contaAtiva.id);

      if (error) throw error;
      await refreshContas();
      toast.success("Empresa configurada! Bem-vindo ao Viziom.");
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configure sua empresa</CardTitle>
          <CardDescription>
            Último passo antes de usar o Viziom. Informe o nome da sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da empresa</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (!slugTouched) setSlug(slugifyConta(e.target.value));
                }}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador (slug)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Usado nos links públicos: go.dominio/l/{slug || "sua-empresa"}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Salvando…" : "Começar a usar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
