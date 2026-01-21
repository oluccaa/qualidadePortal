import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Hand, Pencil, Highlighter, Square, Circle, 
  Eraser, Download, PlayCircle, Loader2, ChevronLeft, 
  ChevronRight, ZoomIn, ZoomOut, Plus, Save, Undo, Redo, 
  FileCheck, FileOutput, ClipboardList, Eye
} from 'lucide-react';
import { useAuth } from '../../context/authContext.tsx';
import { useFilePreview } from '../../components/features/files/hooks/useFilePreview.ts';
import { PdfViewport } from '../../components/features/files/components/PdfViewport.tsx';
import { DrawingCanvas, DrawingTool } from '../../components/features/files/components/DrawingCanvas.tsx';
import { UserRole, normalizeRole, FileNode, DocumentAnnotations } from '../../types/index.ts';
import { useToast } from '../../context/notificationContext.tsx';

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' }
];

export const FilePreviewPage: React.FC = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const role = normalizeRole(user?.role);
  const isAuditMode = searchParams.get('mode') === 'audit';
  const canAnnotate = role === UserRole.CLIENT;
  const isQuality = role === UserRole.QUALITY || role === UserRole.ADMIN;
  
  const [activeTool, setActiveTool] = useState<DrawingTool>('hand');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [numPages, setNumPages] = useState(0);

  const [annotations, setAnnotations] = useState<DocumentAnnotations>({});
  const initialFileStub = useMemo(() => ({ id: fileId } as FileNode), [fileId]);

  const {
    currentFile, url, pageNum, setPageNum, zoom, setZoom,
    handleDownload, handleUpdateMetadata, isSyncing
  } = useFilePreview(user, initialFileStub);

  useEffect(() => {
    if (currentFile?.metadata?.documentalDrawings) {
      try {
        const saved = JSON.parse(currentFile.metadata.documentalDrawings);
        setAnnotations(saved);
      } catch (e) { console.error(e); }
    }
  }, [currentFile?.id]);

  const handleGoToWorkflow = () => {
    navigate(`/quality/inspection/${fileId}`);
  };

  const handleReturn = () => {
    if (isAuditMode || isQuality) {
      navigate(`/quality/inspection/${fileId}`);
    } else {
      navigate(-1);
    }
  };

  const handleSaveAndReturn = async () => {
    if (!currentFile || !canAnnotate) return;
    try {
        await handleUpdateMetadata({ 
            documentalDrawings: JSON.stringify(annotations)
        });
        showToast("Estação de Anotação sincronizada.", "success");
        navigate(`/quality/inspection/${fileId}`);
    } catch (e) {
        showToast("Erro ao persistir no Ledger.", "error");
    }
  };

  const handleUndo = () => {
    if (!canAnnotate) return;
    setAnnotations(prev => {
        const pageItems = prev[pageNum] || [];
        if (pageItems.length === 0) return prev;
        return { ...prev, [pageNum]: pageItems.slice(0, -1) };
    });
  };

  return (
    <div className="h-screen w-screen bg-[#020617] flex flex-col overflow-hidden font-sans text-slate-200">
      <header className="h-16 flex items-center justify-between px-6 bg-[#081437]/90 backdrop-blur-xl border-b border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleReturn} 
            className="p-2 text-slate-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-white text-xs font-black uppercase tracking-[3px] truncate max-w-md">
              {currentFile?.name || "Sincronizando Ativo..."}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isAuditMode ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {isQuality ? 'Modo de Inspeção (Leitura)' : isAuditMode ? 'Sessão de Auditoria Ativa' : 'Visualização Técnica'}
                </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            {isAuditMode && canAnnotate ? (
                <>
                    <button 
                        onClick={handleSaveAndReturn}
                        disabled={isSyncing || !url}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] flex items-center gap-2 transition-all shadow-lg"
                    >
                        <Save size={14} /> Persistir Alterações
                    </button>
                </>
            ) : isQuality ? (
                <button 
                  onClick={handleGoToWorkflow}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] flex items-center gap-2 transition-all shadow-lg"
                >
                  <ClipboardList size={14} /> Retornar ao Fluxo
                </button>
            ) : null}
            
            <button 
              onClick={handleDownload}
              disabled={!url}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2 transition-all"
            >
              <Download size={14} /> {canAnnotate ? 'Laudo Original' : 'Exportar PDF'}
            </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden bg-[#020617]">
        {url ? (
          <PdfViewport 
            url={url} pageNum={pageNum} zoom={zoom} 
            onPdfLoad={setNumPages} 
            isHandToolActive={activeTool === 'hand'}
            renderOverlay={(w, h) => (
              <DrawingCanvas 
                tool={canAnnotate ? activeTool : 'hand'} 
                color={selectedColor} 
                width={w} height={h} 
                pageAnnotations={annotations[pageNum] || []}
                onAnnotationsChange={(newItems) => {
                  if (canAnnotate) {
                    setAnnotations(prev => ({ ...prev, [pageNum]: newItems }));
                  }
                }}
              />
            )}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-4">
             <Loader2 size={40} className="animate-spin text-blue-500" />
             <p className="text-[10px] font-black uppercase tracking-[4px]">Acessando Viewport Vital...</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#081437]/95 backdrop-blur-3xl border border-white/10 p-2.5 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10">
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5 px-4">
          <button disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)} className="p-2 text-slate-400 hover:text-white disabled:opacity-20 transition-all"><ChevronLeft size={18} /></button>
          <span className="text-[10px] font-black text-blue-400 min-w-[50px] text-center tracking-[2px]">{pageNum} / {numPages || '--'}</span>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum(pageNum + 1)} className="p-2 text-slate-400 hover:text-white disabled:opacity-20 transition-all"><ChevronRight size={18} /></button>
        </div>

        <div className="flex items-center gap-1.5 px-1 border-r border-white/10">
          <ToolButton icon={Hand} active={activeTool === 'hand'} onClick={() => { setActiveTool('hand'); setShowToolsMenu(false); }} label="Mãozinha" />
          {isAuditMode && canAnnotate && (
            <>
              <div className="relative">
                <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`p-3 rounded-xl transition-all flex flex-col items-center gap-0.5 ${showToolsMenu ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                  <Plus size={18} className={showToolsMenu ? 'rotate-45' : ''} />
                  <span className="text-[7px] font-black uppercase">MAIS</span>
                </button>
                {showToolsMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#081437] border border-white/10 p-3 rounded-[2rem] shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-4 min-w-[220px]">
                    <div className="flex flex-wrap justify-center gap-1">
                      <ToolButton icon={Pencil} active={activeTool === 'pencil'} onClick={() => { setActiveTool('pencil'); setShowToolsMenu(false); }} label="Lápis" />
                      <ToolButton icon={Highlighter} active={activeTool === 'marker'} onClick={() => { setActiveTool('marker'); setShowToolsMenu(false); }} label="Grifo" />
                      <ToolButton icon={Square} active={activeTool === 'rect'} onClick={() => { setActiveTool('rect'); setShowToolsMenu(false); }} label="Retâng." />
                      <ToolButton icon={Circle} active={activeTool === 'circle'} onClick={() => { setActiveTool('circle'); setShowToolsMenu(false); }} label="Círc." />
                      <ToolButton icon={Eraser} active={activeTool === 'eraser'} onClick={() => { setActiveTool('eraser'); setShowToolsMenu(false); }} label="Borracha" />
                    </div>
                    <div className="h-px bg-white/10 mx-2" />
                    <div className="flex justify-center gap-3 py-1">
                      {COLORS.map(c => (
                        <button key={c.value} onClick={() => { setSelectedColor(c.value); setShowToolsMenu(false); }} className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: c.value }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <ToolButton icon={Undo} onClick={handleUndo} label="Desfazer" disabled={(annotations[pageNum] || []).length === 0} />
            </>
          )}
          {isQuality && Object.keys(annotations).length > 0 && (
             <div className="p-3 text-emerald-400 flex flex-col items-center gap-0.5">
                <Eye size={18} />
                <span className="text-[7px] font-black uppercase">NOTAS</span>
             </div>
          )}
        </div>

        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <ToolButton icon={ZoomOut} onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} label="Z-" />
          <ToolButton icon={ZoomIn} onClick={() => setZoom(Math.min(3, zoom + 0.2))} label="Z+" />
        </div>

        {canAnnotate && !isAuditMode && (
           <button onClick={handleGoToWorkflow} className="ml-2 px-8 py-3 bg-[#b23c0e] hover:bg-orange-600 text-white rounded-full font-black text-[10px] uppercase tracking-[3px] shadow-xl active:scale-95 flex items-center gap-3 transition-all">
              <PlayCircle size={18} /> INICIAR AUDITORIA
           </button>
        )}
        
        {isAuditMode && canAnnotate && (
           <button onClick={handleSaveAndReturn} className="ml-2 px-8 py-3 bg-white text-[#081437] hover:bg-blue-50 rounded-full font-black text-[10px] uppercase tracking-[3px] shadow-xl active:scale-95 flex items-center gap-3 border border-white/10 transition-all">
              <ClipboardList size={18} className="text-blue-600" /> RETOMAR FLUXO
           </button>
        )}
      </div>
    </div>
  );
};

const ToolButton = ({ icon: Icon, active, onClick, label, disabled }: any) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    title={label}
    className={`p-3 rounded-xl transition-all relative group flex items-center justify-center disabled:opacity-20 active:scale-90 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
  >
    <Icon size={18} strokeWidth={active ? 3 : 2} />
  </button>
);

export default FilePreviewPage;