import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";
import type { Feedback, FeedbackTipo } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TIPO_LABEL = { bug: "Bug", sugestao: "Sugestão", melhoria: "Melhoria" };

export function FeedbackSettingsPage() {
  const { user } = useAuth();
  const { contaAtiva } = useConta();
  const [items, setItems] = useState<Feedback[]>([]);
  const [tipo, setTipo] = useState<FeedbackTipo>("bug");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Feedback[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        usuario_id: user.id,
        conta_id: contaAtiva?.id ?? null,
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
      });
      if (error) throw error;
      toast.success("Enviado! Obrigado pelo feedback.");
      setTitulo("");
      setDescricao("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reportar bug ou sugestão</CardTitle>
          <CardDescription>
            Descreva o problema ou ideia. Nossa equipe acompanha por aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as FeedbackTipo)}>
                <option value="bug">Bug / erro</option>
                <option value="sugestao">Sugestão</option>
                <option value="melhoria">Melhoria</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                required
                placeholder="Passos para reproduzir, comportamento esperado, etc."
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seus envios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{TIPO_LABEL[item.tipo]}</Badge>
                  <Badge variant={item.status === "resolvido" ? "success" : "warning"}>
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-2 font-medium">{item.titulo}</p>
                {item.resposta && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong>Resposta:</strong> {item.resposta}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
