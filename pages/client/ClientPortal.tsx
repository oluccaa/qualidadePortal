import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClientLayout } from '../../components/layout/ClientLayout.tsx';
import ClientDashboard from '../dashboards/ClientDashboard.tsx';
import { PartnerLibraryView } from '../../components/features/partner/views/PartnerLibraryView.tsx';
import { QualityPortfolioView } from '../../components/features/quality/views/QualityPortfolioView.tsx';

const ClientPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'home';

  const handleViewChange = useCallback((viewId: string) => {
    setSearchParams(prev => {
      prev.set('view', viewId);
      if (viewId !== 'library') prev.delete('folderId');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const getPageTitle = () => {
    switch (activeView) {
      case 'home': return "Portal do Parceiro";
      case 'library': return "Biblioteca de Ativos";
      case 'audit_flow': return "Fluxo de Auditoria Ativo";
      default: return "Portal Vital";
    }
  };

  return (
    <ClientLayout 
      title={getPageTitle()} 
      activeView={activeView} 
      onViewChange={handleViewChange}
    >
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        {activeView === 'home' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             <ClientDashboard />
          </div>
        )}
        {activeView === 'library' && <PartnerLibraryView />}
        {activeView === 'audit_flow' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <QualityPortfolioView />
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientPortal;