import { apiDeleteAuth, apiPostAuth } from "@/lib/api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Erro ao ler arquivo."));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileAvatar(file: File): Promise<void> {
  const contentBase64 = await fileToBase64(file);
  await apiPostAuth<{ key: string; publicUrl: string }>("/api/perfil/avatar", {
    contentBase64,
    contentType: file.type,
  });
}

export async function deleteProfileAvatar(): Promise<void> {
  await apiDeleteAuth<{ success: boolean }>("/api/perfil/avatar");
}
