import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, User, Key, MessageSquare, 
  ClipboardCheck, Activity, Clock, ShieldCheck, ShieldAlert, Mail, PenTool, X, Plus,
  FileText, ArrowRight, ExternalLink
} from 'lucide-react';
import { SteelBatchMetadata, QualityStatus, UserRole, AuditSignature } from '../../../../types/index.ts';
import { useToast } from '../../../../context/notificationContext.tsx';

interface AuditWorkflowProps {
  metadata: SteelBatchMetadata | undefined;
  userRole: UserRole;
  userName: string;
  userEmail: string;
  fileId: string;
  onUpdate: (updatedMetadata: Partial<SteelBatchMetadata>) => Promise<void>;
  onUploadReplacement?: () => void;
}

export const AuditWorkflow: React.FC<AuditWorkflowProps> = ({ 
    metadata, userRole, userName, userEmail, fileId, onUpdate 
}) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTimeSP, setCurrentTimeSP] = useState('');
  
  const [isRejectingStep2, setIsRejectingStep2] = useState(false);
  const [step2Notes, setStep2Notes] = useState('');
  const [isRejectingStep3, setIsRejectingStep3] = useState(false);
  const [step3Notes, setStep3Notes] = useState('');

  const currentStep = metadata?.currentStep || 1;
  const isAnalyst = userRole === UserRole.QUALITY || userRole === UserRole.ADMIN;
  const isClient = userRole === UserRole.CLIENT;
  const hasDrawings = !!metadata?.documentalDrawings && metadata.documentalDrawings !== '{}';

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeSP(new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo'
      }).format(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const createSignature = (action: string): AuditSignature => ({
    userId: 'system_protocol',
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    timestamp: new Date().toISOString(),
    action: action
  });

  const handleAction = async (step: number, status: 'APPROVED' | 'REJECTED', stepUpdates: Partial<SteelBatchMetadata>) => {
    setIsSyncing(true);
    try {
      const sigMap: Record<number, keyof SteelBatchMetadata['signatures']> = {
        1: 'step1_release', 2: 'step2_documental', 3: 'step3_physical',
        4: 'step4_contestation', 5: 'step5_mediation_review',
        6: 'step6_system_log', 7: 'step7_final_verdict'
      };

      const sigKey = sigMap[step];
      let nextStep = currentStep;
      let nextGlobalStatus = metadata?.status || QualityStatus.PENDING;

      if (step === 1) {
        if (status === 'APPROVED') {
          nextStep = 2;
          nextGlobalStatus = QualityStatus.SENT;
        }
      } else if (step === 2 || step === 3) {
        const isDocCompleted = step === 2 || !!metadata?.signatures?.step2_documental;
        const isPhysCompleted = step === 3 || !!metadata?.signatures?.step3_physical;
        const isStep2Rejected = (step === 2 && status === 'REJECTED') || metadata?.documentalStatus === 'REJECTED';
        const isStep3Rejected = (step === 3 && status === 'REJECTED') || metadata?.physicalStatus === 'REJECTED';
        const hasAnyRejection = isStep2Rejected || isStep3Rejected;
        if (isDocCompleted && isPhysCompleted) nextStep = hasAnyRejection ? 4 : 6;
        else nextStep = 2;
      } else if (step === 4) nextStep = 5;
      else if (step === 5) {
        if (status === 'APPROVED') nextStep = 6;
        else { nextGlobalStatus = QualityStatus.REJECTED; nextStep = 7; }
      } else if (step === 6) { nextStep = 7; nextGlobalStatus = QualityStatus.APPROVED; }

      const newSignatures = { ...metadata?.signatures, [sigKey]: createSignature(`${status}_STEP_${step}`) };
      await onUpdate({ ...stepUpdates, currentStep: nextStep, signatures: newSignatures as any, status: nextGlobalStatus });
      showToast(`Protocolo assinado com sucesso no Ledger.`, "success");
      if (step === 2) setIsRejectingStep2(false);
      if (step === 3) setIsRejectingStep3(false);
    } catch (e) { showToast("Erro ao sincronizar assinatura.", "error"); } finally { setIsSyncing(false); }
  };

  const SignaturePreviewSeal = () => (
    <div className="mt-4 flex items-start gap-4 p-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-[1.2rem]">
        <PenTool size={16} className="text-blue-500 mt-1 opacity-60" />
        <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[2px]">AGUARDANDO ASSINATURA DIGITAL:</p>
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{userName} • {userEmail}</p>
            <p className="text-[10px] font-mono text-slate-400">Timestamp SP: {currentTimeSP}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
        <StepCard step={1} title="1. Liberação Vital (SGQ)" desc="Autorização técnica para início da conferência externa." active={currentStep === 1} completed={currentStep > 1} signature={metadata?.signatures?.step1_release}>
          {isAnalyst && currentStep === 1 && (
            <div className="space-y-4">
                <button disabled={isSyncing} onClick={() => handleAction(1, 'APPROVED', {})} className="w-full px-6 py-4 bg-[#132659] text-white rounded-2xl font-bold text-[10px] uppercase tracking-[3px] shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                  {isSyncing ? <Activity className="animate-spin" size={16}/> : <><Key size={16} className="text-blue-400" /> Liberar e Assinar</>}
                </button>
                <SignaturePreviewSeal />
            </div>
          )}
        </StepCard>

        <div className={`p-10 rounded-[2.5rem] border-2 transition-all duration-500 relative bg-white shadow-sm ${currentStep === 2 ? 'border-blue-200' : 'border-slate-100 opacity-60'}`}>
          <div className="flex items-start gap-8">
            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 border-4 transition-all duration-700 shadow-xl ${!!metadata?.signatures?.step2_documental ? 'bg-emerald-500 border-white text-white' : 'bg-[#132659] border-white text-white'}`}>
              {!!metadata?.signatures?.step2_documental ? <Check size={28} strokeWidth={4} /> : <span className="font-black text-xl">2</span>}
            </div>
            <div className="flex-1 space-y-6">
              <header>
                <h3 className="text-xl font-bold text-[#132659] uppercase tracking-tight">2. CONFERÊNCIA DE DADOS</h3>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Validação das propriedades técnicas e dimensionais do aço.</p>
              </header>
              <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-[2rem] flex items-center justify-between gap-6 group hover:bg-blue-50/60 transition-all">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                   </div>
                   <div>
                      <p className="text-[11px] font-bold text-blue-900 uppercase tracking-[2px]">DOCUMENTO ORIGINAL</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Clique para conferir e anotar</p>
                   </div>
                </div>
                <button disabled={isAnalyst && !hasDrawings} onClick={() => navigate(`/preview/${fileId}?mode=audit`)} className={`px-8 py-3.5 border rounded-2xl text-[11px] font-bold uppercase tracking-[2px] transition-all shadow-sm flex items-center gap-3 active:scale-95 ${isAnalyst && !hasDrawings ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white'}`}>
                  {isAnalyst ? "REVISAR ANOTAÇÕES" : "CONFERIR E ANOTAR"} <ArrowRight size={16} />
                </button>
              </div>
              {isAnalyst && !hasDrawings && !metadata?.signatures?.step2_documental && (
                <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl w-fit animate-pulse">
                   <Clock size={16} className="text-slate-400" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Aguardando conferência documental</span>
                </div>
              )}
              {isClient && currentStep === 2 && !metadata?.signatures?.step2_documental && !isRejectingStep2 && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button onClick={() => handleAction(2, 'APPROVED', { documentalStatus: 'APPROVED' })} className="py-4 bg-[#00875A] hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-[3px] shadow-xl active:scale-95 transition-all">APROVAR DADOS</button>
                  <button onClick={() => setIsRejectingStep2(true)} className="py-4 bg-[#E22E2E] hover:bg-red-700 text-white rounded-2xl font-bold text-xs uppercase tracking-[3px] shadow-xl active:scale-95 transition-all">DIVERGÊNCIA</button>
                </div>
              )}
              {isRejectingStep2 && (
                <div className="bg-red-50 p-8 rounded-[2rem] border-2 border-red-100 space-y-6 animate-in zoom-in-95">
                    <header className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-red-600 uppercase tracking-[4px]">Relatar Divergência Técnica</h4>
                        <button onClick={() => setIsRejectingStep2(false)} className="text-red-400 hover:text-red-600"><X size={20}/></button>
                    </header>
                    <textarea className="w-full p-5 bg-white border border-red-200 rounded-2xl text-sm min-h-[120px] outline-none focus:border-red-500 transition-all font-medium" placeholder="Descreva as inconformidades identificadas nos dados técnicos..." value={step2Notes} onChange={e => setStep2Notes(e.target.value)} />
                    <button disabled={isSyncing || !step2Notes.trim()} onClick={() => handleAction(2, 'REJECTED', { documentalStatus: 'REJECTED', documentalNotes: step2Notes })} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-[3px] shadow-lg active:scale-95">ASSINAR REJEIÇÃO E ENVIAR</button>
                </div>
              )}
              {((isClient && currentStep === 2 && !metadata?.signatures?.step2_documental) || !!metadata?.signatures?.step2_documental) && (
                <div className={`mt-6 p-6 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] transition-all ${!!metadata?.signatures?.step2_documental ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="flex items-start gap-4">
                        <PenTool size={18} className={`${!!metadata?.signatures?.step2_documental ? 'text-emerald-500' : 'text-blue-500'} mt-1`} />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">{!!metadata?.signatures?.step2_documental ? 'DOCUMENTO AUTENTICADO:' : 'AGUARDANDO ASSINATURA DIGITAL:'}</p>
                            {!!metadata?.signatures?.step2_documental ? (
                                <>
                                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{metadata.signatures.step2_documental.userName} • {metadata.signatures.step2_documental.userEmail}</p>
                                    <p className="text-[11px] font-mono text-slate-400 uppercase">Timestamp SP: {new Date(metadata.signatures.step2_documental.timestamp).toLocaleString('pt-BR')}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">{userName} • {userEmail}</p>
                                    <p className="text-[11px] font-mono text-slate-400 uppercase">Timestamp SP: {currentTimeSP}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <StepCard step={3} title="3. Vistoria de Carga" desc="Inspeção física do material e etiquetas no recebimento." active={currentStep === 2 && !metadata?.signatures?.step3_physical} completed={!!metadata?.signatures?.step3_physical} signature={metadata?.signatures?.step3_physical}>
          {isClient && currentStep === 2 && !metadata?.signatures?.step3_physical && (
            <div className="space-y-4">
               {!isRejectingStep3 ? (
                  <div className="flex gap-4">
                        <button onClick={() => handleAction(3, 'APPROVED', { physicalStatus: 'APPROVED' })} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95">CARGA OK</button>
                        <button onClick={() => setIsRejectingStep3(true)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95">REPORTAR AVARIA</button>
                  </div>
               ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-red-200 space-y-4">
                      <textarea className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs min-h-[100px] outline-none" placeholder="Descreva os danos físicos identificados..." value={step3Notes} onChange={e => setStep3Notes(e.target.value)} />
                      <button disabled={isSyncing || !step3Notes.trim()} onClick={() => handleAction(3, 'REJECTED', { physicalStatus: 'REJECTED', physicalNotes: step3Notes })} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase shadow-lg">ASSINAR AVARIA</button>
                  </div>
               )}
               <SignaturePreviewSeal />
            </div>
          )}
        </StepCard>
        <StepCard step={4} title="4. Arbitragem Técnica" desc="Análise Vital sobre divergências apontadas." active={currentStep === 4} completed={currentStep > 4} signature={metadata?.signatures?.step4_contestation} />
        <StepCard step={5} title="5. Veredito do Parceiro" desc="Aceite ou recusa final da mediação." active={currentStep === 5} completed={currentStep > 5} signature={metadata?.signatures?.step5_mediation_review} />
        <StepCard step={6} title="6. Consolidação Digital" desc="Assinatura eletrônica de encerramento." active={currentStep === 6} completed={currentStep > 6} signature={metadata?.signatures?.step6_system_log} />
        <StepCard step={7} title="7. Protocolo Vital Certificado" desc="Auditoria concluída e arquivada." active={currentStep === 7} completed={currentStep > 7} signature={metadata?.signatures?.step7_final_verdict} />
    </div>
  );
};

const StepCard = ({ step, title, desc, active, completed, signature, children }: any) => {
  return (
    <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden ${active ? 'bg-white border-blue-200 shadow-md' : completed ? 'bg-white border-slate-100 opacity-80' : 'bg-transparent border-slate-100 opacity-30'}`}>
      <div className="flex items-start gap-8">
        <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 border-4 transition-all duration-700 ${completed ? 'bg-emerald-500 border-white text-white shadow-sm' : active ? 'bg-[#132659] border-white text-white shadow-xl' : 'bg-slate-100 border-white text-slate-400'}`}>
          {completed ? <Check size={28} strokeWidth={4} /> : <span className="font-black text-xl">{step}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-xl font-bold uppercase tracking-tight ${active ? 'text-[#132659]' : 'text-slate-400'}`}>
            {title}
          </h4>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{desc}</p>
          {signature && (
            <div className="mt-5 p-5 bg-emerald-50/50 border border-dashed border-emerald-200 rounded-[1.5rem] space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[3px]">DOCUMENTO AUTENTICADO:</p>
                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{signature.userName} • {signature.userEmail}</p>
                <p className="text-[10px] font-mono text-slate-400">TIMESTAMP SP: {new Date(signature.timestamp).toLocaleString('pt-BR')}</p>
            </div>
          )}
          {children && <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700">{children}</div>}
        </div>
      </div>
    </div>
  );
};