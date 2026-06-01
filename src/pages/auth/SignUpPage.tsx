import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignUpPage() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            V
          </div>
          <CardTitle>Acesso sob convite</CardTitle>
          <CardDescription>
            O Viziom não possui cadastro público. Sua conta precisa ser criada pelo administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se você recebeu um e-mail de acesso, use a senha informada para entrar. Caso contrário,
            entre em contato com o suporte Viziom.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Ir para login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
