import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  title?: string;
  description?: ReactNode;
  detail?: string | null;
  onRetry?: () => void;
}

export function NoAccessPage({ title, description, detail, onRetry }: Props) {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title ?? "Sem acesso ao Viziom"}</CardTitle>
          <CardDescription>
            {description ?? (
              <>
                A conta <strong>{user?.email}</strong> existe no login, mas não está provisionada no
                sistema.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{detail}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Apenas usuários criados pelo administrador do sistema podem acessar. Cadastros públicos
              não têm permissão automática.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry}>Tentar novamente</Button>
            )}
            <Button variant="outline" onClick={() => void signOut()}>
              Sair
            </Button>
            <Button asChild variant="ghost">
              <Link to="/login">Voltar ao login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
