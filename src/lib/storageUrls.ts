import { supabase } from "@/lib/supabase";

function getS3PublicBase(): string {
  return (import.meta.env.VITE_S3_PUBLIC_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";
}

export function getAvatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  if (path.startsWith("avatars/")) {
    const base = getS3PublicBase();
    if (base) return `${base}/${path}`;
  }
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function getFeedbackSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("feedback").createSignedUrl(path, 3600);
  if (error) {
    console.error(error);
    return null;
  }
  return data.signedUrl;
}

export function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
