import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Key, Activity, FileText, ArrowRight, ShieldCheck, 
  Truck, Gavel, UserCheck, Lock, Award, Mail, AlertTriangle, XCircle,
  MessageSquare
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
}

export const AuditWorkflow: React.FC<AuditWorkflowProps> = ({ 
    metadata, userRole, userName, userEmail, fileId, onUpdate 
}) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [arbitrationText, setArbitrationText] = useState('');
  
  const isQuality = userRole === UserRole.QUALITY || userRole === UserRole.ADMIN;
  const isClient = userRole === UserRole.CLIENT;

  const sigs = metadata?.signatures || {};
  const s1 = !!sigs.step1_release;
  const s2 = !!sigs.step2_documental;
  const s3 = !!sigs.step3_physical;
  const s4 = !!sigs.step4_arbitrage;
  const s5 = !!sigs.step5_partner_verdict;
  const s6_c = !!sigs.step6_consolidation_client;
  const s6_q = !!sigs.step6_consolidation_quality;
  const s6 = s6_c && s6_q; 
  const s7 = !!sigs.step7_certification;

  // Lógica de Arbitragem Técnica
  const isArbitrationNeeded = metadata?.documentalStatus === 'REJECTED' || metadata?.physicalStatus === 'REJECTED';
  const isStep4AutoCompleted = s2 && s3 && !isArbitrationNeeded;
  const isStep4Done = s4 || isStep4AutoCompleted;

  const createSignature = (action: string): AuditSignature => ({
    userId: userName.replace(/\s+/g, '_').toLowerCase(),
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    timestamp: new Date().toISOString(),
    action: action
  });

  const handleAction = async (stepKey: keyof SteelBatchMetadata['signatures'], updates: any) => {
    setIsSyncing(true);
    try {
      const newSigs = { ...sigs, [stepKey]: createSignature(`SIGN_${stepKey.toUpperCase()}`) };
      await onUpdate({ ...updates, signatures: newSigs as any });
      showToast(`Protocolo assinado com sucesso.`, "success");
    } catch (e) { 
      showToast("Erro na sincronização técnica.", "error"); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const isRejected = metadata?.status === QualityStatus.REJECTED;

  return (
    <div className="space-y-6 pb-24">
        
        {/* 1. LIBERAÇÃO VITAL (SGQ) - SOMENTE QUALITY */}
        <StepCard step={1} title="1. Liberação Vital (SGQ)" completed={s1} active={!s1} signature={sigs.step1_release} icon={Key}>
          {isQuality && !s1 && (
            <button 
                onClick={() => handleAction('step1_release', { status: QualityStatus.SENT })} 
                className="w-full py-4 bg-[#132659] text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3"
            >
              {isSyncing ? <Activity className="animate-spin" size={16}/> : "Autorizar Fluxo Industrial"}
            </button>
          )}
        </StepCard>

        {/* 2. CONFERÊNCIA DE DADOS - SOMENTE CLIENTE */}
        <StepCard step={2} title="2. Conferência de Dados" completed={s2} active={s1 && !s2} signature={sigs.step2_documental} icon={FileText}>
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium">Análise técnica do laudo e aplicação de notas/anotações.</p>
                <button 
                    disabled={!s1}
                    onClick={() => navigate(`/preview/${fileId}?mode=audit`)} 
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        s1 ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-50'
                    }`}
                >
                    <FileText size={16} /> Estação de Anotação
                </button>
                {isClient && s1 && !s2 && (
                    <button 
                        onClick={() => handleAction('step2_documental', { documentalStatus: 'APPROVED' })}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                    >
                        Assinar Validação de Dados
                    </button>
                )}
            </div>
        </StepCard>

        {/* 3. VISTORIA DE CARGA - SOMENTE CLIENTE */}
        <StepCard step={3} title="3. Vistoria de Carga" completed={s3} active={s1 && !s3} signature={sigs.step3_physical} icon={Truck}>
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium">Confirmação física de recebimento e integridade do lote industrial.</p>
                {isClient && s1 && !s3 && (
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleAction('step3_physical', { physicalStatus: 'APPROVED' })}
                            className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
                        >
                            <Check size={14} strokeWidth={4} /> Aprovar Carga
                        </button>
                        <button 
                            onClick={() => handleAction('step3_physical', { physicalStatus: 'REJECTED' })}
                            className="py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:bg-red-700 flex items-center justify-center gap-2"
                        >
                            <XCircle size={14} strokeWidth={3} /> Rejeitar Carga
                        </button>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 4. ARBITRAGEM TÉCNICA - SOMENTE QUALITY */}
        <StepCard step={4} title="4. Arbitragem Técnica" completed={isStep4Done} active={s2 && s3 && isArbitrationNeeded && !s4} signature={sigs.step4_arbitrage} icon={Gavel}>
            <div className="space-y-4">
                {isStep4AutoCompleted && !s4 && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in fade-in duration-500">
                        <ShieldCheck size={18} className="text-emerald-600" />
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">
                            Conformidade Detectada: Não foi necessária contestação técnica.
                        </p>
                    </div>
                )}

                {isQuality && isArbitrationNeeded && !s4 && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-500">
                        <p className="text-[10px] text-slate-500 font-medium">Houve uma reprovação nos passos anteriores. O analista deve mediar a divergência.</p>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Parecer de Arbitragem</label>
                            <textarea 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs min-h-[100px] outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all font-medium"
                                placeholder="Descreva a contestação técnica ou justificativa de mediação..."
                                value={arbitrationText}
                                onChange={(e) => setArbitrationText(e.target.value)}
                            />
                        </div>
                        <button 
                            disabled={!arbitrationText.trim() || isSyncing}
                            onClick={() => handleAction('step4_arbitrage', { arbitrationNotes: arbitrationText })}
                            className="w-full py-4 bg-[#132659] text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSyncing ? <Activity className="animate-spin" size={16}/> : "Assinar Arbitragem Técnica"}
                        </button>
                    </div>
                )}

                {s4 && metadata?.arbitrationNotes && (
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={12} /> Nota de Mediação:
                        </p>
                        <p className="text-xs text-blue-900 font-medium italic leading-relaxed">
                            "{metadata.arbitrationNotes}"
                        </p>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 5. VEREDITO DO PARCEIRO - SOMENTE CLIENTE */}
        <StepCard step={5} title="5. Veredito do Parceiro" completed={s5} active={isStep4Done && !s5} signature={sigs.step5_partner_verdict} icon={UserCheck}>
            {isClient && isStep4Done && !s5 && (
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleAction('step5_partner_verdict', { status: QualityStatus.APPROVED })}
                        className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                    >
                        Aceitar Lote
                    </button>
                    <button 
                        onClick={() => handleAction('step5_partner_verdict', { status: QualityStatus.REJECTED })}
                        className="py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                    >
                        Rejeitar Lote
                    </button>
                </div>
            )}
        </StepCard>

        {/* 6. CONSOLIDAÇÃO DIGITAL - CLIENTE E QUALIDADE */}
        <StepCard step={6} title="6. Consolidação Digital" completed={s6} active={s5 && !s6} icon={Lock}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <StatusSlot label="Representante Cliente" signed={s6_c} signature={sigs.step6_consolidation_client} />
                    <StatusSlot label="Analista Qualidade" signed={s6_q} signature={sigs.step6_consolidation_quality} />
                </div>

                {/* Botão Dinâmico baseado na Role e Pendência */}
                {s5 && !s6 && (
                    <>
                        {isClient && !s6_c && (
                            <button 
                                onClick={() => handleAction('step6_consolidation_client', {})}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                            >
                                Assinar Selo de Consolidação (Cliente)
                            </button>
                        )}
                        {isQuality && !s6_q && (
                            <button 
                                onClick={() => handleAction('step6_consolidation_quality', {})}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                            >
                                Assinar Selo de Consolidação (Qualidade)
                            </button>
                        )}
                    </>
                )}
            </div>
        </StepCard>

        {/* 7. PROTOCOLO VITAL CERTIFICADO - RESUMO FINAL */}
        <StepCard step={7} title="7. Protocolo Vital Certificado" completed={s6} active={s6} icon={Award}>
            {s6 && (
                <div className="animate-in fade-in zoom-in-95 duration-700">
                    {!isRejected ? (
                        <div className="text-center p-8 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200 space-y-4">
                            <ShieldCheck size={56} className="text-emerald-600 mx-auto animate-bounce" />
                            <div>
                                <h4 className="text-base font-black text-emerald-900 uppercase">Certificação Concluída</h4>
                                <p className="text-xs text-emerald-700 font-medium mt-1">Agradecemos pela parceria. O lote está homologado para utilização.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-red-50 rounded-3xl border-2 border-dashed border-red-200 space-y-6">
                            <AlertTriangle size={56} className="text-red-600 mx-auto" />
                            <div>
                                <h4 className="text-base font-black text-red-900 uppercase">Lote Rejeitado</h4>
                                <p className="text-xs text-red-700 font-medium mt-1">Houve uma divergência técnica impeditiva no protocolo.</p>
                            </div>
                            <div className="pt-4 border-t border-red-100 flex flex-col items-center gap-3">
                                <p className="text-[10px] font-black text-red-800 uppercase">Favor entrar em contato para conciliação:</p>
                                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-red-100">
                                    <Mail size={14} className="text-red-500" />
                                    <span className="text-xs font-mono font-bold text-red-900">
                                        {isQuality ? sigs.step6_consolidation_client?.userEmail : sigs.step1_release?.userEmail}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </StepCard>
    </div>
  );
};

const StatusSlot = ({ label, signed, signature }: any) => (
    <div className={`p-4 rounded-2xl border transition-all ${signed ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
        <p className="text-[8px] font-black text-slate-400 uppercase mb-2">{label}</p>
        {signed ? (
            <div className="flex items-center gap-2 text-emerald-600">
                <Check size={14} strokeWidth={4} />
                <span className="text-[10px] font-black uppercase tracking-tight">Assinado</span>
            </div>
        ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pendente</span>
        )}
        {signature && (
            <p className="text-[8px] text-slate-500 mt-1 truncate">{signature.userName}</p>
        )}
    </div>
);

const StepCard = ({ step, title, active, completed, signature, children, icon: Icon }: any) => {
    const statusColor = completed ? 'bg-emerald-500' : active ? 'bg-[#132659]' : 'bg-slate-200';
    
    return (
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${
            active ? 'bg-white border-blue-200 shadow-xl scale-[1.01]' : completed ? 'bg-white border-emerald-50 opacity-90' : 'bg-slate-50 border-slate-100 opacity-40 grayscale'
        }`}>
            <div className="flex items-start gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-4 border-white shadow-lg transition-colors ${statusColor} text-white`}>
                    {completed ? <Check size={28} strokeWidth={4} /> : <Icon size={24} />}
                </div>
                <div className="flex-1 space-y-4">
                    <header className="flex justify-between items-start">
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${active ? 'text-[#132659]' : completed ? 'text-slate-800' : 'text-slate-400'}`}>
                                {title}
                            </h3>
                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">
                                {completed ? 'VALIDADO' : active ? 'EM ANÁLISE' : 'AGUARDANDO'}
                            </span>
                        </div>
                        {completed && <ShieldCheck size={20} className="text-emerald-500" />}
                    </header>

                    {children && <div className="animate-in fade-in slide-in-from-top-2 duration-500">{children}</div>}

                    {signature && (
                        <div className="mt-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[3px] mb-1">Assinatura Digital Auditada:</p>
                                <div className="flex flex-col">
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{signature.userName}</p>
                                    <p className="text-[9px] text-blue-600 font-bold underline opacity-70 lowercase">{signature.userEmail}</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] font-black text-slate-700 font-mono">
                                    {new Date(signature.timestamp).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-[9px] font-black text-slate-400 font-mono">
                                    {new Date(signature.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (SP)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
