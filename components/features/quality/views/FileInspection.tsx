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
  ShieldCheck,
  History,
  Lock,
  Fingerprint
} from 'lucide-react';
import { QualityStatus, UserRole, normalizeRole } from '../../../../types/index.ts';

export const FileInspection: React.FC = () => {
  const {
    inspectorFile, loadingFile, isProcessing,
    mainPreviewUrl, handleInspectAction, handleBackToClientFiles,
    user, handleReplacementUpload
  } = useFileInspection();

  const role = normalizeRole(user?.role);
  const isQuality = role === UserRole.QUALITY || role === UserRole.ADMIN;

  if (loadingFile) {
    return <QualityLoadingState message="Sincronizando Ledger..." />;
  }

  if (!inspectorFile) {
    return (
      <Layout title="Erro de Carga">
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 h-full" role="alert">
          <AlertCircle size={40} className="opacity-20" />
          <p className="font-black uppercase tracking-widest text-[9px]">Ativo não localizado</p>
          <button onClick={handleBackToClientFiles} className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold text-[9px] uppercase">Voltar</button>
        </div>
      </Layout>
    );
  }

  const theme = {
    headerBg: isQuality ? 'bg-[#132659]' : 'bg-slate-100',
    headerText: isQuality ? 'text-white' : 'text-slate-900',
    headerBorder: isQuality ? 'border-white/10' : 'border-slate-200',
    asideBg: isQuality ? 'bg-slate-50/50' : 'bg-white',
    accentColor: isQuality ? 'text-blue-400' : 'text-emerald-600',
    accentBg: isQuality ? 'bg-blue-500/10' : 'bg-emerald-500/10'
  };

  const hashValue = inspectorFile.storagePath?.split('/').pop()?.substring(0, 10).toUpperCase() || 'N/A';

  return (
    <Layout title={isQuality ? "Inspeção Técnica" : "Conformidade"}>
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl animate-in fade-in duration-500">
        {isProcessing && <ProcessingOverlay message="Sincronizando Ledger..." />}

        <header className={`px-8 py-4 ${theme.headerBg} ${theme.headerText} flex items-center justify-between shrink-0 border-b ${theme.headerBorder}`}>
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${theme.accentBg} ${theme.accentColor}`}>
                {isQuality ? <Terminal size={18} /> : <ClipboardList size={18} />}
            </div>
            <div className="space-y-0.5">
              <h1 className="text-base font-black uppercase tracking-tight">
                {isQuality ? "Console de Auditoria" : "Status do Ativo"}
              </h1>
              <p className="text-[8px] font-black uppercase tracking-[3px] opacity-50">
                Cluster ID: {inspectorFile.id.split('-')[0].toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden xl:flex items-center gap-3 bg-black/5 px-4 py-2 rounded-xl">
                <FileText size={16} className={theme.accentColor} />
                <p className="text-[10px] font-bold truncate max-w-[150px] uppercase tracking-tight">{inspectorFile.name}</p>
             </div>
             {mainPreviewUrl && (
                <button onClick={() => window.open(mainPreviewUrl!, '_blank')} className={`flex items-center gap-2 px-4 py-2 ${isQuality ? 'bg-blue-600' : 'bg-[#132659]'} text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md`}>
                  <ExternalLink size={12} /> Abrir Laudo
                </button>
             )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className={`w-64 border-r border-slate-100 ${theme.asideBg} hidden lg:flex flex-col shrink-0 p-6 space-y-8 overflow-y-auto custom-scrollbar`}>
            
            <section className="space-y-4">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] flex items-center gap-2">
                    <Database size={12} /> Ledger Info
                </h3>
                <div className="space-y-3">
                    <TechnicalInfo label="Versão" value={`v${inspectorFile.versionNumber || 1}.0`} />
                    <TechnicalInfo label="Hash" value={hashValue} isMono />
                </div>
            </section>

            {inspectorFile.metadata?.versionHistory && inspectorFile.metadata.versionHistory.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] flex items-center gap-2">
                        <History size={12} /> Histórico
                    </h3>
                    <div className="space-y-1.5">
                        {inspectorFile.metadata.versionHistory.map((v: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white border border-slate-100 rounded-lg flex items-center justify-between text-[9px] font-bold">
                                <span className="text-slate-600">v{v.version}.0</span>
                                <span className="text-slate-300 font-mono">{new Date(v.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="pt-6 mt-auto flex flex-col items-center opacity-20">
              <ShieldCheck size={24} className="text-slate-400 mb-1" />
              <p className="text-[7px] font-black uppercase tracking-[4px]">Vital Secure v4.0</p>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20">
            <div className="max-w-3xl mx-auto p-8">
              <header className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-[#132659] uppercase tracking-tight">Progresso da Auditoria</h2>
                <div className="text-right">
                  <span className={`text-2xl font-black font-mono ${isQuality ? 'text-blue-600' : 'text-emerald-600'}`}>
                    {metadataToProgress(inspectorFile.metadata)}%
                  </span>
                </div>
              </header>

              <AuditWorkflow 
                metadata={inspectorFile.metadata} 
                userRole={user?.role as UserRole} 
                userName={user?.name || ''}
                userEmail={user?.email || ''}
                fileId={inspectorFile.id}
                onUpdate={handleInspectAction}
                onUploadReplacement={handleReplacementUpload}
              />

              {isQuality && (
                <section className="mt-12 pt-8 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <Fingerprint size={20} className="text-slate-900" />
                        <h3 className="text-sm font-black text-slate-900 uppercase">Rastreabilidade Forense</h3>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse text-[10px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 font-black text-slate-400 uppercase">Ação</th>
                                    <th className="px-4 py-2 font-black text-slate-400 uppercase text-center">Timestamp</th>
                                    <th className="px-4 py-2 font-black text-slate-400 uppercase text-right">Origem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(inspectorFile.metadata?.signatures || {}).map(([key, sig]: [string, any]) => (
                                    <tr key={key} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-bold text-slate-700">{key.replace('step', 'P').replace(/_/g, ' ')} • {sig.userName}</td>
                                        <td className="px-4 py-3 text-center text-slate-400 font-mono">{new Date(sig.timestamp).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right text-slate-300 font-mono">{sig.ip || '0.0.0.0'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
};

const metadataToProgress = (meta: any) => {
    if (!meta) return 0;
    if (meta.status === QualityStatus.APPROVED) return 100;
    const sigs = meta.signatures || {};
    let pts = 0;
    if (sigs.step1_release) pts += 15;
    if (sigs.step2_documental) pts += 15;
    if (sigs.step3_physical) pts += 15;
    if (sigs.step4_arbitrage) pts += 15;
    if (sigs.step5_partner_verdict) pts += 15;
    if (sigs.step6_consolidation_client || sigs.step6_consolidation_quality) pts += 15;
    return Math.min(pts, 100);
};

const TechnicalInfo = ({ label, value, isMono = false }: any) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`text-[11px] font-bold text-slate-600 truncate ${isMono ? 'font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block w-fit' : ''}`}>
      {value}
    </span>
  </div>
);