import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LeadsUtmSearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Todos",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery("");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const select = (next: string) => {
    onChange(next);
    close();
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <Label>{label}</Label>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm shadow-sm transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate text-left">{value || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-8 pl-8"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto p-1" role="listbox">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => select("")}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-muted",
                  !value && "bg-primary/10 font-medium text-primary"
                )}
              >
                {placeholder}
                {!value && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt}
                  onClick={() => select(opt)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted",
                    value === opt && "bg-primary/10 font-medium text-primary"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhum resultado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
