import { useAuth } from "@/contexts/AuthContext";
import { useConta } from "@/contexts/ContaContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ContaSuspensaPage() {
  const { signOut } = useAuth();
  const { contaAtiva } = useConta();
  const { isSuperadmin } = useUsuario();

  const vencimento = contaAtiva?.data_vencimento
    ? new Date(contaAtiva.data_vencimento).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conta suspensa</CardTitle>
          <CardDescription>
            O acesso à conta <strong>{contaAtiva?.nome}</strong> está temporariamente bloqueado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {vencimento
              ? `Vencimento em ${vencimento}. Regularize o pagamento para reativar.`
              : "Entre em contato com o suporte Viziom para reativar sua assinatura."}
          </p>
          <div className="flex flex-col gap-2">
            {isSuperadmin && (
              <Button variant="default" onClick={() => (window.location.href = "/sys/contas")}>
                Gerenciar no admin
              </Button>
            )}
            <Button variant="outline" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
