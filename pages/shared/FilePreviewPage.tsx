import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Hand, Pencil, Highlighter, Square, Circle, 
  Eraser, Download, PlayCircle, Loader2, ChevronLeft, 
  ChevronRight, ZoomIn, ZoomOut, Plus, Save, Undo
} from 'lucide-react';
import { useAuth } from '../../context/authContext.tsx';
import { useFilePreview } from '../../components/features/files/hooks/useFilePreview.ts';
import { PdfViewport } from '../../components/features/files/components/PdfViewport.tsx';
import { DrawingCanvas, DrawingTool } from '../../components/features/files/components/DrawingCanvas.tsx';
import { UserRole, normalizeRole, FileNode, DocumentAnnotations, AnnotationItem } from '../../types/index.ts';
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
  
  const mode = searchParams.get('mode');
  const [activeTool, setActiveTool] = useState<DrawingTool>('hand');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [numPages, setNumPages] = useState(0);

  const [annotations, setAnnotations] = useState<DocumentAnnotations>({});

  const initialFileStub = useMemo(() => ({ id: fileId } as FileNode), [fileId]);

  const {
    currentFile,
    url,
    pageNum,
    setPageNum,
    zoom,
    setZoom,
    handleDownload,
    handleUpdateMetadata,
    isSyncing
  } = useFilePreview(user, initialFileStub);

  useEffect(() => {
    if (currentFile?.metadata?.documentalDrawings) {
      try {
        const saved = JSON.parse(currentFile.metadata.documentalDrawings);
        setAnnotations(saved);
      } catch (e) {
        console.error("Falha ao analisar anotações salvas:", e);
      }
    }
  }, [currentFile?.id]);

  const handlePageAnnotationsChange = useCallback((page: number, newPageAnnotations: AnnotationItem[]) => {
    setAnnotations(prev => ({
      ...prev,
      [page]: newPageAnnotations
    }));
  }, []);

  const handleSaveAll = async () => {
    if (!currentFile) return;
    try {
        const jsonString = JSON.stringify(annotations);
        await handleUpdateMetadata({
            documentalDrawings: jsonString
        });
        showToast("Anotações técnicas sincronizadas com sucesso.", "success");
    } catch (e) {
        showToast("Falha ao persistir anotações no Ledger.", "error");
    }
  };

  const handleUndo = () => {
    setAnnotations(prev => {
        const pageItems = prev[pageNum] || [];
        if (pageItems.length === 0) return prev;
        return {
            ...prev,
            [pageNum]: pageItems.slice(0, -1)
        };
    });
  };

  const handleReturn = () => {
    if (mode === 'audit') {
        navigate(`/quality/inspection/${fileId}`);
    } else {
        navigate(-1);
    }
  };

  const role = normalizeRole(user?.role);

  return (
    <div className="h-screen w-screen bg-[#020617] flex flex-col overflow-hidden font-sans">
      <header className="h-16 flex items-center justify-between px-6 bg-[#081437]/95 backdrop-blur-xl border-b border-white/10 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleReturn}
            className="p-2 text-slate-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-white text-xs font-black uppercase tracking-[3px] truncate max-w-xs md:max-w-md">
              {currentFile?.name || "Sincronizando Ativo..."}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <button 
                onClick={handleSaveAll}
                disabled={isSyncing || !url}
                className="hidden sm:flex px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] items-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Persistir Alterações
            </button>
            <button 
              onClick={handleDownload}
              disabled={!url}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2 transition-all disabled:opacity-30"
            >
              <Download size={14} /> <span className="hidden md:inline">Original</span>
            </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden bg-[#020617]">
        {url ? (
          <PdfViewport 
            key={`${fileId}-${url}`}
            url={url} 
            pageNum={pageNum} 
            zoom={zoom} 
            onPdfLoad={setNumPages} 
            isHandToolActive={activeTool === 'hand'}
            renderOverlay={(w, h) => (
              <DrawingCanvas 
                tool={activeTool} 
                color={selectedColor} 
                width={w} 
                height={h} 
                pageAnnotations={annotations[pageNum] || []}
                onAnnotationsChange={(newItems) => handlePageAnnotationsChange(pageNum, newItems)}
              />
            )}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
             <Loader2 size={40} className="animate-spin text-blue-500" />
             <p className="text-[10px] font-black uppercase tracking-[4px] animate-pulse">Acessando Ledger Vital...</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#081437]/95 backdrop-blur-3xl border border-white/10 p-2.5 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10 duration-700">
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5 px-4">
          <button 
            disabled={pageNum <= 1 || !url}
            onClick={() => setPageNum(pageNum - 1)}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[10px] font-black text-blue-400 min-w-[50px] text-center tracking-[2px]">
            {pageNum} / {numPages || '--'}
          </span>
          <button 
            disabled={pageNum >= numPages || !url}
            onClick={() => setPageNum(pageNum + 1)}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-20"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-1 border-r border-white/10">
          <ToolButton 
            icon={Hand} 
            active={activeTool === 'hand'} 
            onClick={() => setActiveTool('hand')} 
            label="Mão" 
          />
          <div className="relative">
            {showMoreMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#081437] border border-white/10 p-2.5 rounded-[2rem] shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-1">
                  <ToolButton icon={Pencil} active={activeTool === 'pencil'} onClick={() => { setActiveTool('pencil'); setShowMoreMenu(false); }} label="Lápis" />
                  <ToolButton icon={Highlighter} active={activeTool === 'marker'} onClick={() => { setActiveTool('marker'); setShowMoreMenu(false); }} label="Marcador" />
                  <ToolButton icon={Square} active={activeTool === 'rect'} onClick={() => { setActiveTool('rect'); setShowMoreMenu(false); }} label="Retângulo" />
                  <ToolButton icon={Circle} active={activeTool === 'circle'} onClick={() => { setActiveTool('circle'); setShowMoreMenu(false); }} label="Círculo" />
                  <ToolButton icon={Eraser} active={activeTool === 'eraser'} onClick={() => { setActiveTool('eraser'); setShowMoreMenu(false); }} label="Borracha" />
                </div>
                <div className="h-px bg-white/10 mx-2" />
                <div className="flex items-center justify-center gap-3 py-1 px-3">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { setSelectedColor(c.value); setShowMoreMenu(false); }}
                      className={`w-6 h-6 rounded-full border-2 transition-all scale-100 hover:scale-125 ${selectedColor === c.value ? 'border-white shadow-lg' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            )}
            <button 
              disabled={!url}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`p-3 rounded-full transition-all flex items-center justify-center disabled:opacity-20 ${showMoreMenu ? 'bg-white text-[#081437]' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}
            >
              <Plus size={20} className={`transition-transform duration-300 ${showMoreMenu ? 'rotate-45' : 'rotate-0'}`} />
            </button>
          </div>

          <ToolButton 
            icon={Undo} 
            active={false} 
            onClick={handleUndo} 
            label="Desfazer" 
            disabled={(annotations[pageNum] || []).length === 0 || !url}
          />
        </div>

        <div className="flex items-center gap-1">
          <ToolButton icon={ZoomOut} onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} label="Zoom Out" disabled={!url} />
          <ToolButton icon={ZoomIn} onClick={() => setZoom(Math.min(3, zoom + 0.2))} label="Zoom In" disabled={!url} />
        </div>

        <button 
            onClick={handleReturn}
            disabled={!url}
            className="ml-2 px-8 py-3 bg-[#b23c0e] hover:bg-orange-600 text-white rounded-full font-black text-[10px] uppercase tracking-[3px] shadow-2xl active:scale-95 flex items-center gap-3 disabled:opacity-30 transition-all"
        >
            <PlayCircle size={18} /> RETORNAR AO FLUXO
        </button>
      </div>
    </div>
  );
};

const ToolButton = ({ icon: Icon, active, onClick, label, disabled }: any) => (
  <button 
    onClick={onClick}
    title={label}
    disabled={disabled}
    className={`p-3 rounded-xl transition-all relative group flex items-center justify-center disabled:opacity-20 ${
        active 
        ? 'bg-blue-600 text-white shadow-lg' 
        : 'text-slate-400 hover:text-white hover:bg-white/10'
    }`}
  >
    <Icon size={18} strokeWidth={active ? 3 : 2} />
  </button>
);

export default FilePreviewPage;