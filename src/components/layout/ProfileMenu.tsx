import { useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, MessageCircle, Settings, User } from "lucide-react";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { MetaConnectionIndicator } from "@/components/layout/MetaConnectionIndicator";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { getAvatarPublicUrl } from "@/lib/storageUrls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { useProductTourOptional } from "@/contexts/ProductTourContext";

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { usuario } = useUsuario();
  const routes = useAppRoutes();
  const tour = useProductTourOptional();
  const { connected: metaConnected } = useMetaConnectionStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const tourProfileStep = tour?.isProfileStep ?? false;

  const photoUrl = getAvatarPublicUrl(usuario?.foto_url);
  const displayName = usuario?.nome ?? user?.email ?? "Usuário";

  return (
    <DropdownMenu
      open={tourProfileStep ? true : menuOpen}
      onOpenChange={(open) => {
        if (tourProfileStep) return;
        setMenuOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full p-0">
          <UserAvatar
            name={usuario?.nome}
            email={usuario?.email ?? user?.email}
            photoUrl={photoUrl}
            size="sm"
          />
          <span className="sr-only">Menu do perfil</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{usuario?.email ?? user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`${routes.configuracoes}/perfil`}>
            <User className="h-4 w-4" />
            Informações pessoais
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={routes.configuracoes}>
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild data-tour="profile-whatsapp">
          <Link to={routes.whatsapp}>
            <MessageCircle className="h-4 w-4" />
            WhatsApps
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild data-tour="profile-meta-connect">
          <Link
            to={`${routes.configuracoes}/conectar-meta`}
            className="flex w-full items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <MetaLogoIcon className="h-4 w-auto" />
              Conectar Meta
            </span>
            <MetaConnectionIndicator connected={metaConnected} />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void signOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
