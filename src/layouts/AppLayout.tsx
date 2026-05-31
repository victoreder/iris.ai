import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useConta } from "@/contexts/ContaContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { getPageTitle } from "@/lib/appNavigation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isImpersonating } from "@/lib/impersonate";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "viziom-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppLayout() {
  const location = useLocation();
  const { contaAtiva, loading } = useConta();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = getPageTitle(location.pathname);
  useDocumentTitle(pageTitle);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  if (loading || !contaAtiva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-screen bg-background", isImpersonating() && "pt-10")}>
      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={pageTitle} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
