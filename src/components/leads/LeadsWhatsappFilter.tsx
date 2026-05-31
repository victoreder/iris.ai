import { Select } from "@/components/ui/input";
import { useLeadsInstancias } from "@/hooks/useLeadsInstancias";

interface Props {
  value: string;
  onChange: (v: string) => void;
  includeAll?: boolean;
  className?: string;
}

export function LeadsWhatsappFilter({
  value,
  onChange,
  includeAll = true,
  className,
}: Props) {
  const { instancias, loading } = useLeadsInstancias(true);

  return (
    <Select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      {includeAll && <option value="all">Todos os WhatsApps</option>}
      {instancias.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nome}
          {i.telefone ? ` (${i.telefone})` : ""}
        </option>
      ))}
    </Select>
  );
}
