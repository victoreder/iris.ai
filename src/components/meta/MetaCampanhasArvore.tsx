import { ChevronDown, ChevronRight, Layers, Megaphone, RectangleHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MetaMarketingCampaign } from "@/types/metaMarketing";

type MetaCampanhasArvoreProps = {
  campaigns: MetaMarketingCampaign[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
};

function StatusBadge({ status }: { status: string }) {
  const active = status.toUpperCase() === "ACTIVE";
  return (
    <Badge variant={active ? "success" : "default"} className="shrink-0 text-[10px] uppercase">
      {status || "—"}
    </Badge>
  );
}

function TreeRow({
  icon: Icon,
  label,
  status,
  depth,
  expanded,
  hasChildren,
  onToggle,
}: {
  icon: typeof Megaphone;
  label: string;
  status: string;
  depth: 0 | 1 | 2;
  expanded?: boolean;
  hasChildren: boolean;
  onToggle?: () => void;
}) {
  const padding = depth === 0 ? "pl-2" : depth === 1 ? "pl-8" : "pl-14";

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border/60 py-2.5 pr-3",
        padding,
        depth === 0 && "bg-muted/20"
      )}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : (
        <span className="inline-block h-7 w-7 shrink-0" />
      )}
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <StatusBadge status={status} />
    </div>
  );
}

export function MetaCampanhasArvore({ campaigns, expanded, onToggle }: MetaCampanhasArvoreProps) {
  if (campaigns.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma campanha ativa nesta conta de anúncio.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {campaigns.map((campaign) => {
        const campaignKey = `campaign:${campaign.id}`;
        const campaignOpen = expanded.has(campaignKey);

        return (
          <div key={campaign.id}>
            <TreeRow
              icon={Megaphone}
              label={campaign.name}
              status={campaign.status}
              depth={0}
              expanded={campaignOpen}
              hasChildren={campaign.adsets.length > 0}
              onToggle={() => onToggle(campaignKey)}
            />

            {campaignOpen &&
              campaign.adsets.map((adset) => {
                const adsetKey = `adset:${adset.id}`;
                const adsetOpen = expanded.has(adsetKey);

                return (
                  <div key={adset.id}>
                    <TreeRow
                      icon={Layers}
                      label={adset.name}
                      status={adset.status}
                      depth={1}
                      expanded={adsetOpen}
                      hasChildren={adset.ads.length > 0}
                      onToggle={() => onToggle(adsetKey)}
                    />

                    {adsetOpen &&
                      adset.ads.map((ad) => (
                        <TreeRow
                          key={ad.id}
                          icon={RectangleHorizontal}
                          label={ad.name}
                          status={ad.status}
                          depth={2}
                          hasChildren={false}
                        />
                      ))}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
