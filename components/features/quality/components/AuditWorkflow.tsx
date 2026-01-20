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
  const [contestationInput, setContestationInput] = useState('');
  const [currentTimeSP, setCurrentTimeSP] = useState('');
  
  // Estados para formulários de rejeição (Passos 2 e 3)
  const [isRejectingStep2, setIsRejectingStep2] = useState(false);
  const [step2Notes, setStep2Notes] = useState('');
  const [step2Flags, setStep2Flags] = useState<string[]>([]);
  const [currentFlagInput2, setCurrentFlagInput2] = useState('');

  const [isRejectingStep3, setIsRejectingStep3] = useState(false);
  const [step3Notes, setStep3Notes] = useState('');
  const [step3Flags, setStep3Flags] = useState<string[]>([]);
  const [currentFlagInput3, setCurrentFlagInput3] = useState('');

  const currentStep = metadata?.currentStep || 1;
  const isAnalyst = userRole === UserRole.QUALITY || userRole === UserRole.ADMIN;
  const isClient = userRole === UserRole.CLIENT;

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

  const handleAddFlag = (step: 2 | 3) => {
    const input = step === 2 ? currentFlagInput2 : currentFlagInput3;
    const flags = step === 2 ? step2Flags : step3Flags;
    const setFlags = step === 2 ? setStep2Flags : setStep3Flags;
    const setInput = step === 2 ? setCurrentFlagInput2 : setCurrentFlagInput3;

    if (!input.trim()) return;
    const clean = input.trim().toUpperCase();
    if (flags.includes(clean)) {
        setInput('');
        return;
    }
    setFlags([...flags, clean]);
    setInput('');
  };

  const handleRemoveFlag = (step: 2 | 3, flagToRemove: string) => {
    if (step === 2) setStep2Flags(step2Flags.filter(f => f !== flagToRemove));
    else setStep3Flags(step3Flags.filter(f => f !== flagToRemove));
  };

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

      // Lógica de Transição de Estado do Ledger
      if (step === 1) {
        if (status === 'APPROVED') {
          nextStep = 2;
          nextGlobalStatus = QualityStatus.SENT;
        }
      } else if (step === 2 || step === 3) {
        const isDocCompleted = step === 2 || !!metadata?.signatures?.step2_documental;
        const isPhysCompleted = step === 3 || !!metadata?.signatures?.step3_physical;
        
        // Verifica se houve qualquer rejeição em 2 ou 3 para decidir o próximo passo
        const isStep2Rejected = (step === 2 && status === 'REJECTED') || metadata?.documentalStatus === 'REJECTED';
        const isStep3Rejected = (step === 3 && status === 'REJECTED') || metadata?.physicalStatus === 'REJECTED';
        const hasAnyRejection = isStep2Rejected || isStep3Rejected;

        if (isDocCompleted && isPhysCompleted) {
          nextStep = hasAnyRejection ? 4 : 6;
        } else {
          // Se ainda falta um dos dois (2 ou 3), permanece no estágio de conferência
          nextStep = 2;
        }
      } else if (step === 4) {
        nextStep = 5;
      } else if (step === 5) {
        if (status === 'APPROVED') nextStep = 6;
        else {
          nextGlobalStatus = QualityStatus.REJECTED;
          nextStep = 7; 
        }
      } else if (step === 6) {
        nextStep = 7;
        nextGlobalStatus = QualityStatus.APPROVED;
      }

      const newSignatures = { 
        ...metadata?.signatures, 
        [sigKey]: createSignature(`${status}_STEP_${step}`) 
      };
      
      await onUpdate({
        ...stepUpdates,
        currentStep: nextStep,
        signatures: newSignatures as any,
        status: nextGlobalStatus
      });

      showToast(`Passo ${step} assinado com sucesso no Ledger Vital.`, "success");
      if (step === 2) setIsRejectingStep2(false);
      if (step === 3) setIsRejectingStep3(false);
    } catch (e) {
      showToast("Erro ao sincronizar assinatura no Ledger.", "error");
    } finally {
      setIsSyncing(false);
      setContestationInput('');
    }
  };

  const getAnalystSignature = () => metadata?.signatures?.step1_release || metadata?.signatures?.step4_contestation;
  const getPartnerSignature = () => metadata?.signatures?.step2_documental || metadata?.signatures?.step3_physical;

  const SignaturePreviewSeal = () => (
    <div className="mt-3 flex items-start gap-2 p-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg opacity-70">
        <PenTool size={12} className="text-blue-500 mt-0.5" />
        <div className="space-y-0.5">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aguardando Assinatura Digital:</p>
            <p className="text-[9px] font-bold text-slate-700 uppercase">{userName} • {userEmail}</p>
            <p className="text-[8px] font-mono text-slate-500">Timestamp SP: {currentTimeSP}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-20">
        <StepCard 
          step={1} 
          title="1. Liberação Vital (SGQ)" 
          desc="Autorização técnica para início da conferência externa."
          active={currentStep === 1}
          completed={currentStep > 1}
          signature={metadata?.signatures?.step1_release}
        >
          {isAnalyst && currentStep === 1 && (
            <div className="space-y-2">
                <button 
                disabled={isSyncing}
                onClick={() => handleAction(1, 'APPROVED', {})}
                className="w-full px-6 py-3 bg-[#132659] text-white rounded-lg font-black text-[9px] uppercase tracking-[2px] shadow-lg hover:bg-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                {isSyncing ? <Activity className="animate-spin" size={14}/> : <><Key size={14} className="text-blue-400" /> Liberar e Assinar</>}
                </button>
                <SignaturePreviewSeal />
            </div>
          )}
          {isClient && currentStep === 1 && <WaitBadge label="Aguardando Triagem Vital" />}
        </StepCard>

        {/* PASSO 2: CONFERÊNCIA DOCUMENTAL */}
        <StepCard 
          step={2} 
          title="2. Conferência de Dados" 
          desc="Validação das propriedades técnicas e dimensionais do aço."
          active={currentStep === 2 && !metadata?.signatures?.step2_documental}
          completed={!!metadata?.signatures?.step2_documental}
          status={metadata?.documentalStatus}
          signature={metadata?.signatures?.step2_documental}
          flags={metadata?.documentalFlags}
          notes={metadata?.documentalNotes}
        >
          <div className="space-y-4">
              {/* Botão de Anotação (Acesso ao PDF) */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                          <FileText size={20} />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none">Documento Original</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Clique para conferir e anotar</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => navigate(`/preview/${fileId}`)}
                      className="w-full md:w-auto px-6 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group"
                  >
                      {isAnalyst ? "Revisar Anotações" : "Conferir e Anotar"}
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
              </div>

              {metadata?.documentalDrawings && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 w-fit">
                      <Check size={12} strokeWidth={3} />
                      <span className="text-[8px] font-black uppercase tracking-[2px]">Anotações Sincronizadas no Ledger</span>
                  </div>
              )}

              {isClient && currentStep === 2 && !metadata?.signatures?.step2_documental && (
                <div className="space-y-3 animate-in slide-in-from-bottom-2">
                  {!isRejectingStep2 ? (
                      <div className="flex gap-3">
                          <button onClick={() => handleAction(2, 'APPROVED', { documentalStatus: 'APPROVED' })} className="flex-1 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-md">Aprovar Dados</button>
                          <button onClick={() => setIsRejectingStep2(true)} className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-md">Divergência</button>
                      </div>
                  ) : (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-red-200 space-y-6 animate-in zoom-in-95">
                          <header className="flex items-center justify-between">
                              <h5 className="text-[10px] font-black text-red-600 uppercase tracking-[3px]">Relatar Divergência de Dados</h5>
                              <button onClick={() => setIsRejectingStep2(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                          </header>

                          <div className="space-y-3">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Marcadores de Erro (Flags)</label>
                              <div className="flex gap-2">
                                  <input 
                                      type="text" 
                                      placeholder="Ex: Peso Divergente..." 
                                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 transition-all"
                                      value={currentFlagInput2}
                                      onChange={e => setCurrentFlagInput2(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleAddFlag(2)}
                                  />
                                  <button type="button" onClick={() => handleAddFlag(2)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                      <Plus size={16} />
                                  </button>
                              </div>
                              <div className="flex flex-wrap gap-2 min-h-[24px]">
                                  {step2Flags.map(flag => (
                                      <span key={flag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-md text-[9px] font-black uppercase tracking-tight">
                                          {flag}
                                          <button onClick={() => handleRemoveFlag(2, flag)} className="hover:text-red-900"><X size={10} /></button>
                                      </span>
                                  ))}
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observações Técnicas</label>
                              <textarea 
                                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs min-h-[100px] outline-none focus:border-red-400 transition-all font-medium"
                                  placeholder="Descreva detalhadamente a divergência identificada no laudo..."
                                  value={step2Notes}
                                  onChange={e => setStep2Notes(e.target.value)}
                              />
                          </div>

                          <button 
                              disabled={isSyncing || (step2Flags.length === 0 && !step2Notes.trim())}
                              onClick={() => handleAction(2, 'REJECTED', { documentalStatus: 'REJECTED', documentalFlags: step2Flags, documentalNotes: step2Notes })}
                              className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[3px] shadow-lg hover:bg-red-700 transition-all active:scale-95 disabled:opacity-30"
                          >
                              {isSyncing ? "Sincronizando..." : "Assinar Rejeição Documental"}
                          </button>
                      </div>
                  )}
                  <SignaturePreviewSeal />
                </div>
              )}
          </div>
          {isAnalyst && currentStep === 2 && !metadata?.signatures?.step2_documental && <WaitBadge label="Aguardando Conferência Documental" />}
        </StepCard>

        {/* PASSO 3: VISTORIA DE CARGA */}
        <StepCard 
          step={3} 
          title="3. Vistoria de Carga" 
          desc="Inspeção física do material e etiquetas no recebimento."
          active={currentStep === 2 && !metadata?.signatures?.step3_physical}
          completed={!!metadata?.signatures?.step3_physical}
          status={metadata?.physicalStatus}
          signature={metadata?.signatures?.step3_physical}
          flags={metadata?.physicalFlags}
          notes={metadata?.physicalNotes}
        >
          {isClient && currentStep === 2 && !metadata?.signatures?.step3_physical && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
               {!isRejectingStep3 ? (
                  <div className="flex gap-3">
                        <button onClick={() => handleAction(3, 'APPROVED', { physicalStatus: 'APPROVED' })} className="flex-1 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md">Carga OK</button>
                        <button onClick={() => setIsRejectingStep3(true)} className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-md">Reportar Avaria</button>
                  </div>
               ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-red-200 space-y-6 animate-in zoom-in-95">
                      <header className="flex items-center justify-between">
                          <h5 className="text-[10px] font-black text-red-600 uppercase tracking-[3px]">Relatar Avaria Física / Carga</h5>
                          <button onClick={() => setIsRejectingStep3(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                      </header>

                      <div className="space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Marcadores de Avaria (Flags)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  placeholder="Ex: Embalagem Rompida..." 
                                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 transition-all"
                                  value={currentFlagInput3}
                                  onChange={e => setCurrentFlagInput3(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddFlag(3)}
                              />
                              <button type="button" onClick={() => handleAddFlag(3)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded-lg transition-all shadow-sm">
                                  <Plus size={16} />
                              </button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-[24px]">
                              {step3Flags.map(flag => (
                                  <span key={flag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-md text-[9px] font-black uppercase tracking-tight">
                                      {flag}
                                      <button onClick={() => handleRemoveFlag(3, flag)} className="hover:text-red-900"><X size={10} /></button>
                                  </span>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observações da Vistoria</label>
                          <textarea 
                              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs min-h-[100px] outline-none focus:border-red-400 transition-all font-medium"
                              placeholder="Descreva os danos físicos ou divergências de etiqueta..."
                              value={step3Notes}
                              onChange={e => setStep3Notes(e.target.value)}
                          />
                      </div>

                      <button 
                          disabled={isSyncing || (step3Flags.length === 0 && !step3Notes.trim())}
                          onClick={() => handleAction(3, 'REJECTED', { physicalStatus: 'REJECTED', physicalFlags: step3Flags, physicalNotes: step3Notes })}
                          className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[3px] shadow-lg hover:bg-red-700 transition-all active:scale-95 disabled:opacity-30"
                      >
                          {isSyncing ? "Sincronizando..." : "Assinar Avaria de Carga"}
                      </button>
                  </div>
               )}
               <SignaturePreviewSeal />
            </div>
          )}
          {isAnalyst && currentStep === 2 && !metadata?.signatures?.step3_physical && <WaitBadge label="Aguardando Vistoria de Carga" />}
        </StepCard>

        {/* PASSO 4: ARBITRAGEM */}
        <StepCard 
          step={4} 
          title="4. Arbitragem Técnica" 
          desc="Análise Vital sobre as divergências apontadas pelo parceiro."
          active={currentStep === 4}
          completed={currentStep > 4}
          signature={metadata?.signatures?.step4_contestation}
        >
          {isAnalyst && currentStep === 4 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500 max-w-xl">
               <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[100px] outline-none focus:border-blue-400 transition-all font-medium"
                  placeholder="Justificativa ou solução para as divergências..."
                  value={contestationInput}
                  onChange={e => setContestationInput(e.target.value)}
               />
               <button 
                  disabled={!contestationInput.trim() || isSyncing}
                  onClick={() => handleAction(4, 'APPROVED', { analystContestationNote: contestationInput })}
                  className="w-full py-3 bg-orange-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
               >
                  Enviar e Assinar Parecer
               </button>
               <SignaturePreviewSeal />
            </div>
          )}
          {isClient && currentStep === 4 && <WaitBadge label="Em análise técnica pela Qualidade Vital" icon={Activity} />}
        </StepCard>

        {/* PASSO 5: VEREDITO DO PARCEIRO */}
        <StepCard 
          step={5} 
          title="5. Veredito do Parceiro" 
          desc="Aceite ou recusa final da mediação técnica."
          active={currentStep === 5}
          completed={currentStep > 5}
          signature={metadata?.signatures?.step5_mediation_review}
        >
          {metadata?.analystContestationNote && (
              <div className="mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 italic text-xs text-blue-800 shadow-inner max-w-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 text-blue-900"><MessageSquare size={40} /></div>
                  <p className="font-black uppercase mb-1 not-italic text-blue-900 text-[9px] tracking-widest">Nota da Qualidade:</p>
                  "{metadata.analystContestationNote}"
              </div>
          )}
          {isClient && currentStep === 5 && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
               <div className="flex gap-3">
                    <button onClick={() => handleAction(5, 'APPROVED', { mediationStatus: 'APPROVED' })} className="flex-1 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 shadow-md">Aceitar</button>
                    <button onClick={() => handleAction(5, 'REJECTED', { mediationStatus: 'REJECTED' })} className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-700 shadow-md">Recusar</button>
               </div>
               <SignaturePreviewSeal />
            </div>
          )}
        </StepCard>

        <StepCard 
          step={6} 
          title="6. Consolidação Digital" 
          desc="Assinatura eletrônica de encerramento do processo."
          active={currentStep === 6}
          completed={currentStep > 6}
          signature={metadata?.signatures?.step6_system_log}
        >
          {isClient && currentStep === 6 && (
            <div className="space-y-3">
                <button onClick={() => handleAction(6, 'APPROVED', {})} className="w-full px-8 py-3 bg-[#132659] text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Consolidar e Assinar</button>
                <SignaturePreviewSeal />
            </div>
          )}
          {isAnalyst && currentStep === 6 && <WaitBadge label="Aguardando Assinatura Final" />}
        </StepCard>

        <StepCard 
          step={7} 
          title="7. Protocolo Vital Certificado" 
          desc="Processo auditado e arquivado no cluster de segurança."
          active={currentStep === 7}
          completed={currentStep > 7}
          signature={metadata?.signatures?.step7_final_verdict}
        >
          {metadata?.status === QualityStatus.APPROVED && (
              <div className="p-6 bg-emerald-50 text-emerald-700 border-emerald-100 rounded-2xl border flex items-center gap-6 shadow-inner max-w-xl animate-in zoom-in-95">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Qualidade Validada</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Certificado v4.0 Ativo</p>
                  </div>
              </div>
          )}
          {metadata?.status === QualityStatus.REJECTED && (
              <div className="p-6 bg-red-50 text-red-700 border-red-100 rounded-2xl border flex flex-col gap-6 shadow-inner max-w-xl animate-in zoom-in-95">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm shrink-0">
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-tight">Protocolo Reprovado</p>
                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Encerrado sem conformidade</p>
                    </div>
                  </div>

                  <div className="bg-white/60 p-5 rounded-xl border border-red-100 space-y-4">
                    {isClient ? (
                        <>
                            <div className="flex items-center gap-3 text-red-800">
                                <Mail size={16} />
                                <p className="text-[11px] font-bold uppercase tracking-tight">Instrução ao Parceiro:</p>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Identificamos divergências impeditivas neste lote. Por favor, entre em contato com o <b>Analista de Qualidade</b> responsável pela sua conta para alinhar as correções necessárias.
                            </p>
                            <div className="pt-2 border-t border-red-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Analista Responsável:</p>
                                <p className="text-xs font-black text-blue-900 mt-0.5">
                                    {getAnalystSignature()?.userName || 'Equipe Técnica'}
                                    {getAnalystSignature()?.userEmail && <span className="block text-[10px] font-bold text-slate-400 normal-case">{getAnalystSignature()?.userEmail}</span>}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 text-slate-800">
                                <User size={16} />
                                <p className="text-[11px] font-bold uppercase tracking-tight">Status do Atendimento:</p>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                O processo foi encerrado como não-conforme. O parceiro foi instruído a entrar em contato com você para tratar os pontos de divergência.
                            </p>
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Representante do Cliente:</p>
                                <p className="text-xs font-black text-slate-800 mt-0.5">
                                    {getPartnerSignature()?.userName || 'Representante do Cliente'}
                                    {getPartnerSignature()?.userEmail && <span className="block text-[10px] font-bold text-slate-400 normal-case">{getPartnerSignature()?.userEmail}</span>}
                                </p>
                            </div>
                        </>
                    )}
                  </div>
              </div>
          )}
        </StepCard>
    </div>
  );
};

const WaitBadge = ({ label, icon: Icon = Clock }: { label: string; icon?: any }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 w-fit animate-in fade-in slide-in-from-left-2">
        <Icon size={12} className="animate-pulse" />
        <p className="text-[8px] font-black uppercase tracking-widest leading-tight">{label}</p>
    </div>
);

const StepCard = ({ step, title, desc, active, completed, signature, status, flags, notes, children }: any) => {
  const isRejected = status === 'REJECTED';

  const formatSPTime = (iso: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'America/Sao_Paulo'
    }).format(new Date(iso));
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-500 relative overflow-hidden group
      ${active ? 'bg-white border-blue-400 shadow-md ring-1 ring-blue-400/5' : 
        completed ? 'bg-white border-slate-100 opacity-80' : 'bg-transparent border-slate-100 opacity-30'}`}>
      
      <div className="flex items-start gap-6 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-700
          ${completed ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm' : 
            active ? 'bg-[#132659] border-slate-800 text-white shadow-lg' : 
            'bg-slate-100 border-slate-200 text-slate-400'}`}>
          {completed ? <Check size={24} strokeWidth={4} /> : <span className="font-black text-sm font-mono">{step}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h4 className={`text-base font-black uppercase tracking-tight truncate ${active ? 'text-slate-900' : 'text-slate-400'}`}>
              {title}
            </h4>
            {isRejected && <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse tracking-widest shadow-sm">DIVERGÊNCIA</span>}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed max-w-xl">{desc}</p>

          {completed && isRejected && (
              <div className="mt-4 space-y-3">
                  {flags && flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                          {flags.map((f: string) => (
                              <span key={f} className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[8px] font-black uppercase">{f}</span>
                          ))}
                      </div>
                  )}
                  {notes && (
                      <div className="p-3 bg-red-50/30 border-l-2 border-red-400 rounded text-xs text-red-900 font-medium italic">
                          "{notes}"
                      </div>
                  )}
              </div>
          )}

          {signature && (
            <div className="mt-4 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-700">
                    <ClipboardCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[2px]">Autenticado Digitalmente</span>
                </div>
                <div className="pl-6 text-[9px] space-y-0.5">
                    <p className="font-black text-slate-700 uppercase tracking-tight">{signature.userName} ({signature.userEmail})</p>
                    <p className="font-bold text-slate-400 uppercase tracking-widest">Data/Hora SP: {formatSPTime(signature.timestamp)}</p>
                </div>
            </div>
          )}

          {children && <div className="mt-5 animate-in fade-in slide-in-from-bottom-2 duration-700">{children}</div>}
        </div>
      </div>
    </div>
  );
};