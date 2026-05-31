import { Badge } from "@/components/ui/badge";
import metaLogo from "@/assets/meta-logo.svg";

export function MetaLogoIcon({ className }: { className?: string }) {
  return (
    <img
      src={metaLogo}
      alt=""
      aria-hidden
      className={className ?? "h-4 w-auto shrink-0 object-contain"}
      height={16}
      draggable={false}
    />
  );
}

export function MetaOriginBadge() {
  return (
    <Badge variant="meta" className="gap-1">
      <MetaLogoIcon />
      Meta
    </Badge>
  );
}
