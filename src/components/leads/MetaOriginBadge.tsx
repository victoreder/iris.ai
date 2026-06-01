import { Badge } from "@/components/ui/badge";
import metaLogo from "@/assets/meta-logo.svg";
import type { LeadsClique, LeadsCliqueOrigem } from "@/types/database";
import { origemIsGoogle, origemIsMeta } from "@/lib/leadOrigens";
import { isGoogleOrigin, isMetaOrigin } from "@/lib/leadsAnalytics";

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

export function GoogleLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className ?? "h-4 w-4 shrink-0"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
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

export function GoogleOriginBadge() {
  return (
    <Badge variant="google" className="gap-1">
      <GoogleLogoIcon />
      Google
    </Badge>
  );
}

export function LeadOriginBadge({ lead }: { lead: LeadsClique }) {
  if (isMetaOrigin(lead)) return <MetaOriginBadge />;
  if (isGoogleOrigin(lead)) return <GoogleOriginBadge />;
  return null;
}

export function LeadOrigemBadge({ origem }: { origem: LeadsCliqueOrigem }) {
  if (origemIsMeta(origem)) return <MetaOriginBadge />;
  if (origemIsGoogle(origem)) return <GoogleOriginBadge />;
  return null;
}
