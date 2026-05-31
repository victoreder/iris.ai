import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NoAccessPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sem acesso ao Viziom</CardTitle>
          <CardDescription>
            A conta <strong>{user?.email}</strong> existe no login, mas não está provisionada no
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Apenas usuários criados pelo administrador do sistema podem acessar. Cadastros públicos
            não têm permissão automática.
          </p>
          <div className="flex flex-col gap-2">
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
