interface Props {
  action: string;
}

export function AdminOnlyNotice({ action }: Props) {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      Somente administradores da conta podem {action}.
    </p>
  );
}
