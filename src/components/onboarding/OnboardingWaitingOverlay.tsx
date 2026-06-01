import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OnboardingWaitingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-lg" aria-hidden />
      <Card className="relative z-10 w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle>Aguardando configuração</CardTitle>
          <CardDescription>
            O administrador da conta está finalizando a configuração inicial do Viziom.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
