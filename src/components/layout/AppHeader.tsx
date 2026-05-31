import { Menu } from "lucide-react";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { BugReportButton } from "@/components/layout/BugReportDialog";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { WhatsappHeaderStatus } from "@/components/layout/WhatsappHeaderStatus";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  onOpenMobileMenu: () => void;
}

export function AppHeader({ title, onOpenMobileMenu }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">{title}</h1>

      <WhatsappHeaderStatus />

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <BugReportButton compact />
        <AccountSwitcher compact />
        <ProfileMenu />
      </div>
    </header>
  );
}
