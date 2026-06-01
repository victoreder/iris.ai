import { getSupabase } from "../_lib.js";
import { requireAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import {
  buildAvatarKey,
  buildS3PublicUrl,
  deleteFromS3,
  extensionFromMime,
  isS3Configured,
  uploadToS3,
} from "../_lib/s3Storage.js";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_EXTS = ["jpg", "png", "webp"];

async function clearLegacySupabaseAvatar(supabase, path) {
  if (!path || path.startsWith("http") || path.startsWith("avatars/")) return;
  await supabase.storage.from("avatars").remove([path]);
}

async function deleteUserAvatarsFromS3(userId) {
  for (const ext of AVATAR_EXTS) {
    try {
      await deleteFromS3(buildAvatarKey(userId, ext));
    } catch {
      // ignora se o objeto não existir
    }
  }
}

function isS3AvatarUrl(path) {
  return Boolean(path?.includes("/avatars/") || path?.startsWith("avatars/"));
}

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!isS3Configured()) {
    return res.status(503).json({ error: "Storage S3 não configurado no servidor." });
  }

  const supabase = getSupabase();
  const userId = auth.user.id;

  if (req.method === "DELETE") {
    try {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("foto_url")
        .eq("id", userId)
        .maybeSingle();

      const fotoUrl = usuario?.foto_url ?? null;

      if (isS3AvatarUrl(fotoUrl)) {
        await deleteUserAvatarsFromS3(userId);
      } else if (fotoUrl) {
        await clearLegacySupabaseAvatar(supabase, fotoUrl);
      }

      const { error } = await supabase.from("usuarios").update({ foto_url: null }).eq("id", userId);
      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("perfil/avatar DELETE:", err);
      return res.status(500).json({ error: err?.message ?? "Erro ao remover foto." });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { contentBase64, contentType } = req.body || {};
    const mime = String(contentType ?? "").trim().toLowerCase();

    if (!contentBase64 || typeof contentBase64 !== "string") {
      return res.status(400).json({ error: "Arquivo ausente." });
    }
    if (!ALLOWED_TYPES.has(mime)) {
      return res.status(400).json({ error: "Use JPG, PNG ou WebP." });
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: "A imagem deve ter no máximo 5 MB." });
    }

    const ext = extensionFromMime(mime, "jpg");
    const key = buildAvatarKey(userId, ext);

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("foto_url")
      .eq("id", userId)
      .maybeSingle();

    const previous = usuario?.foto_url ?? null;
    if (previous && previous !== key) {
      if (isS3AvatarUrl(previous)) {
        await deleteUserAvatarsFromS3(userId);
      } else {
        await clearLegacySupabaseAvatar(supabase, previous);
      }
    }

    await uploadToS3(key, buffer, mime);
    const publicUrl = buildS3PublicUrl(key);

    const { error } = await supabase.from("usuarios").update({ foto_url: publicUrl }).eq("id", userId);
    if (error) throw error;

    return res.status(200).json({
      success: true,
      key,
      publicUrl,
    });
  } catch (err) {
    console.error("perfil/avatar POST:", err);
    return res.status(500).json({ error: err?.message ?? "Erro ao enviar foto." });
  }
}
