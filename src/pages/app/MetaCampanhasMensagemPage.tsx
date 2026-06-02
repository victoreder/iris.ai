import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MetaCampanhasArvore } from "@/components/meta/MetaCampanhasArvore";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { useConta } from "@/contexts/ContaContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import type { MetaAdAccount, MetaMarketingCampaign } from "@/types/metaMarketing";

export function MetaCampanhasMensagemPage() {
  const { contaAtiva } = useConta();
  const routes = useAppRoutes();
  const { loading: metaLoading, connected } = useMetaConnectionStatus();
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [campaigns, setCampaigns] = useState<MetaMarketingCampaign[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAccounts = useCallback(async () => {
    if (!contaAtiva || !connected) return;
    setLoadingAccounts(true);
    try {
      const result = await apiGet<{ accounts: MetaAdAccount[] }>(
        "/api/leads/meta-contas-anuncio",
        {},
        contaAtiva.id
      );
      const list = result.accounts ?? [];
      setAccounts(list);
      setSelectedAccountId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar contas Meta.");
      setAccounts([]);
      setSelectedAccountId("");
    } finally {
      setLoadingAccounts(false);
    }
  }, [contaAtiva, connected]);

  const loadCampaigns = useCallback(async () => {
    if (!contaAtiva || !selectedAccountId) {
      setCampaigns([]);
      return;
    }
    setLoadingCampaigns(true);
    try {
      const result = await apiGet<{ campaigns: MetaMarketingCampaign[] }>(
        "/api/leads/meta-campanhas-mensagem",
        { adAccountId: selectedAccountId },
        contaAtiva.id
      );
      setCampaigns(result.campaigns ?? []);
      setExpanded(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar campanhas.");
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [contaAtiva, selectedAccountId]);

  useEffect(() => {
    if (!metaLoading && connected) void loadAccounts();
  }, [connected, loadAccounts, metaLoading]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (metaLoading || loadingAccounts) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!connected) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MetaLogoIcon className="h-4 w-auto" />
            Conecte a Meta
          </CardTitle>
          <CardDescription>
            Para ver campanhas de mensagem, conecte sua conta Meta primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={`${routes.configuracoes}/conectar-meta`}>Ir para Conectar Meta</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Nenhuma conta de anúncio</CardTitle>
          <CardDescription>
            Não encontramos contas de anúncio ativas com o token conectado. Verifique permissões no
            Meta Business ou reconecte a Meta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={`${routes.configuracoes}/conectar-meta`}>Reconectar Meta</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Campanhas ativas</CardTitle>
          <CardDescription>
            Campanhas, conjuntos de anúncios e anúncios ativos da conta de anúncio selecionada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length > 1 && (
            <div className="max-w-md space-y-1">
              <Label htmlFor="meta-ad-account">Conta de anúncio</Label>
              <Select
                id="meta-ad-account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.currency ? ` · ${account.currency}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {accounts.length === 1 && selectedAccount && (
            <p className="text-sm text-muted-foreground">
              Conta: <span className="font-medium text-foreground">{selectedAccount.name}</span>
            </p>
          )}

          {loadingCampaigns ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <MetaCampanhasArvore
              campaigns={campaigns}
              expanded={expanded}
              onToggle={toggleExpanded}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
