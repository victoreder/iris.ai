import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { getPasswordResetRedirectUrl } from "@/lib/authPasswordReset";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!loading && user) return <Navigate to="/app" replace />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = email.trim();
    if (!emailTrim) {
      toast.error("Informe seu e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (error) throw error;
      setSent(true);
      toast.success("E-mail enviado! Verifique sua caixa de entrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar e-mail de recuperação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={sent ? "Verifique seu e-mail" : "Esqueceu a senha?"}
      description={
        sent ? (
          <>
            Se existir uma conta com <strong className="text-foreground">{email.trim()}</strong>,
            enviamos um link para redefinir sua senha. O link expira em breve.
          </>
        ) : (
          "Informe o e-mail da sua conta. Enviaremos um link seguro para criar uma nova senha."
        )
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Não recebeu? Confira o spam ou aguarde alguns minutos. Você pode solicitar novamente
              abaixo.
            </p>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
            Enviar novamente
          </Button>
          <Button asChild variant="ghost" className="w-full gap-2">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar link de recuperação"}
          </Button>
          <Button asChild variant="ghost" className="w-full gap-2">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
