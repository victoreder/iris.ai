import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useConta } from "@/contexts/ContaContext";
import { contaUrlRef, replaceContaInPath } from "@/lib/appNavigation";
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
  const location = useLocation();
  const navigate = useNavigate();

  const switchConta = (conta: (typeof contas)[number]) => {
    setContaAtiva(conta);
    const path = replaceContaInPath(location.pathname, contaUrlRef(conta));
    navigate(`${path}${location.search}${location.hash}`);
  };

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
            onClick={() => switchConta(conta)}
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
