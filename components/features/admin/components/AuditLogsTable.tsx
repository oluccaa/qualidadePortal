import React from 'react';
import { Eye, Filter, Zap, ShieldCheck, FileText, Lock, Award, Key, Truck, Gavel, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuditLog } from '../../../../types/index.ts';

interface AuditLogsTableProps {
    logs: AuditLog[];
    severityFilter: string;
    onSeverityChange: (sev: string) => void;
    onInvestigate: (log: AuditLog) => void;
}

const SEVERITY_CONFIG: Record<string, string> = {
  INFO: 'bg-blue-50 text-blue-700 border-blue-100',
  WARNING: 'bg-orange-50 text-orange-700 border-orange-100',
  ERROR: 'bg-red-50 text-red-700 border-red-100',
  CRITICAL: 'bg-red-600 text-white border-red-700 font-black animate-pulse',
};

/**
 * Mapeamento de Ações Industriais para Linguagem Amigável (Business Language)
 */
const getActionDisplay = (action: string) => {
  const mapping: Record<string, { label: string; icon: any; color: string }> = {
    // 7 Passos do Fluxo Vital
    'SIGN_STEP1_RELEASE': { label: 'Liberação Vital (SGQ)', icon: Key, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'SIGN_STEP2_DOCUMENTAL': { label: 'Conferência de Dados', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    'SIGN_STEP3_PHYSICAL': { label: 'Vistoria de Carga', icon: Truck, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    'SIGN_STEP4_ARBITRAGE': { label: 'Arbitragem Técnica', icon: Gavel, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    'SIGN_STEP5_PARTNER_VERDICT': { label: 'Veredito do Parceiro', icon: UserCheck, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'SIGN_STEP6_CONSOLIDATION_CLIENT': { label: 'Selo Digital (Cliente)', icon: Lock, color: 'bg-slate-100 text-slate-800 border-slate-300' },
    'SIGN_STEP6_CONSOLIDATION_QUALITY': { label: 'Selo Digital (Qualidade)', icon: Lock, color: 'bg-slate-100 text-slate-800 border-slate-300' },
    'SIGN_STEP7_CERTIFICATION': { label: 'Protocolo Certificado', icon: Award, color: 'bg-amber-50 text-amber-700 border-amber-300' },

    // Ações de Arquivo
    'FILE_VIEW': { label: 'Leitura de Certificado', icon: Eye, color: 'bg-slate-50 text-slate-600 border-slate-200' },
    'CLIENT_FILE_VIEW': { label: 'Visualização pelo Cliente', icon: Eye, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    'FILE_DOWNLOAD': { label: 'Download de Ativo', icon: FileText, color: 'bg-slate-50 text-slate-600 border-slate-200' },
    'FILE_RENAME': { label: 'Alteração de Nome', icon: FileText, color: 'bg-slate-50 text-slate-600 border-slate-200' },

    // Gestão de Cadastros
    'USER_REGISTERED': { label: 'Novo Acesso Criado', icon: Zap, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    'CLIENT_CREATE': { label: 'Nova Empresa Cadastrada', icon: Zap, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    'CLIENT_UPDATE': { label: 'Dados da Empresa Atualizados', icon: Zap, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    'SYS_STATUS_CHANGE': { label: 'Alteração de Infraestrutura', icon: ShieldCheck, color: 'bg-red-50 text-red-700 border-red-200' },
    'SYSTEM_BACKUP_GENERATED': { label: 'Manifesto de Backup', icon: Lock, color: 'bg-slate-900 text-white border-slate-800' },
  };

  return mapping[action] || { label: action.replace(/_/g, ' '), icon: ShieldCheck, color: 'bg-slate-100 text-slate-600 border-slate-200' };
};

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({ 
    logs, 
    onInvestigate 
}) => {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-300">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-3 min-w-[1000px]">
                    <thead className="text-slate-400">
                        <tr>
                            <th className="px-8 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.timestamp')}</th>
                            <th className="px-8 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.user')}</th>
                            <th className="px-8 py-2 text-[9px] font-black uppercase tracking-[3px]">Operação Técnica</th>
                            <th className="px-8 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.target')}</th>
                            <th className="px-8 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.ip')}</th>
                            <th className="px-8 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <AuditLogRow 
                                key={log.id} 
                                log={log} 
                                onInvestigate={() => onInvestigate(log)} 
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AuditLogRow: React.FC<{ log: AuditLog, onInvestigate: () => void }> = ({ log, onInvestigate }) => {
  const display = getActionDisplay(log.action);
  const Icon = display.icon;

  return (
    <tr 
        className="group bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:shadow-xl border border-slate-100" 
        onClick={onInvestigate}
    >
        <td className="px-8 py-5 text-[11px] text-slate-500 font-mono first:rounded-l-[2rem]">
            <div className="flex flex-col">
                <span className="font-black text-slate-700">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                <span className="opacity-60">{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (SP)</span>
            </div>
        </td>
        <td className="px-8 py-5">
            <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{log.userName}</div>
            <div className="text-[9px] text-blue-600 font-black uppercase tracking-widest opacity-60">{log.userRole}</div>
        </td>
        <td className="px-8 py-5">
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 transition-all ${display.color}`}>
                <Icon size={14} strokeWidth={3} />
                <span className="text-[11px] font-black uppercase tracking-tight">{display.label}</span>
            </div>
        </td>
        <td className="px-8 py-5 max-w-[200px]">
            <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-tighter" title={log.target}>
                {log.target}
            </p>
        </td>
        <td className="px-8 py-5">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                {log.ip || '---.---.---.---'}
            </span>
        </td>
        <td className="px-8 py-5 text-right last:rounded-r-[2rem]">
            <button className="p-3 bg-slate-50 text-slate-400 group-hover:bg-[#132659] group-hover:text-white rounded-2xl transition-all shadow-sm group-active:scale-95 border border-transparent group-hover:border-[#132659]">
                <Eye size={16} />
            </button>
        </td>
    </tr>
  );
};