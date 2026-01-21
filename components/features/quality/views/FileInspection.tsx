import React from 'react';
import { Layout } from '../../../layout/MainLayout.tsx';
import { AuditWorkflow } from '../components/AuditWorkflow.tsx';
import { ProcessingOverlay, QualityLoadingState } from '../components/ViewStates.tsx';
import { useFileInspection } from '../hooks/useFileInspection.ts';
import { 
  AlertCircle, 
  Database, 
  ExternalLink, 
  FileText, 
  Terminal, 
  ClipboardList, 
  Users, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import { QualityStatus, UserRole, normalizeRole } from '../../../../types/index.ts';

/**
 * FileInspection View
 * O "Coração" do Portal da Qualidade. Onde o veredito técnico é proferido.
 */
export const FileInspection: React.FC = () => {
  const {
    inspectorFile, loadingFile, isProcessing,
    mainPreviewUrl, handleInspectAction, handleBackToClientFiles,
    user
  } = useFileInspection();

  const role = normalizeRole(user?.role);
  const isQuality = role === UserRole.QUALITY || role === UserRole.ADMIN;

  if (loadingFile) {
    return <QualityLoadingState message="Sincronizando protocolos de segurança..." />;
  }

  if (!inspectorFile) {
    return (
      <Layout title="Erro de Carga">
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 h-full bg-slate-50" role="alert">
          <AlertCircle size={48} className="opacity-20" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Ativo não localizado no Ledger</p>
          <button onClick={handleBackToClientFiles} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase">Voltar ao Painel</button>
        </div>
      </Layout>
    );
  }

  // Tematização Dinâmica: Diferencia visualmente o Auditor do Cliente
  const theme = {
    headerBg: isQuality ? 'bg-[#132659]' : 'bg-slate-100',
    headerText: isQuality ? 'text-white' : 'text-slate-900',
    headerBorder: isQuality ? 'border-white/10' : 'border-slate-200',
    asideBg: isQuality ? 'bg-slate-50/50' : 'bg-white',
    accentColor: isQuality ? 'text-blue-400' : 'text-emerald-600',
    accentBg: isQuality ? 'bg-blue-500/10' : 'bg-emerald-500/10'
  };

  const formatDateTime = (iso: string | undefined) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // Lógica para identificar quem é o humano responsável pelo lado do cliente
  const getOrganizationDisplay = () => {
      const org = inspectorFile.organizations;
      const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
      const baseName = orgName || user?.organizationName || 'N/A';
      
      const repName = inspectorFile.metadata?.signatures?.step6_consolidation_client?.userName || 
                     inspectorFile.metadata?.signatures?.step5_partner_verdict?.userName ||
                     inspectorFile.metadata?.signatures?.step2_documental?.userName ||
                     inspectorFile.metadata?.lastClientInteractionBy;

      return repName ? `${baseName} (Rep: ${repName})` : baseName;
  };

  const hashValue = inspectorFile.storagePath?.split('/').pop()?.substring(0, 12).toUpperCase() || 'N/A';

  // Progresso baseado nos 7 passos do protocolo Vital
  const calculateProgress = () => {
    const meta = inspectorFile.metadata;
    if (!meta) return 0;
    if (meta.status === QualityStatus.APPROVED) return 100;

    const sigs = meta.signatures || {};
    let points = 0;
    if (sigs.step1_release) points += 15;
    if (sigs.step2_documental) points += 15;
    if (sigs.step3_physical) points += 15;
    if (sigs.step4_arbitrage) points += 15;
    if (sigs.step5_partner_verdict) points += 15;
    if (sigs.step6_consolidation_client || sigs.step6_consolidation_quality) points += 15;
    if (meta.status === QualityStatus.APPROVED) points = 100;

    return Math.min(points, 100);
  };

  return (
    <Layout title={isQuality ? "Terminal de Auditoria" : "Central de Qualidade"}>
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-700">
        {isProcessing && <ProcessingOverlay message="Gravando Veredito no Ledger Vital..." />}

        {/* Header Técnico de Alto Impacto */}
        <header className={`px-10 py-6 ${theme.headerBg} ${theme.headerText} flex items-center justify-between shrink-0 border-b ${theme.headerBorder}`}>
          <div className="flex items-center gap-6">
            <div className={`p-3 rounded-2xl ${theme.accentBg} ${theme.accentColor} shadow-inner`}>
                {isQuality ? <Terminal size={24} /> : <ClipboardList size={24} />}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black uppercase tracking-tighter">
                {isQuality ? "Console Técnico de Auditoria" : "Status de Conformidade do Ativo"}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-50">
                {isQuality ? `Protocolo B2B • ID: ${inspectorFile.id.split('-')[0]}` : `Empresa: ${user?.organizationName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden xl:flex items-center gap-4 bg-black/10 px-5 py-2.5 rounded-2xl border border-white/5">
                <FileText size={18} className={theme.accentColor} />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Documento em análise</p>
                  <p className="text-xs font-bold truncate max-w-[200px] uppercase tracking-tight">{inspectorFile.name}</p>
                </div>
             </div>
             
             {mainPreviewUrl && (
                <button 
                  onClick={() => window.open(mainPreviewUrl!, '_blank')} 
                  className={`flex items-center gap-3 px-6 py-3 ${isQuality ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#132659] hover:bg-slate-800'} text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all shadow-xl active:scale-95`}
                >
                  <ExternalLink size={14} /> Abrir Laudo Original
                </button>
             )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar de Metadados e Partes Envolvidas */}
          <aside className={`w-80 border-r border-slate-100 ${theme.asideBg} hidden lg:flex flex-col shrink-0 p-8 space-y-10 overflow-y-auto custom-scrollbar`}>
            
            <section className="space-y-5">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[4px] flex items-center gap-2">
                    <Database size={14} /> Rastreabilidade
                </h3>
                <div className="space-y-4">
                    <TechnicalInfo label="ID de Cluster" value={inspectorFile.id.split('-')[0].toUpperCase()} />
                    <TechnicalInfo label="Versão do Ativo" value={`v${inspectorFile.versionNumber || 1}.0`} />
                    <TechnicalInfo label="Assinatura Hash" value={hashValue} isMono />
                </div>
            </section>

            <section className="space-y-5">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[4px] flex items-center gap-2">
                    <Users size={14} /> Partes Envolvidas
                </h3>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                    <TechnicalInfo 
                      label="Analista Responsável" 
                      value={inspectorFile.metadata?.signatures?.step1_release?.userName || 'Aguardando Início'} 
                    />
                    
                    <TechnicalInfo 
                      label="Entidade Cliente" 
                      value={getOrganizationDisplay()} 
                    />

                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-start gap-3">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Clock size={14}/></div>
                         <TechnicalInfo 
                            label="Data de Abertura" 
                            value={formatDateTime(inspectorFile.metadata?.signatures?.step1_release?.timestamp)} 
                         />
                      </div>
                    </div>
                </div>
            </section>

            <div className="pt-8 mt-auto flex flex-col items-center opacity-30">
              <ShieldCheck size={32} className="text-slate-400 mb-2" />
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[5px]">Vital Cloud Secure</p>
            </div>
          </aside>

          {/* Área Principal do Workflow */}
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <div className="max-w-4xl mx-auto p-12">
              <header className="mb-12 flex items-end justify-between border-b border-slate-200 pb-8">
                <div>
                  <h2 className="text-2xl font-black text-[#132659] uppercase tracking-tight">
                    {isQuality ? "Fluxo de Auditoria Técnica" : "Painel de Conformidade de Lote"}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 mt-2">
                    {isQuality 
                      ? "Certifique-se de validar todos os requisitos metalúrgicos antes de assinar." 
                      : "Acompanhe a validação técnica dos seus certificados em tempo real."}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-4xl font-black font-mono tracking-tighter ${isQuality ? 'text-blue-600' : 'text-emerald-600'}`}>
                    {calculateProgress()}%
                  </span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">Status do Lote</p>
                </div>
              </header>

              <AuditWorkflow 
                metadata={inspectorFile.metadata} 
                userRole={user?.role as UserRole} 
                userName={user?.name || ''}
                userEmail={user?.email || ''}
                fileId={inspectorFile.id}
                onUpdate={async (updates) => {
                    await handleInspectAction(updates);
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
};

const TechnicalInfo = ({ label, value, isMono = false }: { label: string; value: string; isMono?: boolean }) => (
  <div className="flex flex-col gap-1 overflow-hidden">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`text-[13px] font-bold text-slate-700 uppercase tracking-tight truncate ${isMono ? 'font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block w-fit' : ''}`}>
      {value}
    </span>
  </div>
);