
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Hand, Pencil, Highlighter, Square, Circle, 
  Eraser, Download, PlayCircle, Loader2, ChevronLeft, 
  ChevronRight, ZoomIn, ZoomOut, Plus, Save, Undo, 
  ClipboardList, Eye, RotateCcw, Type, Minus, Maximize,
  CheckCircle2, XCircle, RefreshCw
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

const LINE_WIDTHS = [
  { label: 'Fina', value: 2 },
  { label: 'Média', value: 5 },
  { label: 'Grossa', value: 10 },
  { label: 'Larga', value: 20 },
  { label: 'Ultra', value: 40 }
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
    handleDownload, handleUpdateMetadata, isSyncing, forceRefresh
  } = useFilePreview(user, initialFileStub);

  const role = normalizeRole(user?.role);
  const isAuditMode = searchParams.get('mode') === 'audit';
  const showNotesParam = searchParams.get('notes') === 'true';
  const shouldShowAnnotations = isAuditMode || showNotesParam;
  const isStep2Finished = !!currentFile?.metadata?.signatures?.step2_documental;
  const canAnnotate = role === UserRole.CLIENT && !isStep2Finished;
  
  const [activeTool, setActiveTool] = useState<DrawingTool>('hand');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [selectedWidth, setSelectedWidth] = useState(5);
  const [stampText, setStampText] = useState<'APROVADO' | 'REJEITADO'>('APROVADO');
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
    if (isAuditMode || showNotesParam || role !== UserRole.CLIENT) navigate(`/quality/inspection/${fileId}`);
    else navigate(-1);
  };

  const handlePersistChanges = async () => {
    if (!currentFile || !canAnnotate) return;
    try {
        await handleUpdateMetadata({ documentalDrawings: JSON.stringify(annotations) });
        showToast("Sessão sincronizada.", "success");
    } catch (e) { showToast("Erro de sincronia.", "error"); }
  };

  const handleResetView = () => {
    setZoom(1.0);
    showToast("Zoom restaurado para 100%", "info");
  };

  const handleUndo = () => {
    setAnnotations(prev => {
      const pageItems = prev[pageNum] || [];
      if (pageItems.length === 0) return prev;
      return { ...prev, [pageNum]: pageItems.slice(0, -1) };
    });
  };

  return (
    <div className="h-screen w-screen bg-[#020617] flex flex-col overflow-hidden font-sans text-slate-200">
      
      <header className="h-14 flex items-center justify-between px-6 bg-[#081437]/90 backdrop-blur-2xl border-b border-white/5 z-50 shrink-0 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={handleReturn} className="p-2 text-slate-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5"><ArrowLeft size={18} /></button>
          <div className="min-w-0">
            <h2 className="text-white text-[10px] font-black uppercase tracking-[3px] truncate max-w-md">{currentFile?.name || "CARREGANDO..."}</h2>
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
              {isStep2Finished ? 'Visualização de Auditoria (Leitura)' : isAuditMode ? 'Modo de Auditoria Ativo' : 'Visualização Padrão'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-lg animate-pulse">
                    <Loader2 size={12} className="animate-spin text-blue-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-300">Sync Ativo</span>
                </div>
            )}
            {isAuditMode && canAnnotate && (
                <button onClick={handlePersistChanges} disabled={isSyncing || !url} className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                    <Save size={12} /> Persistir Alterações
                </button>
            )}
            <button onClick={handleDownload} disabled={!url} className="p-2 text-slate-400 hover:text-white transition-all"><Download size={18} /></button>
        </div>
      </header>

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
                lineWidth={selectedWidth}
                stampText={stampText}
                width={w} height={h} 
                pageAnnotations={annotations[pageNum] || []}
                onAnnotationsChange={(newItems) => canAnnotate && setAnnotations(prev => ({ ...prev, [pageNum]: newItems }))}
              />
            ) : null}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in">
             <div className="relative">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <div className="absolute inset-0 blur-3xl bg-blue-500/20 animate-pulse" />
             </div>
             <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[6px] text-slate-400 animate-pulse">Sincronizando Viewport Industrial</p>
                {isSyncing && (
                    <button onClick={forceRefresh} className="flex items-center gap-2 mx-auto text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-all">
                        <RefreshCw size={10} /> Forçar Reconexão
                    </button>
                )}
             </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-[#081437]/90 backdrop-blur-3xl border border-white/10 p-2 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5">
          <button disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)} className="p-2.5 text-slate-400 hover:text-white disabled:opacity-20 transition-all"><ChevronLeft size={18} /></button>
          <div className="px-4 min-w-[70px] text-center font-mono text-[10px] text-blue-400 font-black">{pageNum} / {numPages || '--'}</div>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum(pageNum + 1)} className="p-2.5 text-slate-400 hover:text-white disabled:opacity-20 transition-all"><ChevronRight size={18} /></button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <div className="flex items-center gap-1">
          <ToolBtn icon={Hand} active={activeTool === 'hand'} onClick={() => setActiveTool('hand')} title="Mãozinha (Pan)" />
          
          {isAuditMode && canAnnotate && (
            <div className="relative">
              <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`p-2.5 rounded-full transition-all ${showToolsMenu ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                <Plus size={20} className={showToolsMenu ? 'rotate-45' : ''} />
              </button>
              
              {showToolsMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 bg-[#081437] border border-white/10 p-4 rounded-[2.5rem] shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 min-w-[280px]">
                  <div className="space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-[3px] text-center">Ferramentas de Traço</p>
                    <div className="flex justify-center gap-1">
                      <ToolBtn icon={Pencil} active={activeTool === 'pencil'} onClick={() => setActiveTool('pencil')} />
                      <ToolBtn icon={Highlighter} active={activeTool === 'marker'} onClick={() => setActiveTool('marker')} />
                      <ToolBtn icon={Square} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} />
                      <ToolBtn icon={Circle} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} />
                      <ToolBtn icon={Eraser} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-[3px] text-center">Espessura do Traço / Borracha</p>
                    <div className="flex bg-black/30 p-1 rounded-xl">
                      {LINE_WIDTHS.map(w => (
                        <button key={w.value} onClick={() => setSelectedWidth(w.value)} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${selectedWidth === w.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>{w.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-[3px] text-center">Carimbos de Auditoria</p>
                    <div className="flex gap-2">
                       <button onClick={() => { setActiveTool('stamp'); setStampText('APROVADO'); }} className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${activeTool === 'stamp' && stampText === 'APROVADO' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-emerald-600/10'}`}>
                          <CheckCircle2 size={16} />
                          <span className="text-[7px] font-black uppercase">APROVAR</span>
                       </button>
                       <button onClick={() => { setActiveTool('stamp'); setStampText('REJEITADO'); }} className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${activeTool === 'stamp' && stampText === 'REJEITADO' ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-red-600/10'}`}>
                          <XCircle size={16} />
                          <span className="text-[7px] font-black uppercase">REJEITAR</span>
                       </button>
                    </div>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-center gap-3">
                    {COLORS.map(c => (
                      <button key={c.value} onClick={() => setSelectedColor(c.value)} className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === c.value ? 'border-white scale-125' : 'border-transparent opacity-50'}`} style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {isAuditMode && canAnnotate && <ToolBtn icon={Undo} onClick={handleUndo} disabled={(annotations[pageNum] || []).length === 0} />}
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <div className="flex items-center gap-1">
          <ToolBtn icon={ZoomOut} onClick={() => setZoom(Math.max(0.2, zoom - 0.25))} />
          <button onClick={handleResetView} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black text-slate-400 transition-all uppercase tracking-widest">
            {Math.round(zoom * 100)}%
          </button>
          <ToolBtn icon={ZoomIn} onClick={() => setZoom(Math.min(5, zoom + 0.25))} />
          <ToolBtn icon={RotateCcw} onClick={handleResetView} title="Reset View" />
        </div>
      </div>
    </div>
  );
};

const ToolBtn = ({ icon: Icon, active, onClick, disabled, title }: any) => (
  <button 
    disabled={disabled} onClick={onClick} title={title}
    className={`p-2.5 rounded-full transition-all relative group flex items-center justify-center disabled:opacity-10 active:scale-90 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
  >
    <Icon size={18} strokeWidth={active ? 3 : 2.5} />
  </button>
);

export default FilePreviewPage;
