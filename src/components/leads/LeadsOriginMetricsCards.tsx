import type { ReactNode } from "react";
import { Globe2, HelpCircle, Users } from "lucide-react";
import { GoogleLogoIcon, MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { cn } from "@/lib/utils";
import type { LeadsOriginMetrics } from "@/lib/leadsAnalytics";

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
        icon={<GoogleLogoIcon className="h-5 w-5" />}
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
