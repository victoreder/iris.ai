import { Link } from "react-router-dom";
import { LogOut, MessageCircle, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { APP_ROUTES } from "@/lib/appNavigation";
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

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { usuario } = useUsuario();

  const photoUrl = getAvatarPublicUrl(usuario?.foto_url);
  const displayName = usuario?.nome ?? user?.email ?? "Usuário";

  return (
    <DropdownMenu>
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
          <Link to={`${APP_ROUTES.configuracoes}/perfil`}>
            <User className="h-4 w-4" />
            Informações pessoais
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={APP_ROUTES.configuracoes}>
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={APP_ROUTES.whatsapp}>
            <MessageCircle className="h-4 w-4" />
            WhatsApps
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
