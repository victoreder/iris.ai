import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import {
  DASHBOARD_EXTRA_DATE_PRESETS,
  DASHBOARD_PERIOD_LABELS,
  DASHBOARD_QUICK_DATE_PRESETS,
  type DatePreset,
} from "@/lib/leadsAnalytics";
import { cn } from "@/lib/utils";

interface Props {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  rangeFrom: Date;
  rangeTo: Date;
  onPresetChange: (preset: DatePreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  className?: string;
}

function formatRangeShort(from: Date, to: Date) {
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromFmt = format(from, sameYear ? "dd/MM" : "dd/MM/yy", { locale: ptBR });
  const toFmt = format(to, sameYear ? "dd/MM" : "dd/MM/yy", { locale: ptBR });
  return `${fromFmt} – ${toFmt}`;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DashboardDateFilter({
  preset,
  customFrom,
  customTo,
  rangeFrom,
  rangeTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  className,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const extraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen && !extraOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (calendarRef.current?.contains(target)) return;
      if (extraRef.current?.contains(target)) return;
      setCalendarOpen(false);
      setExtraOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [calendarOpen, extraOpen]);

  const extraLabel = DASHBOARD_EXTRA_DATE_PRESETS.includes(preset)
    ? DASHBOARD_PERIOD_LABELS[preset]
    : preset === "personalizado"
      ? "Personalizado"
      : "Todas";

  const openCalendar = () => {
    setExtraOpen(false);
    if (preset !== "personalizado") {
      onPresetChange("personalizado");
      onCustomFromChange(toDateInputValue(rangeFrom));
      onCustomToChange(toDateInputValue(rangeTo));
    }
    setCalendarOpen(true);
  };

  const selectQuickPreset = (value: DatePreset) => {
    setCalendarOpen(false);
    setExtraOpen(false);
    onPresetChange(value);
  };

  const selectExtraPreset = (value: DatePreset) => {
    setCalendarOpen(false);
    setExtraOpen(false);
    onPresetChange(value);
  };

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center rounded-full border border-border bg-card px-1 py-1 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-0.5 px-1">
        {DASHBOARD_QUICK_DATE_PRESETS.map((key) => {
          const active = preset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectQuickPreset(key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {DASHBOARD_PERIOD_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div className="mx-1 h-6 w-px shrink-0 bg-border" />

      <div ref={calendarRef} className="relative">
        <button
          type="button"
          onClick={openCalendar}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
            calendarOpen || preset === "personalizado"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="whitespace-nowrap tabular-nums">{formatRangeShort(rangeFrom, rangeTo)}</span>
          <Calendar className="h-4 w-4 shrink-0 opacity-70" />
        </button>

        {calendarOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Período personalizado
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>De</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    onCustomFromChange(e.target.value);
                    onPresetChange("personalizado");
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    onCustomToChange(e.target.value);
                    onPresetChange("personalizado");
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-1 h-6 w-px shrink-0 bg-border" />

      <div ref={extraRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setCalendarOpen(false);
            setExtraOpen((v) => !v);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
            DASHBOARD_EXTRA_DATE_PRESETS.includes(preset) || preset === "personalizado"
              ? "text-foreground"
              : "text-foreground"
          )}
        >
          <span className="whitespace-nowrap">{extraLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>

        {extraOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
            {DASHBOARD_EXTRA_DATE_PRESETS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => selectExtraPreset(key)}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  preset === key && "bg-muted font-medium text-foreground"
                )}
              >
                {DASHBOARD_PERIOD_LABELS[key]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
