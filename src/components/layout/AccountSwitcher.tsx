import { ChevronDown } from "lucide-react";
import { useConta } from "@/contexts/ContaContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AccountSwitcherProps {
  compact?: boolean;
}

export function AccountSwitcher({ compact }: AccountSwitcherProps) {
  const { contaAtiva, contas, setContaAtiva, papelAtivo } = useConta();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="max-w-[180px] justify-between gap-1 px-2 sm:max-w-[220px] sm:px-3"
        >
          <span className="truncate text-left">{contaAtiva?.nome ?? "Conta"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Trocar conta</DropdownMenuLabel>
        {contas.map((conta) => (
          <DropdownMenuItem
            key={conta.id}
            onClick={() => setContaAtiva(conta)}
            className={cn(conta.id === contaAtiva?.id && "bg-primary/10 font-medium text-primary")}
          >
            <span className="truncate">{conta.nome}</span>
          </DropdownMenuItem>
        ))}
        {papelAtivo && (
          <p className="border-t border-border px-2 py-1.5 text-xs capitalize text-muted-foreground">
            Papel: {papelAtivo}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
