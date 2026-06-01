export function ViewerOnlyNotice() {
  return (
    <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
      Seu perfil é <strong>visualizador</strong>: você pode consultar dados, mas não criar, editar ou
      excluir.
    </p>
  );
}
