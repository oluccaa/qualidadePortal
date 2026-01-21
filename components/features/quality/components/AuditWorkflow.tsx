import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Key, Activity, FileText, ShieldCheck, 
  Truck, Gavel, UserCheck, Lock, Award, AlertTriangle, XCircle,
  MessageSquare, Eye, Plus, X, UploadCloud, RefreshCcw
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
  onUploadReplacement?: (file: File) => Promise<void>;
}

export const AuditWorkflow: React.FC<AuditWorkflowProps> = ({ 
    metadata, userRole, userName, userEmail, fileId, onUpdate, onUploadReplacement 
}) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [arbitrationText, setArbitrationText] = useState('');
  
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
  const isRejected = metadata?.status === QualityStatus.REJECTED;

  const createSignature = (action: string): AuditSignature => ({
    userId: userName.replace(/\s+/g, '_').toLowerCase(),
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    timestamp: new Date().toISOString(),
    action: action,
    ip: '189.120.32.44'
  });

  const handleAction = async (stepKey: keyof SteelBatchMetadata['signatures'], updates: any) => {
    setIsSyncing(true);
    try {
      const newSigs = { ...sigs, [stepKey]: createSignature(`SIGN_${stepKey.toUpperCase()}`) };
      await onUpdate({ ...updates, signatures: newSigs as any });
      showToast(`Assinatura registrada.`, "success");
    } catch (e) { 
      showToast("Falha técnica na sincronização.", "error"); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUploadReplacement) {
          setIsSyncing(true);
          try {
              await onUploadReplacement(file);
              showToast("Versão substituída com sucesso.", "success");
          } catch (err) {
              showToast("Erro no upload.", "error");
          } finally {
              setIsSyncing(false);
          }
      }
  };

  const addFlag = (type: 'doc' | 'phys') => {
    const val = type === 'doc' ? newDocFlag : newPhysFlag;
    if (!val.trim()) return;
    if (type === 'doc') { setDocFlags([...docFlags, val.trim()]); setNewDocFlag(''); }
    else { setPhysFlags([...physFlags, val.trim()]); setNewPhysFlag(''); }
  };

  return (
    <div className="space-y-4 pb-20">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />

        {/* 1. LIBERAÇÃO VITAL */}
        <StepCard step={1} title="1. Liberação Vital (SGQ)" completed={s1} active={!s1} signature={sigs.step1_release} icon={Key}>
          {isQuality && !s1 && (
            <button onClick={() => handleAction('step1_release', { status: QualityStatus.SENT })} className="w-full py-3 bg-[#132659] text-white rounded-xl font-black text-[10px] uppercase tracking-[2px] shadow-md hover:bg-blue-900 transition-all">
              {isSyncing ? <Activity className="animate-spin mx-auto" size={14}/> : "Autorizar Fluxo"}
            </button>
          )}
        </StepCard>

        {/* 2. CONFERÊNCIA DE DADOS */}
        <StepCard step={2} title="2. Conferência de Dados" completed={s2} active={s1 && !s2} signature={sigs.step2_documental} icon={FileText}>
            <div className="space-y-3">
                <button disabled={!s1} onClick={() => navigate(`/preview/${fileId}?mode=audit`)} className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${s1 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-300 border-slate-100 opacity-50'}`}>
                    <Eye size={14} /> Estação de Análise
                </button>

                {(isClient && s1 && !s2) || s2 ? (
                    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex flex-wrap gap-1.5">
                            {(s2 ? (metadata?.documentalFlags || []) : docFlags).map((flag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 uppercase">{flag}</span>
                            ))}
                            {isClient && !s2 && (
                                <div className="flex gap-1 w-full">
                                    <input type="text" placeholder="Tag..." className="flex-1 px-2 py-1 rounded border text-[10px] outline-none" value={newDocFlag} onChange={e => setNewDocFlag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFlag('doc')} />
                                    <button onClick={() => addFlag('doc')} className="p-1.5 bg-blue-600 text-white rounded"><Plus size={12}/></button>
                                </div>
                            )}
                        </div>
                        <textarea readOnly={s2 || !isClient} value={s2 ? (metadata?.documentalNotes || '') : docNotes} onChange={e => setDocNotes(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[11px] min-h-[60px] outline-none font-medium" placeholder="Notas do laudo..." />
                    </div>
                ) : null}

                {isClient && s1 && !s2 && (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleAction('step2_documental', { documentalStatus: 'APPROVED', documentalNotes: docNotes, documentalFlags: docFlags })} className="py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest">Conforme</button>
                        <button onClick={() => handleAction('step2_documental', { documentalStatus: 'REJECTED', documentalNotes: docNotes, documentalFlags: docFlags })} className="py-2.5 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest">Recusar</button>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 3. VISTORIA DE CARGA */}
        <StepCard step={3} title="3. Vistoria de Carga" completed={s3} active={s1 && !s3} signature={sigs.step3_physical} icon={Truck}>
            <div className="space-y-3">
                {(isClient && s1 && !s3) || s3 ? (
                    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex flex-wrap gap-1.5">
                            {(s3 ? (metadata?.physicalFlags || []) : physFlags).map((flag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 uppercase">{flag}</span>
                            ))}
                        </div>
                        <textarea readOnly={s3 || !isClient} value={s3 ? (metadata?.physicalNotes || '') : physNotes} onChange={e => setPhysNotes(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[11px] min-h-[60px] outline-none font-medium" placeholder="Notas de vistoria..." />
                    </div>
                ) : null}
                {isClient && s1 && !s3 && (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleAction('step3_physical', { physicalStatus: 'APPROVED', physicalNotes: physNotes, physicalFlags: physFlags })} className="py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest">Carga OK</button>
                        <button onClick={() => handleAction('step3_physical', { physicalStatus: 'REJECTED', physicalNotes: physNotes, physicalFlags: physFlags })} className="py-2.5 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest">Recusar</button>
                    </div>
                )}
            </div>
        </StepCard>

        {/* 4. ARBITRAGEM */}
        <StepCard step={4} title="4. Arbitragem Técnica" completed={isStep4Done} active={s2 && s3 && isArbitrationNeeded && !s4} signature={sigs.step4_arbitrage} icon={Gavel}>
            <div className="space-y-3">
                {isStep4AutoCompleted && !s4 && <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] font-bold text-emerald-700 uppercase tracking-tight">Sem divergências técnicas.</div>}
                {isQuality && isArbitrationNeeded && !s4 && (
                    <div className="space-y-2">
                        <textarea className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] min-h-[60px] outline-none font-medium" placeholder="Mediação..." value={arbitrationText} onChange={e => setArbitrationText(e.target.value)} />
                        <button onClick={() => handleAction('step4_arbitrage', { arbitrationNotes: arbitrationText })} className="w-full py-2.5 bg-[#132659] text-white rounded-lg font-black text-[9px] uppercase">Assinar Mediação</button>
                    </div>
                )}
                {s4 && metadata?.arbitrationNotes && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-900 italic">"{metadata.arbitrationNotes}"</div>
                )}
            </div>
        </StepCard>

        {/* 5. VEREDITO PARCEIRO */}
        <StepCard step={5} title="5. Veredito do Parceiro" completed={s5} active={isStep4Done && !s5} signature={sigs.step5_partner_verdict} icon={UserCheck}>
            {isClient && isStep4Done && !s5 && (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAction('step5_partner_verdict', { status: QualityStatus.APPROVED })} className="py-2.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase">Aceitar Lote</button>
                    <button onClick={() => handleAction('step5_partner_verdict', { status: QualityStatus.REJECTED })} className="py-2.5 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase">Rejeitar Lote</button>
                </div>
            )}
            {s5 && (
                <div className={`p-3 rounded-lg border flex items-center gap-3 ${metadata?.status === QualityStatus.APPROVED ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    {metadata?.status === QualityStatus.APPROVED ? <Check size={14} /> : <XCircle size={14} />}
                    <span className="text-[10px] font-black uppercase">{metadata?.status === QualityStatus.APPROVED ? 'Lote Homologado' : 'Lote Rejeitado'}</span>
                </div>
            )}
        </StepCard>

        {/* 6. CONSOLIDAÇÃO */}
        <StepCard step={6} title="6. Consolidação Digital" completed={s6} active={s5 && !s6} icon={Lock}>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <StatusSlot label="Cliente" signed={s6_c} />
                <StatusSlot label="Qualidade" signed={s6_q} />
            </div>
            {s5 && !s6 && (
                <>
                    {isClient && !s6_c && <button onClick={() => handleAction('step6_consolidation_client', {})} className="w-full py-2 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase">Selo Cliente</button>}
                    {isQuality && !s6_q && <button onClick={() => handleAction('step6_consolidation_quality', {})} className="w-full py-2 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase">Selo Qualidade</button>}
                </>
            )}
        </StepCard>

        {/* 7. RESULTADO / SUBSTITUIÇÃO */}
        <StepCard step={7} title="7. Protocolo Vital Certificado" completed={s6} active={s6} icon={Award}>
            {s6 && (
                <div className="animate-in fade-in duration-500">
                    {!isRejected ? (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <ShieldCheck size={20} className="text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-900 uppercase">Certificação Concluída</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-[10px] font-bold text-red-700 uppercase">Aguardando arquivo substituto (v{(metadata?.currentVersion || 1) + 1}.0)</div>
                            {onUploadReplacement && (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 flex flex-col items-center gap-2 group transition-all">
                                    <UploadCloud size={24} className="text-blue-400 group-hover:scale-110" />
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Upar Substituição</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </StepCard>
    </div>
  );
};

const StatusSlot = ({ label, signed }: any) => (
    <div className={`p-2 rounded-lg border text-center transition-all ${signed ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
        <p className="text-[7px] font-black text-slate-400 uppercase mb-1">{label}</p>
        <span className={`text-[9px] font-black uppercase ${signed ? 'text-emerald-600' : 'text-slate-300'}`}>{signed ? 'OK' : '...'}</span>
    </div>
);

const StepCard = ({ title, active, completed, signature, children, icon: Icon }: any) => {
    const statusColor = completed ? 'bg-emerald-500' : active ? 'bg-[#132659]' : 'bg-slate-200';
    return (
        <div className={`p-5 rounded-[1.5rem] border-2 transition-all ${active ? 'bg-white border-blue-100 shadow-md' : completed ? 'bg-white border-emerald-50 opacity-90' : 'bg-slate-50/50 border-slate-100 opacity-40 grayscale'}`}>
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${statusColor} text-white transition-colors`}>
                    {completed ? <Check size={20} strokeWidth={4} /> : <Icon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                    <header className="mb-2">
                        <h3 className={`text-[13px] font-black uppercase tracking-tight ${active ? 'text-[#132659]' : completed ? 'text-slate-800' : 'text-slate-400'}`}>{title}</h3>
                        <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-widest">{completed ? 'VALIDADO' : active ? 'EM ANÁLISE' : 'AGUARDANDO'}</span>
                    </header>
                    {children && <div className="animate-in fade-in slide-in-from-top-1 duration-300">{children}</div>}
                    {signature && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] font-bold uppercase text-slate-400">
                            <span className="truncate max-w-[150px]">{signature.userName}</span>
                            <span className="font-mono">{new Date(signature.timestamp).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};