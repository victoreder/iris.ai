import type { ReactNode } from "react";
import { Globe2, HelpCircle, Users } from "lucide-react";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { cn } from "@/lib/utils";
import type { LeadsOriginMetrics } from "@/lib/leadsAnalytics";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className ?? "h-5 w-5"}
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

function pct(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

interface MetricCardProps {
  label: string;
  value: number;
  share?: string;
  icon: ReactNode;
  iconBg: string;
  featured?: boolean;
}

function MetricCard({ label, value, share, icon, iconBg, featured }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[88px] items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm",
        featured && "ring-1 ring-primary/15"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 font-semibold tabular-nums tracking-tight text-foreground",
            featured ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          )}
        >
          {value.toLocaleString("pt-BR")}
        </p>
        {share && <p className="mt-0.5 text-xs text-muted-foreground">{share} do total</p>}
      </div>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        {icon}
      </div>
    </div>
  );
}

interface Props {
  metrics: LeadsOriginMetrics;
  layout?: "grid" | "stack";
  hideTotal?: boolean;
}

export function LeadsOriginMetricsCards({ metrics, layout = "grid", hideTotal = false }: Props) {
  const { total, meta, google, outras, semRastreio } = metrics;

  const cards = (
    <>
      {!hideTotal && (
        <MetricCard
          featured
          label="Total de leads"
          value={total}
          icon={<Users className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/10"
        />
      )}
      <MetricCard
        label="Meta Ads"
        value={meta}
        share={pct(meta, total)}
        icon={<MetaLogoIcon className="h-5 w-auto" />}
        iconBg="bg-[#0081FB]/10"
      />
      <MetricCard
        label="Google Ads"
        value={google}
        share={pct(google, total)}
        icon={<GoogleIcon />}
        iconBg="bg-[#4285F4]/10"
      />
      <MetricCard
        label="Outras origens"
        value={outras}
        share={pct(outras, total)}
        icon={<Globe2 className="h-5 w-5 text-violet-600" />}
        iconBg="bg-violet-500/10"
      />
      <MetricCard
        label="Sem rastreio"
        value={semRastreio}
        share={pct(semRastreio, total)}
        icon={<HelpCircle className="h-5 w-5 text-slate-500" />}
        iconBg="bg-slate-500/10"
      />
    </>
  );

  if (layout === "stack") {
    return <div className="flex flex-col gap-3">{cards}</div>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        hideTotal ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3 xl:grid-cols-5"
      )}
    >
      {cards}
    </div>
  );
}
