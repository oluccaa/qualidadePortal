import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Key, Activity, PenTool, X, 
  FileText, ArrowRight, PlayCircle, ClipboardCheck
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
  
  const [isRejectingStep2, setIsRejectingStep2] = useState(false);
  const [step2Notes, setStep2Notes] = useState('');

  const currentStep = metadata?.currentStep || 1;
  const isAnalyst = userRole === UserRole.QUALITY || userRole === UserRole.ADMIN;
  const isClient = userRole === UserRole.CLIENT;
  const hasDrawings = !!metadata?.documentalDrawings && metadata.documentalDrawings !== '{}';

  const createSignature = (action: string): AuditSignature => ({
    userId: 'system_protocol',
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    timestamp: new Date().toISOString(),
    action: action
  });

  const handleAction = async (step: number, status: 'APPROVED' | 'REJECTED', updates: any) => {
    setIsSyncing(true);
    try {
      const sigKey = step === 1 ? 'step1_release' : step === 2 ? 'step2_documental' : 'step3_physical';
      const newSigs = { ...metadata?.signatures, [sigKey]: createSignature(`${status}_STEP_${step}`) };
      await onUpdate({ ...updates, signatures: newSigs as any });
      showToast("Protocolo sincronizado.", "success");
    } catch (e) { showToast("Falha na sincronização.", "error"); } finally { setIsSyncing(false); }
  };

  return (
    <div className="space-y-6 pb-20">
        {/* PASSO 1: LIBERAÇÃO */}
        <StepCard step={1} title="1. Liberação Vital" completed={currentStep > 1} active={currentStep === 1} signature={metadata?.signatures?.step1_release}>
          {isAnalyst && currentStep === 1 && (
            <button onClick={() => handleAction(1, 'APPROVED', { currentStep: 2, status: 'SENT' })} className="w-full py-4 bg-[#132659] text-white rounded-2xl font-bold text-[10px] uppercase tracking-[3px] shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3">
              {isSyncing ? <Activity className="animate-spin" size={16}/> : <><Key size={16} /> Liberar e Assinar</>}
            </button>
          )}
        </StepCard>

        {/* PASSO 2: CONFERÊNCIA E ANOTAÇÃO */}
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all bg-white shadow-sm ${currentStep === 2 ? 'border-blue-200' : 'border-slate-100 opacity-60'}`}>
          <div className="flex items-start gap-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-4 transition-all ${!!metadata?.signatures?.step2_documental ? 'bg-emerald-500 border-white text-white' : 'bg-[#132659] border-white text-white'}`}>
              {!!metadata?.signatures?.step2_documental ? <Check size={24} strokeWidth={4} /> : <span className="font-black">2</span>}
            </div>
            <div className="flex-1 space-y-6">
              <header>
                <h3 className="text-lg font-bold text-[#132659] uppercase tracking-tight">2. CONFERÊNCIA DE DADOS</h3>
                <p className="text-xs text-slate-500 font-medium">Validação técnica e anotações sobre o laudo industrial.</p>
              </header>

              {/* Botão de Anotação Condicional */}
              <div className={`p-6 rounded-3xl flex items-center justify-between gap-4 group transition-all ${currentStep === 2 ? 'bg-blue-50/50 border border-blue-100' : 'bg-slate-50 border border-slate-100 grayscale'}`}>
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${currentStep === 2 ? 'bg-white text-blue-600 border border-blue-100' : 'bg-slate-200 text-slate-400'}`}>
                      <FileText size={20} />
                   </div>
                   <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${currentStep === 2 ? 'text-blue-900' : 'text-slate-500'}`}>Estação de Anotação</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Sincronizado com o Ledger</p>
                   </div>
                </div>
                <button 
                  disabled={currentStep !== 2}
                  onClick={() => navigate(`/preview/${fileId}?mode=audit`)} 
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 active:scale-95 ${
                    currentStep === 2 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {hasDrawings ? "REVISAR ANOTAÇÕES" : "ABRIR ESTAÇÃO DE ANOTAÇÃO"} <ArrowRight size={14} />
                </button>
              </div>
              
              {isClient && currentStep === 2 && !metadata?.signatures?.step2_documental && !isRejectingStep2 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => handleAction(2, 'APPROVED', { documentalStatus: 'APPROVED' })} className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all">APROVAR DADOS</button>
                  <button onClick={() => setIsRejectingStep2(true)} className="py-3 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all">DIVERGÊNCIA</button>
                </div>
              )}

              {isRejectingStep2 && (
                <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-4 animate-in zoom-in-95">
                    <textarea className="w-full p-4 bg-white border border-red-100 rounded-xl text-xs min-h-[100px] outline-none font-medium" placeholder="Relate a divergência técnica encontrada no documento..." value={step2Notes} onChange={e => setStep2Notes(e.target.value)} />
                    <div className="flex gap-2">
                        <button onClick={() => setIsRejectingStep2(false)} className="flex-1 py-3 text-slate-500 font-black text-[10px] uppercase">Cancelar</button>
                        <button disabled={!step2Notes.trim()} onClick={() => handleAction(2, 'REJECTED', { documentalStatus: 'REJECTED', documentalNotes: step2Notes, currentStep: 4, status: 'REJECTED' })} className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">ASSINAR REJEIÇÃO</button>
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PASSOS SUBSEQUENTES */}
        <StepCard step={3} title="3. Vistoria de Carga" completed={!!metadata?.signatures?.step3_physical} active={currentStep === 2 && !!metadata?.signatures?.step2_documental} signature={metadata?.signatures?.step3_physical} />
        <StepCard step={4} title="4. Arbitragem Técnica" completed={currentStep > 4} active={currentStep === 4} />
        <StepCard step={5} title="5. Protocolo Vital Certificado" completed={currentStep === 7} active={currentStep === 6} />
    </div>
  );
};

const StepCard = ({ step, title, active, completed, signature, children }: any) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all ${active ? 'bg-white border-blue-200 shadow-md scale-[1.02]' : completed ? 'bg-white border-slate-100 opacity-80' : 'bg-slate-50 border-slate-100 opacity-40 grayscale'}`}>
    <div className="flex items-start gap-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-4 ${completed ? 'bg-emerald-500 border-white text-white shadow-sm' : active ? 'bg-[#132659] border-white text-white' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
        {completed ? <Check size={24} strokeWidth={4} /> : <span className="font-black">{step}</span>}
      </div>
      <div className="flex-1">
        <h4 className={`text-lg font-bold uppercase tracking-tight ${active ? 'text-[#132659]' : completed ? 'text-slate-700' : 'text-slate-400'}`}>{title}</h4>
        {signature && (
          <div className="mt-4 p-4 bg-emerald-50/50 border border-dashed border-emerald-100 rounded-2xl space-y-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[2px]">AUTENTICADO POR:</p>
              <p className="text-xs font-bold text-slate-800 uppercase">{signature.userName}</p>
              <p className="text-[9px] text-slate-400 font-mono">{new Date(signature.timestamp).toLocaleString()}</p>
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  </div>
);