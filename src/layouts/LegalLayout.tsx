import { Link, Outlet } from "react-router-dom";

export function LegalLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/termos-de-uso" className="flex items-center gap-3">
            <img src="/viziom-logo.png" alt="Viziom" className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/termos-de-uso" className="text-muted-foreground hover:text-foreground">
              Termos
            </Link>
            <Link to="/politica-de-privacidade" className="text-muted-foreground hover:text-foreground">
              Privacidade
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Viziom — RX Estratégias Digitais</p>
          <div className="flex justify-center gap-4 sm:justify-end">
            <Link to="/termos-de-uso" className="hover:text-foreground">
              Termos de uso
            </Link>
            <Link to="/politica-de-privacidade" className="hover:text-foreground">
              Política de privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
