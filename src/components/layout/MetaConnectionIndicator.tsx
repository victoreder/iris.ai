import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetaConnectionIndicator({
  connected,
  className,
}: {
  connected: boolean;
  className?: string;
}) {
  if (!connected) return null;
  return (
    <CheckCircle2
      className={cn("h-4 w-4 shrink-0 text-emerald-500", className)}
      aria-label="Meta conectada"
    />
  );
}
