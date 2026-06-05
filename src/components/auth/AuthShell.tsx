import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthShell({ title, description, children, footer, className }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl"
      />

      <div className={cn("relative z-10 w-full max-w-[420px]", className)}>
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/login" className="mb-6 block transition-opacity hover:opacity-90">
            <img
              src="/viziom-logo.png"
              alt="Viziom"
              className="mx-auto h-10 w-auto max-w-[180px] object-contain"
            />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          {children}
        </div>

        {footer ?? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/termos-de-uso" className="hover:text-foreground hover:underline">
              Termos de uso
            </Link>
            {" · "}
            <Link to="/politica-de-privacidade" className="hover:text-foreground hover:underline">
              Política de privacidade
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
