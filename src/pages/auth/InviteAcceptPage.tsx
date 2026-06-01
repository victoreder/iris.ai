import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  MIN_PASSWORD_LENGTH,
  captureInviteFromUrl,
  clearInviteFlowPending,
  clearInviteParamsFromUrl,
  isInviteFlowPending,
} from "@/lib/authInvite";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function InviteAcceptPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [inviteFlow] = useState(() => captureInviteFromUrl() || isInviteFlowPending());
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      clearInviteParamsFromUrl();
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Validando convite…</p>
      </div>
    );
  }

  if (!inviteFlow) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Convite inválido ou expirado</CardTitle>
            <CardDescription>
              Não foi possível validar seu convite. Peça ao administrador da equipe para enviar um
              novo convite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Ir para login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("A confirmação não confere com a senha.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      clearInviteFlowPending();
      toast.success("Senha definida! Bem-vindo ao Viziom.");
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao definir senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            V
          </div>
          <CardTitle>Crie sua senha de acesso</CardTitle>
          <CardDescription>
            Você foi convidado para o Viziom
            {user.email ? (
              <>
                {" "}
                com o e-mail <strong className="text-foreground">{user.email}</strong>
              </>
            ) : null}
            . Defina uma senha para concluir o cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
            </p>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Salvando…" : "Concluir cadastro"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
