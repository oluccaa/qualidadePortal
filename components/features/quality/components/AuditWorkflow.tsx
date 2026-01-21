import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Key, Activity, FileText, ArrowRight, ShieldCheck, 
  Truck, Gavel, UserCheck, Lock, Award, Mail, AlertTriangle, XCircle,
  MessageSquare, Eye, User, Plus, X
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
  
  // Estados Locais para Flags e Observações (Draft antes de assinar)
  const [docNotes, setDocNotes] = useState(metadata?.documentalNotes || '');
  const [docFlags, setDocFlags] = useState<string[]>(metadata?.documentalFlags || []);
  const [newDocFlag, setNewDocFlag] = useState('');

  const [physNotes, setPhysNotes] = useState(metadata?.physicalNotes || '');
  const [physFlags, setPhysFlags] = useState<string[]>(metadata?.physicalFlags || []);
  const [newPhysFlag, setNewPhysFlag] = useState('');

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

  const addFlag = (type: 'doc' | 'phys') => {
    if (type === 'doc' && newDocFlag.trim()) {
      setDocFlags([...docFlags, newDocFlag.trim()]);
      setNewDocFlag('');
    } else if (type === 'phys' && newPhysFlag.trim()) {
      setPhysFlags([...physFlags, newPhysFlag.trim()]);
      setNewPhysFlag('');
    }
  };

  const removeFlag = (type: 'doc' | 'phys', index: number) => {
    if (type === 'doc') setDocFlags(docFlags.filter((_, i) => i !== index));
    else setPhysFlags(physFlags.filter((_, i) => i !== index));
  };

  const isRejected = metadata?.status === QualityStatus.REJECTED;
  const clientRep = sigs.step5_partner_verdict || sigs.step6_consolidation_client || sigs.step2_documental;

  return (
    <div className="space-y-6 pb-24">
        
        {/* 1. LIBERAÇÃO VITAL (SGQ) */}
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

        {/* 2. CONFERÊNCIA DE DADOS */}
        <StepCard step={2} title="2. Conferência de Dados" completed={s2} active={s1 && !s2} signature={sigs.step2_documental} icon={FileText}>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <button 
                        disabled={!s1}
                        onClick={() => navigate(`/preview/${fileId}?mode=audit`)} 
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            s1 ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-50'
                        }`}
                    >
                        {isQuality && s2 ? <><Eye size={16} /> Ver Notas do Parceiro</> : <><FileText size={16} /> Estação de Anotação</>}
                    </button>
                </div>

                {/* Flags e Notas - Disponíveis para Cliente (Edit) ou Quality (View) */}
                {(isClient && s1 && !s2) || (s2) ? (
                    <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Flags de Auditoria</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(s2 ? (metadata?.documentalFlags || []) : docFlags).map((flag, idx) => (
                                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                                        {flag}
                                        {isClient && !s2 && <button onClick={() => removeFlag('doc', idx)} className="text-red-400 hover:text-red-600"><X size={10}/></button>}
                                    </span>
                                ))}
                                {isClient && !s2 && (
                                    <div className="flex gap-1 w-full mt-2">
                                        <input 
                                            type="text" 
                                            placeholder="Nova flag..." 
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                                            value={newDocFlag}
                                            onChange={e => setNewDocFlag(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addFlag('doc')}
                                        />
                                        <button onClick={() => addFlag('doc')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={14}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações do Laudo</label>
                            <textarea 
                                readOnly={s2 || !isClient}
                                value={s2 ? (metadata?.documentalNotes || '') : docNotes}
                                onChange={e => setDocNotes(e.target.value)}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                                placeholder="Descreva observações técnicas sobre o documento..."
                            />
                        </div>
                    </div>
                ) : null}

                {isClient && s1 && !s2 && (
                    <button 
                        onClick={() => handleAction('step2_documental', { documentalStatus: 'APPROVED', documentalNotes: docNotes, documentalFlags: docFlags })}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        Assinar Validação de Dados
                    </button>
                )}
            </div>
        </StepCard>

        {/* 3. VISTORIA DE CARGA */}
        <StepCard step={3} title="3. Vistoria de Carga" completed={s3} active={s1 && !s3} signature={sigs.step3_physical} icon={Truck}>
            <div className="space-y-5">
                {(isClient && s1 && !s3) || (s3) ? (
                    <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ocorrências Físicas (Flags)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(s3 ? (metadata?.physicalFlags || []) : physFlags).map((flag, idx) => (
                                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                                        {flag}
                                        {isClient && !s3 && <button onClick={() => removeFlag('phys', idx)} className="text-red-400 hover:text-red-600"><X size={10}/></button>}
                                    </span>
                                ))}
                                {isClient && !s3 && (
                                    <div className="flex gap-1 w-full mt-2">
                                        <input 
                                            type="text" 
                                            placeholder="Nova flag física..." 
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                                            value={newPhysFlag}
                                            onChange={e => setNewPhysFlag(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addFlag('phys')}
                                        />
                                        <button onClick={() => addFlag('phys')} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus size={14}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações de Recebimento</label>
                            <textarea 
                                readOnly={s3 || !isClient}
                                value={s3 ? (metadata?.physicalNotes || '') : physNotes}
                                onChange={e => setPhysNotes(e.target.value)}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                                placeholder="Relate o estado físico do lote..."
                            />
                        </div>
                    </div>
                ) : null}

                {isClient && s1 && !s3 && (
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleAction('step3_physical', { physicalStatus: 'APPROVED', physicalNotes: physNotes, physicalFlags: physFlags })}
                            className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                        >
                            Aprovar Carga
                        </button>
                        <button 
                            onClick={() => handleAction('step3_physical', { physicalStatus: 'REJECTED', physicalNotes: physNotes, physicalFlags: physFlags })}
                            className="py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                        >
                            Rejeitar Carga
                        </button>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 4. ARBITRAGEM TÉCNICA */}
        <StepCard step={4} title="4. Arbitragem Técnica" completed={isStep4Done} active={s2 && s3 && isArbitrationNeeded && !s4} signature={sigs.step4_arbitrage} icon={Gavel}>
            <div className="space-y-4">
                {isStep4AutoCompleted && !s4 && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <ShieldCheck size={18} className="text-emerald-600" />
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">Conformidade Detectada: Sem necessidade de arbitragem.</p>
                    </div>
                )}
                {isQuality && isArbitrationNeeded && !s4 && (
                    <div className="space-y-4">
                        <textarea 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs min-h-[100px] outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                            placeholder="Descreva a contestação técnica ou justificativa de mediação..."
                            value={arbitrationText}
                            onChange={(e) => setArbitrationText(e.target.value)}
                        />
                        <button 
                            disabled={!arbitrationText.trim() || isSyncing}
                            onClick={() => handleAction('step4_arbitrage', { arbitrationNotes: arbitrationText })}
                            className="w-full py-4 bg-[#132659] text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] shadow-xl"
                        >
                            {isSyncing ? <Activity className="animate-spin" size={16}/> : "Assinar Arbitragem Técnica"}
                        </button>
                    </div>
                )}
                {s4 && metadata?.arbitrationNotes && (
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={12} /> Nota de Mediação:</p>
                        <p className="text-xs text-blue-900 font-medium italic leading-relaxed">"{metadata.arbitrationNotes}"</p>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 5. VEREDITO DO PARCEIRO */}
        <StepCard step={5} title="5. Veredito do Parceiro" completed={s5} active={isStep4Done && !s5} signature={sigs.step5_partner_verdict} icon={UserCheck}>
            <div className="space-y-4">
                {isClient && isStep4Done && !s5 && (
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleAction('step5_partner_verdict', { status: QualityStatus.APPROVED })} className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Aceitar Lote</button>
                        <button onClick={() => handleAction('step5_partner_verdict', { status: QualityStatus.REJECTED })} className="py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Rejeitar Lote</button>
                    </div>
                )}
                {s5 && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${metadata?.status === QualityStatus.APPROVED ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${metadata?.status === QualityStatus.APPROVED ? 'bg-emerald-100 border-emerald-200' : 'bg-red-100 border-red-200'}`}>
                            {metadata?.status === QualityStatus.APPROVED ? <Check size={18} strokeWidth={4} /> : <XCircle size={18} strokeWidth={2.5} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-tight opacity-70">Resultado do Veredito:</p>
                            <p className="text-xs font-black uppercase tracking-widest">{metadata?.status === QualityStatus.APPROVED ? 'Lote Aceito' : 'Lote Rejeitado'}</p>
                        </div>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 6. CONSOLIDAÇÃO DIGITAL */}
        <StepCard step={6} title="6. Consolidação Digital" completed={s6} active={s5 && !s6} icon={Lock}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <StatusSlot label="Representante Cliente" signed={s6_c} signature={sigs.step6_consolidation_client} />
                    <StatusSlot label="Analista Qualidade" signed={s6_q} signature={sigs.step6_consolidation_quality} />
                </div>
                {s5 && !s6 && (
                    <>
                        {isClient && !s6_c && <button onClick={() => handleAction('step6_consolidation_client', {})} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Assinar Selo (Cliente)</button>}
                        {isQuality && !s6_q && <button onClick={() => handleAction('step6_consolidation_quality', {})} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Assinar Selo (Qualidade)</button>}
                    </>
                )}
            </div>
        </StepCard>

        {/* 7. PROTOCOLO VITAL CERTIFICADO (Otimizado) */}
        <StepCard step={7} title="7. Protocolo Vital Certificado" completed={s6} active={s6} icon={Award}>
            {s6 && (
                <div className="animate-in fade-in zoom-in-95 duration-700">
                    {!isRejected ? (
                        <div className="flex items-center gap-5 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldCheck size={28} className="text-emerald-600 animate-bounce" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-emerald-900 uppercase tracking-tight">Certificação Concluída</h4>
                                <p className="text-[11px] text-emerald-700 font-medium">Lote homologado para utilização industrial.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-5 bg-red-50 rounded-2xl border border-red-100">
                                <AlertTriangle size={24} className="text-red-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-black text-red-900 uppercase tracking-tight">Lote Rejeitado</h4>
                                    <p className="text-[10px] text-red-700 font-medium leading-tight">
                                        {isQuality 
                                            ? "O parceiro entrará em contato para conciliação técnica." 
                                            : "Divergência impeditiva detectada. Contate a Qualidade para conciliação."}
                                    </p>
                                </div>
                            </div>

                            {isQuality && clientRep && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                    <header className="flex items-center gap-2 text-slate-400">
                                        <User size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Intervenção de Gestão: Contato do Cliente</span>
                                    </header>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-slate-800 uppercase truncate">{clientRep.userName}</p>
                                            <p className="text-[10px] text-blue-600 font-bold truncate lowercase">{clientRep.userEmail}</p>
                                        </div>
                                        <a href={`mailto:${clientRep.userEmail}`} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-all"><Mail size={14} /></a>
                                    </div>
                                </div>
                            )}
                            
                            {!isQuality && (
                                <div className="flex items-center justify-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <Mail size={12} className="text-red-400" />
                                    <span className="text-[10px] font-mono font-bold text-slate-500">qualidade_adm@acosvital.com.br</span>
                                </div>
                            )}
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
        {signature && <p className="text-[8px] text-slate-500 mt-1 truncate">{signature.userName}</p>}
    </div>
);

const StepCard = ({ title, active, completed, signature, children, icon: Icon }: any) => {
    const statusColor = completed ? 'bg-emerald-500' : active ? 'bg-[#132659]' : 'bg-slate-200';
    return (
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${active ? 'bg-white border-blue-200 shadow-xl scale-[1.01]' : completed ? 'bg-white border-emerald-50 opacity-90' : 'bg-slate-50 border-slate-100 opacity-40 grayscale'}`}>
            <div className="flex items-start gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-4 border-white shadow-lg transition-colors ${statusColor} text-white`}>
                    {completed ? <Check size={28} strokeWidth={4} /> : <Icon size={24} />}
                </div>
                <div className="flex-1 space-y-4 min-w-0">
                    <header className="flex justify-between items-start">
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${active ? 'text-[#132659]' : completed ? 'text-slate-800' : 'text-slate-400'}`}>{title}</h3>
                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">{completed ? 'VALIDADO' : active ? 'EM ANÁLISE' : 'AGUARDANDO'}</span>
                        </div>
                        {completed && <ShieldCheck size={20} className="text-emerald-500" />}
                    </header>
                    {children && <div className="animate-in fade-in slide-in-from-top-2 duration-500">{children}</div>}
                    {signature && (
                        <div className="mt-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[3px] mb-1">Assinatura Digital Auditada:</p>
                                <div className="flex flex-col"><p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{signature.userName}</p><p className="text-[9px] text-blue-600 font-bold underline opacity-70 lowercase truncate">{signature.userEmail}</p></div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] font-black text-slate-700 font-mono">{new Date(signature.timestamp).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[9px] font-black text-slate-400 font-mono">{new Date(signature.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (SP)</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};