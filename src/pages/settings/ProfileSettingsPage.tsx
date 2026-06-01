import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { supabase } from "@/lib/supabase";
import { getAvatarPublicUrl } from "@/lib/storageUrls";
import { deleteProfileAvatar, uploadProfileAvatar } from "@/lib/profileApi";
import { extractPhoneDigits, formatPhoneBR } from "@/lib/leadsAnalytics";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const MIN_PASSWORD_LENGTH = 8;

function formatPhoneInput(value: string): string {
  const digits = extractPhoneDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function phoneToStorage(value: string): string | null {
  const digits = extractPhoneDigits(value);
  return digits || null;
}

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const { usuario, refreshUsuario } = useUsuario();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNome(usuario?.nome ?? "");
    setEmail(user?.email ?? usuario?.email ?? "");
    setTelefone(usuario?.telefone ? formatPhoneBR(usuario.telefone) : "");
  }, [usuario, user?.email]);

  const photoUrl = getAvatarPublicUrl(usuario?.foto_url);

  const handlePhotoChange = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      await uploadProfileAvatar(file);
      await refreshUsuario();
      toast.success("Foto atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !usuario?.foto_url) return;
    setUploadingPhoto(true);
    try {
      await deleteProfileAvatar();
      await refreshUsuario();
      toast.success("Foto removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const emailTrim = email.trim();
    const emailAtual = user.email ?? usuario?.email ?? "";
    const emailChanged = emailTrim.toLowerCase() !== emailAtual.toLowerCase();

    if (emailChanged && !emailTrim.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setSaving(true);
    try {
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: emailTrim });
        if (emailError) throw emailError;
      }

      const { error } = await supabase
        .from("usuarios")
        .update({
          nome: nome.trim() || null,
          telefone: phoneToStorage(telefone),
          ...(emailChanged ? { email: emailTrim } : {}),
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshUsuario();
      if (emailChanged) {
        toast.success("Perfil salvo. Confirme a alteração de e-mail nos links enviados.");
      } else {
        toast.success("Perfil atualizado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    if (!senhaAtual.trim()) {
      toast.error("Informe a senha atual.");
      return;
    }
    if (novaSenha.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("A confirmação não confere com a nova senha.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });
      if (signInError) throw new Error("Senha atual incorreta.");

      const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });
      if (updateError) throw updateError;

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      toast.success("Senha redefinida com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações pessoais</CardTitle>
        <CardDescription>Edite seu nome, e-mail, telefone e foto de perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="max-w-md space-y-6">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={usuario?.nome ?? nome}
                email={usuario?.email ?? user?.email}
                photoUrl={photoUrl}
                size="lg"
              />
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    void handlePhotoChange(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingPhoto}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {uploadingPhoto ? "Enviando…" : photoUrl ? "Alterar foto" : "Enviar foto"}
                </Button>
                {photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingPhoto}
                    onClick={() => void handleRemovePhoto()}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover foto
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ao alterar, enviamos confirmação para o e-mail novo e para o atual.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Altere a senha de acesso da sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input
                id="senha-atual"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Salvando…" : "Redefinir senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
