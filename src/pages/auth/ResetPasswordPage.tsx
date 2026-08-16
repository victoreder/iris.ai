import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { MIN_PASSWORD_LENGTH } from "@/lib/authInvite";
import {
  clearPasswordRecoveryParamsFromUrl,
  establishPasswordRecoverySession,
  isPasswordRecoveryFromUrl,
} from "@/lib/authPasswordReset";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function mensagemErroRedefinicao(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/session missing/i.test(msg)) {
    return "Não foi possível validar o link de recuperação. Solicite um novo e-mail.";
  }
  return msg || "Erro ao redefinir senha.";
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [fromRecoveryLink] = useState(() => isPasswordRecoveryFromUrl());
  const [checking, setChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const finishCheck = (ready: boolean) => {
      if (cancelled || finished) return;
      finished = true;
      setRecoveryReady(ready);
      setChecking(false);
      if (ready) clearPasswordRecoveryParamsFromUrl();
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        finishCheck(true);
      }
    });

    void (async () => {
      const established = await establishPasswordRecoverySession();
      if (cancelled) return;
      if (established && fromRecoveryLink) {
        finishCheck(true);
      }
    })();

    const timeout = window.setTimeout(() => {
      finishCheck(false);
    }, 10000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [fromRecoveryLink]);

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
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setRecoveryReady(false);
        toast.error("Sessão de recuperação expirada. Solicite um novo link.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success("Senha redefinida! Faça login com a nova senha.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(mensagemErroRedefinicao(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <AuthShell title="Redefinir senha" description="Validando link de recuperação…">
        <p className="text-center text-sm text-muted-foreground">Aguarde um instante…</p>
      </AuthShell>
    );
  }

  if (!recoveryReady) {
    return (
      <AuthShell
        title="Link inválido ou expirado"
        description="Este link de recuperação não é mais válido. Solicite um novo e-mail."
      >
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/auth/esqueci-senha">Solicitar novo link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">Voltar ao login</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nova senha"
      description="Escolha uma senha segura para acessar sua conta no Viziom."
    >
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
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
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
        <p className="text-xs text-muted-foreground">Mínimo de {MIN_PASSWORD_LENGTH} caracteres.</p>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
