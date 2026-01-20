import React from 'react';
import { Eye, Filter } from 'lucide-react';
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

const translateAction = (action: string): string => {
  const mapping: Record<string, string> = {
    'QUALITY_VEREDICT_APPROVED': 'Aprovação de Laudo Técnico',
    'QUALITY_VEREDICT_REJECTED': 'Reprovação de Laudo Técnico',
    'CLIENT_FLAGGED_DELETION': 'Sinalização para Exclusão',
    'CLIENT_CREATE': 'Cadastro de Nova Empresa',
    'CLIENT_UPDATE': 'Atualização de Dados Cadastrais',
    'CLIENT_DELETE': 'Exclusão de Registro',
    'USER_REGISTERED': 'Novo Usuário Credenciado',
    'USER_FLAGGED_DELETION': 'Usuário Sinalizado para Remoção',
    'SYS_STATUS_CHANGE': 'Alteração do Status do Sistema',
    'SYSTEM_BACKUP_GENERATED': 'Geração de Backup Master',
    'FILE_VIEW': 'Visualização de Documento',
    'FILE_DOWNLOAD': 'Download de Documento',
    'CLIENT_FILE_VIEW': 'Leitura de Certificado pelo Parceiro',
    'REVIEW_SUBMITTED_APPROVED': 'Aceite de Certificado Confirmado',
    'REVIEW_SUBMITTED_REJECTED': 'Contestação de Certificado Enviada'
  };
  return mapping[action] || action.replace(/_/g, ' ');
};

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({ 
    logs, 
    onInvestigate 
}) => {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-300">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
                    <thead className="text-slate-400">
                        <tr>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.timestamp')}</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.user')}</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.action')}</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.target')}</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.ip')}</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[3px]">{t('admin.stats.headers.severity')}</th>
                            <th className="px-6 py-2"></th>
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

const AuditLogRow: React.FC<{ log: AuditLog, onInvestigate: () => void }> = ({ log, onInvestigate }) => (
  <tr 
    className="group bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:shadow-md border border-slate-100" 
    onClick={onInvestigate}
  >
      <td className="px-6 py-4 text-[11px] text-slate-500 font-mono first:rounded-l-2xl">
          {new Date(log.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}
      </td>
      <td className="px-6 py-4">
          <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{log.userName}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{log.userRole}</div>
      </td>
      <td className="px-6 py-4">
          <span className="text-[11px] font-black text-blue-900 uppercase tracking-tight bg-blue-50 px-2 py-1 rounded-lg">
            {translateAction(log.action)}
          </span>
      </td>
      <td className="px-6 py-4 max-w-[200px]">
          <p className="text-[10px] text-slate-500 font-medium truncate uppercase" title={log.target}>
            {log.target}
          </p>
      </td>
      <td className="px-6 py-4">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
            {log.ip || '---'}
          </span>
      </td>
      <td className="px-6 py-4">
          <SeverityBadge severity={log.severity} />
      </td>
      <td className="px-6 py-4 text-right last:rounded-r-2xl">
          <button className="p-2 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-all shadow-sm">
              <Eye size={14} />
          </button>
      </td>
  </tr>
);

const SeverityBadge = ({ severity }: { severity: string }) => {
  const colorClass = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO;
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${colorClass}`}>
        {severity}
    </span>
  );
};