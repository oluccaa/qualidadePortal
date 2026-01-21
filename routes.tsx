import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';

import { AuthMiddleware } from './middlewares/AuthMiddleware.tsx';
import { RoleMiddleware } from './middlewares/RoleMiddleware.tsx';
import { MaintenanceMiddleware } from './middlewares/MaintenanceMiddleware.tsx';
import { useAuth } from './context/authContext.tsx';
import { UserRole, normalizeRole } from './types/index.ts';

/**
 * --- ESTRUTURA DE PÁGINAS ORGANIZADA POR DOMÍNIO ---
 * Cada role possui sua própria subpasta em /pages/
 */

// Autenticação (Acesso Público/Gateway)
const ClientLoginPage = React.lazy(() => import('./pages/auth/ClientLoginPage.tsx'));
const StaffLoginPage = React.lazy(() => import('./pages/auth/StaffLoginPage.tsx'));

// Domínio Administrador (Governança e Infra)
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard.tsx'));
const AdminConsole = React.lazy(() => import('./pages/admin/AdminConsole.tsx'));

// Domínio Qualidade (Operação Técnica e Auditoria)
const QualityDashboard = React.lazy(() => import('./pages/quality/QualityDashboard.tsx'));
const QualityMonitor = React.lazy(() => import('./pages/quality/QualityMonitor.tsx'));
const QualityPortfolio = React.lazy(() => import('./pages/quality/QualityPortfolio.tsx'));
const QualityAuditHistory = React.lazy(() => import('./pages/quality/QualityAuditHistory.tsx'));
const QualityUserManagement = React.lazy(() => import('./pages/quality/QualityUserManagement.tsx'));
const QualityExplorer = React.lazy(() => import('./pages/quality/QualityExplorer.tsx'));
const FileInspection = React.lazy(() => import('./components/features/quality/views/FileInspection.tsx').then(m => ({ default: m.FileInspection })));

// Domínio Cliente (Portal do Parceiro e Ativos B2B)
const ClientPortal = React.lazy(() => import('./pages/client/ClientPortal.tsx'));

// Domínio Compartilhado (Utilitários Globais)
const FilePreviewPage = React.lazy(() => import('./pages/shared/FilePreviewPage.tsx'));
const SettingsPage = React.lazy(() => import('./pages/shared/SettingsPage.tsx'));
const NotFoundPage = React.lazy(() => import('./pages/shared/NotFoundPage.tsx'));

const PageLoader = ({ message = "Sincronizando...", onRetry }: { message?: string; onRetry?: () => void }) => (
  <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 font-sans">
      <div className="relative mb-8">
        <Loader2 size={48} className="animate-spin text-blue-600" />
        <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full animate-pulse" />
      </div>
      <p className="text-[10px] font-black text-slate-400 tracking-[6px] uppercase animate-pulse mb-4 text-center px-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-[#132659] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      )}
  </div>
);

const InitialAuthRedirect = () => {
    const { user, isLoading, error, isInitialSyncComplete, retryInitialSync } = useAuth();
    if (isLoading || !isInitialSyncComplete) return <PageLoader message="Validando Protocolos" />;
    if (error) return <PageLoader message="Falha na Sincronização" onRetry={retryInitialSync} />;
    if (user) {
        const role = normalizeRole(user.role);
        if (role === UserRole.ADMIN) return <Navigate to="/admin/dashboard" replace />;
        if (role === UserRole.QUALITY) return <Navigate to="/quality/dashboard" replace />;
        if (role === UserRole.CLIENT) return <Navigate to="/client/portal" replace />;
    }
    return <Navigate to="/login" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader message="Preparando Interface Vital..." />}>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<InitialAuthRedirect />} />
        <Route path="/login" element={<ClientLoginPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />

        {/* Rotas Protegidas com Middleware de Manutenção e Auth */}
        <Route element={<MaintenanceMiddleware />}> 
            <Route element={<AuthMiddleware />}>
                
                {/* Acessos Globais */}
                <Route path="/settings" element={<SettingsPage />} /> 
                <Route path="/preview/:fileId" element={<FilePreviewPage />} />
                
                {/* Fluxo de Inspeção Compartilhado (Audit Flow) */}
                <Route element={<RoleMiddleware allowedRoles={[UserRole.QUALITY, UserRole.CLIENT]} />}>
                    <Route path="/quality/inspection/:fileId" element={<FileInspection />} />
                </Route>

                {/* --- EXCLUSIVO ADMINISTRADOR --- */}
                <Route element={<RoleMiddleware allowedRoles={[UserRole.ADMIN]} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/console" element={<AdminConsole />} /> 
                </Route>

                {/* --- EXCLUSIVO QUALIDADE E ADMIN --- */}
                <Route element={<RoleMiddleware allowedRoles={[UserRole.QUALITY]} />}>
                    <Route path="/quality/dashboard" element={<QualityDashboard />} />
                    <Route path="/quality/monitor" element={<QualityMonitor />} />
                    <Route path="/quality/portfolio" element={<QualityPortfolio />} />
                    <Route path="/quality/users" element={<QualityUserManagement />} />
                    <Route path="/quality/explorer" element={<QualityExplorer />} />
                    <Route path="/quality/audit" element={<QualityAuditHistory />} />
                </Route>

                {/* --- EXCLUSIVO CLIENTE (PARCEIRO) --- */}
                <Route element={<RoleMiddleware allowedRoles={[UserRole.CLIENT]} />}>
                    <Route path="/client/portal" element={<ClientPortal />} />
                </Route>
            </Route>
        </Route>

        {/* Fallback de Erro */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};