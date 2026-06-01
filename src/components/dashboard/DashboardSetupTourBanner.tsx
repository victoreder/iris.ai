import { Compass } from "lucide-react";
import { useProductTourOptional } from "@/contexts/ProductTourContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardSetupTourBannerProps {
  missingText: string;
  onStartTour: () => void;
}

export function DashboardSetupTourBanner({ missingText, onStartTour }: DashboardSetupTourBannerProps) {
  const tour = useProductTourOptional();

  if (tour?.active) return null;

  return (
    <Card className="border-primary/25 bg-gradient-to-r from-primary/8 to-primary/3">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Ainda falta configurar sua conta</p>
            <p className="text-sm text-muted-foreground">
              Pendente: {missingText}. O tour guiado mostra onde criar e conectar cada parte no Viziom.
            </p>
          </div>
        </div>
        <Button type="button" className="shrink-0" onClick={onStartTour}>
          <Compass className="h-4 w-4" />
          Fazer tour
        </Button>
      </CardContent>
    </Card>
  );
}
