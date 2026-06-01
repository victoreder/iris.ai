import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LegalParagraph({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-4 leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LegalOrderedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mb-4 list-decimal space-y-2 pl-6 text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ol>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 mt-6 text-base font-semibold text-foreground">{children}</h3>;
}

export function LegalHighlight({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground">
      {children}
    </div>
  );
}

export function LegalTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
