import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ContaProvider } from "@/contexts/ContaContext";
import { ProductTourProvider } from "@/contexts/ProductTourContext";
import { UsuarioProvider } from "@/contexts/UsuarioContext";
import { AppLayout } from "@/layouts/AppLayout";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { SysLayout } from "@/layouts/SysLayout";
import { AppAccessGuard, AppLayoutGuard } from "@/components/AppAccessGuard";
import { EnvSetupScreen } from "@/components/EnvSetupScreen";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LoginPage } from "@/pages/auth/LoginPage";
import { InviteAcceptPage } from "@/pages/auth/InviteAcceptPage";
import { SignUpPage } from "@/pages/auth/SignUpPage";
import { LeadRedirect } from "@/pages/LeadRedirect";
import { QrConnectPage } from "@/pages/QrConnectPage";
import { OverviewPage } from "@/pages/app/OverviewPage";
import { InboxPage } from "@/pages/app/InboxPage";
import { LeadDetailPage } from "@/pages/app/LeadDetailPage";
import { CampaignsPage } from "@/pages/app/CampaignsPage";
import { PipelinePage } from "@/pages/app/PipelinePage";
import { ChannelsPage } from "@/pages/app/ChannelsPage";
import { IntegrationsPage } from "@/pages/app/IntegrationsPage";
import { ActivityPage } from "@/pages/app/ActivityPage";
import { ProfileSettingsPage } from "@/pages/settings/ProfileSettingsPage";
import { AccountSettingsPage } from "@/pages/settings/AccountSettingsPage";
import { TeamSettingsPage } from "@/pages/settings/TeamSettingsPage";
import { BillingSettingsPage } from "@/pages/settings/BillingSettingsPage";
import { SysDashboardPage } from "@/pages/sys/SysDashboardPage";
import { SysContasPage } from "@/pages/sys/SysContasPage";
import { SysPlansPage } from "@/pages/sys/SysPlansPage";
import { SysLogsPage } from "@/pages/sys/SysLogsPage";
import { SysFeedbackPage } from "@/pages/sys/SysFeedbackPage";
import { SysUsuariosPage } from "@/pages/sys/SysUsuariosPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { ImpersonateBanner } from "@/components/ImpersonateBanner";
import { AppLegacyRedirect, AppRootRedirect } from "@/components/AppLegacyRedirect";
import { ContaUrlSync } from "@/components/ContaUrlSync";
import { LegalLayout } from "@/layouts/LegalLayout";
import { PoliticaPrivacidadePage } from "@/pages/legal/PoliticaPrivacidadePage";
import { TermosDeUsoPage } from "@/pages/legal/TermosDeUsoPage";

function SysLegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = `${pathname.replace(/^\/sys(?=\/|$)/, "/admin")}${search}${hash}`;
  return <Navigate to={target} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <EnvSetupScreen />;
  }

  return (
    <AuthProvider>
      <UsuarioProvider>
        <ContaProvider>
          <ProductTourProvider>
          <Routes>
            <Route path="/l/:slug" element={<LeadRedirect />} />
            <Route path="/q/:token" element={<QrConnectPage />} />
            <Route element={<LegalLayout />}>
              <Route path="/termos-de-uso" element={<TermosDeUsoPage />} />
              <Route path="/politica-de-privacidade" element={<PoliticaPrivacidadePage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/convite" element={<InviteAcceptPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppAccessGuard>
                    <Outlet />
                  </AppAccessGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<AppRootRedirect />} />
              {/* Rotas legadas sem ID de conta */}
              <Route path="dashboard" element={<AppLegacyRedirect />} />
              <Route path="leads" element={<AppLegacyRedirect />} />
              <Route path="leads/:leadId" element={<AppLegacyRedirect />} />
              <Route path="campanhas" element={<AppLegacyRedirect />} />
              <Route path="jornada" element={<AppLegacyRedirect />} />
              <Route path="atividade" element={<AppLegacyRedirect />} />
              <Route path="whatsapp" element={<AppLegacyRedirect />} />
              <Route path="configuracoes/*" element={<AppLegacyRedirect />} />
              <Route path="inbox" element={<AppLegacyRedirect />} />
              <Route path="campaigns" element={<AppLegacyRedirect />} />
              <Route path="pipeline" element={<AppLegacyRedirect />} />
              <Route path="channels" element={<AppLegacyRedirect />} />
              <Route path="integrations" element={<AppLegacyRedirect />} />
              <Route path="activity" element={<AppLegacyRedirect />} />
              <Route path="settings/*" element={<AppLegacyRedirect />} />
              <Route
                path=":contaId"
                element={
                  <>
                    <ContaUrlSync />
                    <AppLayoutGuard />
                  </>
                }
              >
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<OverviewPage />} />
                  <Route path="leads" element={<InboxPage />} />
                  <Route path="leads/:leadId" element={<LeadDetailPage />} />
                  <Route path="campanhas" element={<CampaignsPage />} />
                  <Route path="jornada" element={<PipelinePage />} />
                  <Route path="atividade" element={<ActivityPage />} />
                  <Route path="whatsapp" element={<ChannelsPage />} />
                  <Route path="configuracoes" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="perfil" replace />} />
                    <Route path="perfil" element={<ProfileSettingsPage />} />
                    <Route path="conta" element={<AccountSettingsPage />} />
                    <Route path="equipe" element={<TeamSettingsPage />} />
                    <Route path="plano" element={<BillingSettingsPage />} />
                    <Route path="integracoes" element={<IntegrationsPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route path="/sys/*" element={<SysLegacyRedirect />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AppAccessGuard>
                    <SysLayout />
                  </AppAccessGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<SysDashboardPage />} />
              <Route path="contas" element={<SysContasPage />} />
              <Route path="usuarios" element={<SysUsuariosPage />} />
              <Route path="clients" element={<Navigate to="/admin/contas" replace />} />
              <Route path="plans" element={<SysPlansPage />} />
              <Route path="feedback" element={<SysFeedbackPage />} />
              <Route path="logs" element={<SysLogsPage />} />
            </Route>
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <AppAccessGuard>
                    <OnboardingPage />
                  </AppAccessGuard>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<div className="p-8 text-center">Página não encontrada</div>} />
          </Routes>
          <Toaster position="top-right" richColors />
          <ImpersonateBanner />
          </ProductTourProvider>
        </ContaProvider>
      </UsuarioProvider>
    </AuthProvider>
  );
}
