import React from 'react';
import { CheckSquare, Square, Clock, HardDrive, Eye, Edit2, Trash2 } from 'lucide-react';
import { FileNode, FileType, UserRole } from '../../../../types/index.ts';
import { FileStatusBadge } from './FileStatusBadge.tsx';

interface FileRowProps {
  file: FileNode;
  isSelected: boolean;
  onNavigate: (id: string | null) => void;
  onPreview: (file: FileNode) => void;
  onToggleSelection: (fileId: string) => void;
  onRename: (file: FileNode) => void;
  onDelete: (fileId: string) => void;
  userRole: UserRole;
}

export const FileRow: React.FC<FileRowProps> = ({ 
  file, isSelected, onNavigate, onPreview, onToggleSelection, onRename, onDelete, userRole 
}) => {
  const isFolder = file.type === FileType.FOLDER;
  const isViewed = !!file.metadata?.viewedAt;
  const isClient = userRole === UserRole.CLIENT;
  const isRootFolder = isFolder && file.parentId === null;
  
  return (
    <div 
      className={`group flex items-center px-8 py-4 hover:bg-slate-50 transition-all cursor-pointer relative border-b border-slate-100 last:border-0
        ${isSelected ? 'bg-blue-50/50' : ''}`}
      onClick={() => isFolder ? onNavigate(file.id) : onPreview(file)}
      title={isFolder ? "Explorar Pasta" : "Abrir Certificado"}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={`text-[13px] tracking-tight uppercase transition-colors ${isSelected || isFolder ? 'font-bold text-slate-900' : 'font-medium text-slate-600 group-hover:text-slate-900'}`}>
            {file.name}
          </span>
          {isViewed && !isFolder && (
            <div className="flex items-center gap-1 text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100" title={`Visualizado pelo cliente`}>
               <Eye size={10} strokeWidth={3} />
               <span className="text-[8px] font-black uppercase">Visto</span>
            </div>
          )}
          {!isFolder && file.metadata?.batchNumber && (
            <span className="text-[8px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-[2px]">
              LOT: {file.metadata.batchNumber}
            </span>
          )}
        </div>
      </div>

      <div className="w-24 hidden lg:block text-[10px] font-bold text-slate-400 font-mono tracking-tighter text-right px-4">
        {isFolder ? '--' : file.size || '--'}
      </div>

      <div className="w-40 hidden md:block px-6">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <Clock size={12} className="text-slate-300" />
            {new Date(file.updatedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="w-32">
        {!isFolder ? (
            <FileStatusBadge status={file.metadata?.status} />
        ) : (
            <div className="flex items-center gap-1.5 text-slate-300">
               <HardDrive size={12} />
               <span className="text-[8px] font-black uppercase tracking-widest">Dossier</span>
            </div>
        )}
      </div>

      <div className="w-24 flex items-center justify-end gap-1">
        {!isClient && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onRename(file); }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
              title="Renomear"
            >
              <Edit2 size={14} />
            </button>
            {!isRootFolder && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSelection(file.id); }}
          className={`p-1.5 rounded-lg transition-all ${isSelected ? 'text-blue-600' : 'text-slate-200 hover:text-slate-400'}`}
        >
          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
        </button>
      </div>
    </div>
  );
};