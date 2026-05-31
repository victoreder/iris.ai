import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { supabase } from "@/lib/supabase";
import { getAvatarPublicUrl } from "@/lib/storageUrls";
import { uploadAvatar } from "@/lib/submitFeedback";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const { usuario, refreshUsuario } = useUsuario();
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNome(usuario?.nome ?? "");
  }, [usuario]);

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
      const path = await uploadAvatar(user.id, file);
      const { error } = await supabase.from("usuarios").update({ foto_url: path }).eq("id", user.id);
      if (error) throw error;
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
      await supabase.storage.from("avatars").remove([usuario.foto_url]);
      const { error } = await supabase.from("usuarios").update({ foto_url: null }).eq("id", user.id);
      if (error) throw error;
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
    setSaving(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ nome: nome.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      await refreshUsuario();
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações pessoais</CardTitle>
        <CardDescription>Edite seu nome e foto de perfil.</CardDescription>
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
                accept="image/*"
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
              <p className="text-xs text-muted-foreground">PNG ou JPG, até 5 MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={usuario?.email ?? user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
