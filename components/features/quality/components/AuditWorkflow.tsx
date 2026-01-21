import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Key, Activity, X, 
  FileText, ArrowRight, ShieldCheck, Truck, 
  Gavel, UserCheck, Lock, Award
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
  
  const isAnalyst = userRole === UserRole.QUALITY || userRole === UserRole.ADMIN;
  const isClient = userRole === UserRole.CLIENT;

  // Helpers de Estado do Fluxo
  const sigs = metadata?.signatures || {};
  const s1 = !!sigs.step1_release;
  const s2 = !!sigs.step2_documental;
  const s3 = !!sigs.step3_physical;
  const s4 = !!sigs.step4_arbitrage;
  const s5 = !!sigs.step5_partner_verdict;
  const s6 = !!sigs.step6_consolidation;
  const s7 = !!sigs.step7_certification;

  const createSignature = (action: string): AuditSignature => {
    const now = new Date();
    return {
      userId: userName.replace(/\s+/g, '_').toLowerCase(),
      userName: userName,
      userEmail: userEmail,
      userRole: userRole,
      timestamp: now.toISOString(),
      action: action
    };
  };

  const handleAction = async (stepKey: keyof SteelBatchMetadata['signatures'], status: QualityStatus, updates: any) => {
    setIsSyncing(true);
    try {
      const newSigs = { ...sigs, [stepKey]: createSignature(`SIGN_${stepKey.toUpperCase()}`) };
      await onUpdate({ ...updates, signatures: newSigs as any });
      showToast(`Protocolo Vital: Passo assinado com sucesso.`, "success");
    } catch (e) { 
      showToast("Falha na sincronização do Ledger.", "error"); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  return (
    <div className="space-y-6 pb-24">
        
        {/* 1. LIBERAÇÃO VITAL (SGQ) */}
        <StepCard 
            step={1} 
            title="1. Liberação Vital (SGQ)" 
            completed={s1} 
            active={!s1} 
            signature={sigs.step1_release}
            icon={Key}
        >
          {isAnalyst && !s1 && (
            <button 
                onClick={() => handleAction('step1_release', QualityStatus.SENT, { currentStep: 2, status: QualityStatus.SENT })} 
                className="w-full py-4 bg-[#132659] text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3"
            >
              {isSyncing ? <Activity className="animate-spin" size={16}/> : "Liberar e Assinar Protocolo"}
            </button>
          )}
        </StepCard>

        {/* 2. CONFERÊNCIA DE DADOS */}
        <StepCard 
            step={2} 
            title="2. Conferência de Dados" 
            completed={s2} 
            active={s1 && !s2} 
            signature={sigs.step2_documental}
            icon={FileText}
        >
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Validação técnica dos dados industriais e anotações no laudo.</p>
                <button 
                    disabled={!s1 || s2}
                    onClick={() => navigate(`/preview/${fileId}?mode=audit`)} 
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        s1 && !s2 ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                >
                    <FileText size={16} /> Abrir Estação de Anotação
                </button>
                {isClient && s1 && !s2 && (
                    <button 
                        onClick={() => handleAction('step2_documental', QualityStatus.SENT, { documentalStatus: 'APPROVED' })}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700"
                    >
                        Assinar Conferência
                    </button>
                )}
            </div>
        </StepCard>

        {/* 3. VISTORIA DE CARGA */}
        <StepCard 
            step={3} 
            title="3. Vistoria de Carga" 
            completed={s3} 
            active={s1 && !s3} 
            signature={sigs.step3_physical}
            icon={Truck}
        >
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Inspeção física do lote e conformidade de embalagem/transporte.</p>
                {isClient && s1 && !s3 && (
                    <button 
                        onClick={() => handleAction('step3_physical', QualityStatus.SENT, { physicalStatus: 'APPROVED' })}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700"
                    >
                        Confirmar Recebimento Físico
                    </button>
                )}
            </div>
        </StepCard>

        {/* 4. ARBITRAGEM TÉCNICA */}
        <StepCard 
            step={4} 
            title="4. Arbitragem Técnica" 
            completed={s4} 
            active={s1 && s2 && s3 && !s4} 
            signature={sigs.step4_arbitrage}
            icon={Gavel}
        >
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Mediação industrial e verificação final de divergências.</p>
                {isAnalyst && s2 && s3 && !s4 && (
                    <button 
                        onClick={() => handleAction('step4_arbitrage', QualityStatus.SENT, { currentStep: 5 })}
                        className="w-full py-4 bg-[#132659] text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] shadow-xl"
                    >
                        Executar Arbitragem e Assinar
                    </button>
                )}
            </div>
        </StepCard>

        {/* 5. VEREDITO DO PARCEIRO */}
        <StepCard 
            step={5} 
            title="5. Veredito do Parceiro" 
            completed={s5} 
            active={s4 && !s5} 
            signature={sigs.step5_partner_verdict}
            icon={UserCheck}
        >
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Aceite formal do veredito técnico pelo representante legal do parceiro.</p>
                {isClient && s4 && !s5 && (
                    <button 
                        onClick={() => handleAction('step5_partner_verdict', QualityStatus.APPROVED, { currentStep: 6, status: QualityStatus.APPROVED })}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] shadow-xl"
                    >
                        Assinar Veredito Final
                    </button>
                )}
            </div>
        </StepCard>

        {/* 6. CONSOLIDAÇÃO DIGITAL */}
        <StepCard 
            step={6} 
            title="6. Consolidação Digital" 
            completed={s6} 
            active={s5 && !s6} 
            signature={sigs.step6_consolidation}
            icon={Lock}
        >
            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Fechamento do ledger e geração do hash de integridade final.</p>
                {isAnalyst && s5 && !s6 && (
                    <button 
                        onClick={() => handleAction('step6_consolidation', QualityStatus.APPROVED, { currentStep: 7 })}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px]"
                    >
                        Selar e Consolidar Ledger
                    </button>
                )}
            </div>
        </StepCard>

        {/* 7. PROTOCOLO VITAL CERTIFICADO */}
        <StepCard 
            step={7} 
            title="7. Protocolo Vital Certificado" 
            completed={s7} 
            active={s6 && !s7} 
            signature={sigs.step7_certification}
            icon={Award}
        >
            {s6 && !s7 && (
                <div className="text-center p-8 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200">
                    <ShieldCheck size={48} className="text-emerald-600 mx-auto mb-4 animate-bounce" />
                    <h4 className="text-sm font-black text-emerald-900 uppercase">Processo Concluído</h4>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase mt-2">O Certificado agora possui validade jurídica industrial completa.</p>
                </div>
            )}
        </StepCard>
    </div>
  );
};

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
                        {completed && (
                            <ShieldCheck size={20} className="text-emerald-500" />
                        )}
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