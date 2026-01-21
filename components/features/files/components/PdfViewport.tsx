import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const PDFJS_VERSION = '3.11.174';
if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
}

interface PdfViewportProps {
  url: string | null;
  zoom: number;
  pageNum: number;
  onPdfLoad: (numPages: number) => void;
  renderOverlay?: (width: number, height: number) => React.ReactNode;
  isHandToolActive?: boolean;
}

export const PdfViewport: React.FC<PdfViewportProps> = ({ 
  url, zoom, pageNum, onPdfLoad, renderOverlay, isHandToolActive = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const currentRenderTaskRef = useRef<any>(null);
  const currentDocTaskRef = useRef<any>(null);
  const isMounted = useRef(true);

  const cleanupTasks = useCallback(() => {
    if (currentRenderTaskRef.current) {
      try { currentRenderTaskRef.current.cancel(); } catch(e) {}
      currentRenderTaskRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanupTasks();
      if (currentDocTaskRef.current) {
        try { currentDocTaskRef.current.destroy(); } catch(e) {}
      }
    };
  }, [cleanupTasks]);

  useEffect(() => {
    if (!url) return;
    
    const loadDocument = async () => {
      setError(null);
      setIsRendering(true);
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("Motor PDF não carregado.");

        const loadingTask = pdfjsLib.getDocument(url);
        currentDocTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;
        
        if (isMounted.current) {
          setPdfDoc(pdf);
          onPdfLoad(pdf.numPages);
        }
      } catch (err: any) {
        if (err.name === 'WorkerAbandonedException') return;
        if (isMounted.current) setError("Falha ao inicializar viewport técnica.");
      } finally {
        if (isMounted.current) setIsRendering(false);
      }
    };
    loadDocument();
  }, [url, onPdfLoad]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !isMounted.current) return;
    
    const renderPage = async () => {
      cleanupTasks();
      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom * 2 }); 
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (isMounted.current) {
          setCanvasSize({ w: viewport.width / 2, h: viewport.height / 2 });
        }

        const renderTask = page.render({ canvasContext: context, viewport });
        currentRenderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') console.error(e);
      } finally {
        if (isMounted.current) setIsRendering(false);
      }
    };
    renderPage();
  }, [pdfDoc, pageNum, zoom, cleanupTasks]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isHandToolActive || !containerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX, y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  return (
    <div 
      ref={containerRef} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      className={`flex-1 overflow-auto custom-scrollbar flex justify-center p-8 bg-[#020617] relative ${
        isHandToolActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
    >
        {error ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-3xl border border-white/10 max-w-sm self-center">
             <AlertCircle size={48} className="text-red-500 mb-4" />
             <h3 className="text-white font-bold mb-2">Instabilidade no Motor PDF</h3>
             <p className="text-slate-400 text-xs mb-6">{error}</p>
             <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Reiniciar</button>
          </div>
        ) : (
          <div className="relative shadow-2xl bg-white" style={{ width: canvasSize.w || 'auto', height: canvasSize.h || 'auto' }}>
              <canvas ref={canvasRef} className="block w-full h-auto" />
              {renderOverlay && canvasSize.w > 0 && renderOverlay(canvasSize.w, canvasSize.h)}
              {isRendering && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                   <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              )}
          </div>
        )}
    </div>
  );
};