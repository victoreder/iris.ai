import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Columns3 } from "lucide-react";
import { LeadOriginBadge } from "@/components/leads/MetaOriginBadge";
import { LeadsTableColumnPicker } from "@/components/leads/LeadsTableColumnPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPhoneBR, getOriginLabel, isMetaOrigin } from "@/lib/leadsAnalytics";
import { formatValorVendaBR, resolveLeadValorVenda } from "@/lib/leadValorVenda";
import {
  LEADS_TABLE_COLUMN_LABELS,
  type LeadsTableColumnKey,
} from "@/lib/leadsTableColumns";
import type { LeadDetailTab } from "@/lib/leadDetailTabs";
import type { LeadsClique } from "@/types/database";

interface Props {
  leads: LeadsClique[];
  columns: LeadsTableColumnKey[];
  contaId: string;
  columnsPickerOpen: boolean;
  onColumnsPickerOpenChange: (open: boolean) => void;
  onColumnsChange: (columns: LeadsTableColumnKey[]) => void;
  onLeadClick: (lead: LeadsClique, tab?: LeadDetailTab) => void;
}

function cellText(value: string | null | undefined): string {
  const v = value?.trim();
  return v || "—";
}

function LeadsTableCell({
  column,
  lead,
  onLeadClick,
}: {
  column: LeadsTableColumnKey;
  lead: LeadsClique;
  onLeadClick: (lead: LeadsClique, tab?: LeadDetailTab) => void;
}) {
  switch (column) {
    case "contato":
      return <span className="font-medium">{formatPhoneBR(lead.telefone_lead)}</span>;
    case "etapa":
      return lead.leads_jornada_etapas?.nome ? (
        <button
          type="button"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={(e) => {
            e.stopPropagation();
            onLeadClick(lead, "jornada");
          }}
          title="Ver jornada"
        >
          <Badge variant="outline" className="font-normal hover:bg-muted">
            {lead.leads_jornada_etapas.nome}
          </Badge>
        </button>
      ) : (
        "—"
      );
    case "campanha":
      return lead.leads_links?.nome ?? "WhatsApp direto";
    case "origem":
      return (
        <span className="flex items-center gap-1">
          <LeadOriginBadge lead={lead} />
          {getOriginLabel(lead)}
        </span>
      );
    case "entrada":
      return lead.convertido_at
        ? format(new Date(lead.convertido_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "—";
    case "follow_up":
      return lead.data_follow_up
        ? format(new Date(lead.data_follow_up), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "—";
    case "reuniao":
      return lead.data_reuniao
        ? format(new Date(lead.data_reuniao), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "—";
    case "responsavel":
      return lead.responsavel?.nome?.trim() || lead.responsavel?.email || "—";
    case "observacao":
      return (
        <span className="block max-w-[220px] truncate" title={lead.observacao ?? undefined}>
          {cellText(lead.observacao)}
        </span>
      );
    case "dispositivo": {
      const parts = [lead.device_type, lead.browser, lead.os].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : "—";
    }
    case "valor_venda": {
      if (!lead.leads_jornada_etapas?.representa_venda) return "—";
      return formatValorVendaBR(resolveLeadValorVenda(lead));
    }
    case "utm_source":
      return cellText(lead.utm_source);
    case "utm_medium":
      return cellText(lead.utm_medium);
    case "utm_campaign":
      return cellText(lead.utm_campaign);
    case "utm_content":
      return cellText(lead.utm_content);
    case "utm_term":
      return cellText(lead.utm_term);
    case "fbclid":
      return <span className="block max-w-[180px] truncate">{cellText(lead.fbclid)}</span>;
    case "gclid":
      return <span className="block max-w-[180px] truncate">{cellText(lead.gclid)}</span>;
    case "ip_address":
      return cellText(lead.ip_address);
    case "fbp":
      return <span className="block max-w-[180px] truncate">{cellText(lead.fbp)}</span>;
    case "fbc":
      return <span className="block max-w-[180px] truncate">{cellText(lead.fbc)}</span>;
    case "referrer":
      return (
        <span className="block max-w-[220px] truncate" title={lead.referrer ?? undefined}>
          {cellText(lead.referrer)}
        </span>
      );
    case "landing_url":
      return (
        <span className="block max-w-[220px] truncate" title={lead.landing_url ?? undefined}>
          {cellText(lead.landing_url)}
        </span>
      );
    default:
      return "—";
  }
}

export function LeadsInboxTable({
  leads,
  columns,
  contaId,
  columnsPickerOpen,
  onColumnsPickerOpenChange,
  onColumnsChange,
  onLeadClick,
}: Props) {
  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {leads.length === 0
              ? "Nenhum lead com os filtros atuais"
              : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onColumnsPickerOpenChange(true)}
            title="Selecionar colunas"
          >
            <Columns3 className="h-4 w-4" />
            Colunas
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{LEADS_TABLE_COLUMN_LABELS[column]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onLeadClick(lead)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      className={
                        column === "entrada" ||
                        column === "follow_up" ||
                        column === "reuniao" ||
                        column === "observacao" ||
                        column.startsWith("utm_") ||
                        column === "fbclid" ||
                        column === "gclid" ||
                        column === "fbp" ||
                        column === "fbc"
                          ? "text-xs text-muted-foreground"
                          : undefined
                      }
                      onClick={column === "etapa" ? (e) => e.stopPropagation() : undefined}
                    >
                      <LeadsTableCell column={column} lead={lead} onLeadClick={onLeadClick} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center">
                    <p className="font-medium text-foreground">Nenhum lead encontrado</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ajuste o período, filtros ou aguarde novas conversões.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <LeadsTableColumnPicker
        open={columnsPickerOpen}
        onOpenChange={onColumnsPickerOpenChange}
        contaId={contaId}
        columns={columns}
        onSave={onColumnsChange}
      />
    </>
  );
}
