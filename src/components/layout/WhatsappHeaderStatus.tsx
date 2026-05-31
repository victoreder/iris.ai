import { Link } from "react-router-dom";
import { useLeadsInstancias } from "@/hooks/useLeadsInstancias";
import { APP_ROUTES } from "@/lib/appNavigation";
import { cn } from "@/lib/utils";

export function WhatsappHeaderStatus() {
  const { instancias, loading } = useLeadsInstancias(false);

  if (loading || instancias.length === 0) return null;

  const disconnected = instancias.filter((i) => i.status !== "conectado");
  const allConnected = disconnected.length === 0;

  if (allConnected) {
    const label =
      instancias.length === 1 ? "WhatsApp conectado" : "WhatsApps conectados";
    return (
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        )}
      >
        {label}
      </span>
    );
  }

  const count = disconnected.length;
  const label =
    count === 1 ? "1 WhatsApp desconectado" : `${count} WhatsApps desconectados`;

  return (
    <Link
      to={APP_ROUTES.whatsapp}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90",
        "bg-orange-500/15 text-orange-700 dark:text-orange-400"
      )}
    >
      {label}
    </Link>
  );
}
