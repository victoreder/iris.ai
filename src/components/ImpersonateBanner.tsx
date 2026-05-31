import { ShieldAlert } from "lucide-react";
import { endImpersonate, getImpersonatorEmail, isImpersonating } from "@/lib/impersonate";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function ImpersonateBanner() {
  const { user } = useAuth();

  if (!isImpersonating()) return null;

  const adminEmail = getImpersonatorEmail();

  return (
    <div
      data-screenshot-ignore="true"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm text-amber-950 shadow-md"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Modo suporte: você está vendo como <strong>{user?.email}</strong>
          {adminEmail ? ` (admin: ${adminEmail})` : ""}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-800 bg-amber-50 text-amber-950 hover:bg-amber-100"
        onClick={() => void endImpersonate().catch(console.error)}
      >
        Sair do modo suporte
      </Button>
    </div>
  );
}
