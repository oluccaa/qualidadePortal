
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Hand, Pencil, Highlighter, Square, Circle, 
  Eraser, Download, PlayCircle, Loader2, ChevronLeft, 
  ChevronRight, ZoomIn, ZoomOut, Plus, Save, Undo, 
  ClipboardList, Eye, Maximize2
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
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#eab308' }
];

export const FilePreviewPage: React.FC = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const initialFileStub = useMemo(() => ({ id: fileId } as FileNode), [fileId]);
  const {
    currentFile, url, pageNum, setPageNum, zoom, setZoom,
    handleDownload, handleUpdateMetadata, isSyncing
  } = useFilePreview(user, initialFileStub);

  const role = normalizeRole(user?.role);
  
  // CONTEXTO DE VISUALIZAÇÃO
  const isAuditMode = searchParams.get('mode') === 'audit';
  const showNotesParam = searchParams.get('notes') === 'true';
  
  // Só mostramos as anotações se estivermos em modo auditoria ou se o fluxo solicitou explicitamente ver as notas
  const shouldShowAnnotations = isAuditMode || showNotesParam;

  const isStep2Finished = !!currentFile?.metadata?.signatures?.step2_documental;
  const canAnnotate = role === UserRole.CLIENT && !isStep2Finished;
  const isQuality = role === UserRole.QUALITY || role === UserRole.ADMIN;
  
  const [activeTool, setActiveTool] = useState<DrawingTool>('hand');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [annotations, setAnnotations] = useState<DocumentAnnotations>({});

  useEffect(() => {
    if (currentFile?.metadata?.documentalDrawings) {
      try {
        setAnnotations(JSON.parse(currentFile.metadata.documentalDrawings));
      } catch (e) { console.error("Erro de parse nas anotações"); }
    }
  }, [currentFile?.id, currentFile?.metadata?.documentalDrawings]);

  const handleReturn = () => {
    if (isAuditMode || isQuality || showNotesParam) navigate(`/quality/inspection/${fileId}`);
    else navigate(-1);
  };

  const handlePersistChanges = async () => {
    if (!currentFile || !canAnnotate) return;
    try {
        await handleUpdateMetadata({ documentalDrawings: JSON.stringify(annotations) });
        showToast("Estação de Anotação sincronizada.", "success");
    } catch (e) {
        showToast("Falha na persistência.", "error");
    }
  };

  return (
    <div className="h-screen w-screen bg-[#020617] flex flex-col overflow-hidden font-sans text-slate-200 selection:bg-blue-500/30">
      
      {/* Header Estilo "Lab" */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#081437]/60 backdrop-blur-2xl border-b border-white/5 z-50 shrink-0 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={handleReturn} className="p-2 text-slate-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5"><ArrowLeft size={18} /></button>
          <div className="h-4 w-px bg-white/10" />
          <div className="min-w-0">
            <h2 className="text-white text-[10px] font-black uppercase tracking-[3px] truncate max-w-md">{currentFile?.name || "CARREGANDO..."}</h2>
            <div className="flex items-center gap-2">
                <span className={`w-1 h-1 rounded-full ${isAuditMode ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                  {isStep2Finished ? 'Protocolo Certificado' : isAuditMode ? 'Sessão de Auditoria Ativa' : showNotesParam ? 'Revisão de Notas Técnicas' : 'Visualização de Laudo Original'}
                </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {(isAuditMode || showNotesParam) && (
                <button onClick={() => navigate(`/quality/inspection/${fileId}`)} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 flex items-center gap-2 transition-all">
                    <ClipboardList size={12} className="text-blue-400" /> Retomar Fluxo
                </button>
            )}

            {isAuditMode && canAnnotate && (
                <button onClick={handlePersistChanges} disabled={isSyncing || !url} className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                    <Save size={12} /> Persistir Alterações
                </button>
            )}
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button onClick={handleDownload} disabled={!url} title="Download Original" className="p-2 text-slate-400 hover:text-white transition-all"><Download size={18} /></button>
        </div>
      </header>

      {/* Área Principal: Motor Engine v4.5 */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#020617_100%)]">
        {url ? (
          <PdfViewport 
            url={url} pageNum={pageNum} zoom={zoom} 
            onPdfLoad={setNumPages} 
            isHandToolActive={activeTool === 'hand'}
            renderOverlay={(w, h) => shouldShowAnnotations ? (
              <DrawingCanvas 
                tool={canAnnotate ? activeTool : 'hand'} 
                color={selectedColor} 
                width={w} height={h} 
                pageAnnotations={annotations[pageNum] || []}
                onAnnotationsChange={(newItems) => canAnnotate && setAnnotations(prev => ({ ...prev, [pageNum]: newItems }))}
              />
            ) : null}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 gap-6">
             <div className="relative">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <div className="absolute inset-0 blur-2xl bg-blue-500/20 animate-pulse" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[6px] animate-pulse">Sincronizando Viewport Industrial</p>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-[#081437]/80 backdrop-blur-3xl border border-white/10 p-2 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10 duration-700">
        
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5">
          <button disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)} className="p-2.5 text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-90"><ChevronLeft size={18} /></button>
          <div className="px-4 min-w-[70px] text-center">
             <span className="text-[10px] font-black text-blue-400 tracking-[2px]">{pageNum} <span className="text-slate-600 mx-1">/</span> {numPages || '--'}</span>
          </div>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum(pageNum + 1)} className="p-2.5 text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-90"><ChevronRight size={18} /></button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <div className="flex items-center gap-1">
          <ToolBtn icon={Hand} active={activeTool === 'hand'} onClick={() => { setActiveTool('hand'); setShowToolsMenu(false); }} />
          {isAuditMode && canAnnotate && (
            <div className="relative">
              <button 
                onClick={() => setShowToolsMenu(!showToolsMenu)} 
                className={`p-2.5 rounded-full transition-all ${showToolsMenu ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <Plus size={20} className={showToolsMenu ? 'rotate-45' : ''} />
              </button>
              
              {showToolsMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 bg-[#081437] border border-white/10 p-3 rounded-[2.5rem] shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-1">
                    <ToolBtn icon={Pencil} active={activeTool === 'pencil'} onClick={() => { setActiveTool('pencil'); setShowToolsMenu(false); }} />
                    <ToolBtn icon={Highlighter} active={activeTool === 'marker'} onClick={() => { setActiveTool('marker'); setShowToolsMenu(false); }} />
                    <ToolBtn icon={Square} active={activeTool === 'rect'} onClick={() => { setActiveTool('rect'); setShowToolsMenu(false); }} />
                    <ToolBtn icon={Circle} active={activeTool === 'circle'} onClick={() => { setActiveTool('circle'); setShowToolsMenu(false); }} />
                    <ToolBtn icon={Eraser} active={activeTool === 'eraser'} onClick={() => { setActiveTool('eraser'); setShowToolsMenu(false); }} />
                  </div>
                  <div className="h-px bg-white/10 mx-2" />
                  <div className="flex justify-center gap-3 pb-1">
                    {COLORS.map(c => (
                      <button 
                        key={c.value} 
                        onClick={() => { setSelectedColor(c.value); setShowToolsMenu(false); }} 
                        className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === c.value ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-50'}`} 
                        style={{ backgroundColor: c.value }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <div className="flex items-center gap-1">
          <ToolBtn icon={ZoomOut} onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} />
          <div className="px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">{Math.round(zoom * 100)}%</div>
          <ToolBtn icon={ZoomIn} onClick={() => setZoom(Math.min(4, zoom + 0.25))} />
        </div>

        {shouldShowAnnotations && Object.keys(annotations).length > 0 && (
            <>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <div className="p-2.5 text-emerald-400 animate-pulse" title="Visualizando notas técnicas"><Eye size={18} /></div>
            </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </div>
  );
};

const ToolBtn = ({ icon: Icon, active, onClick, disabled }: any) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={`p-2.5 rounded-full transition-all relative group flex items-center justify-center disabled:opacity-10 active:scale-90 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
  >
    <Icon size={18} strokeWidth={active ? 3 : 2.5} />
  </button>
);

export default FilePreviewPage;
