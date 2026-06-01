import type { ContaPapel } from "@/types/database";

/** Admin ou membro — criar e editar (não excluir). */
export function canWriteConta(papel: ContaPapel | null): boolean {
  return papel === "admin" || papel === "membro";
}

/** Somente admin — excluir recursos da conta. */
export function canDeleteConta(papel: ContaPapel | null): boolean {
  return papel === "admin";
}

export function isViewerConta(papel: ContaPapel | null): boolean {
  return papel === "visualizador";
}
