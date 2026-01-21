
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
  onZoomChange?: (newZoom: number) => void;
  renderOverlay?: (width: number, height: number) => React.ReactNode;
  isHandToolActive?: boolean;
}

export const PdfViewport: React.FC<PdfViewportProps> = ({ 
  url, zoom, pageNum, onPdfLoad, onZoomChange, renderOverlay, isHandToolActive = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const renderTaskRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Limpeza de memória
  const cleanup = useCallback(() => {
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (e) {}
      renderTaskRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    const loadPdf = async () => {
      cleanup();
      setError(null);
      setIsRendering(true);
      
      try {
        const loadingTask = (window as any).pdfjsLib.getDocument({
          url,
          withCredentials: false,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/cmaps/`,
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        onPdfLoad(pdf.numPages);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("PDF Load Error:", err);
          setError("Falha ao abrir visualização técnica.");
        }
      } finally {
        setIsRendering(false);
      }
    };

    loadPdf();
    return cleanup;
  }, [url, cleanup, onPdfLoad]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    
    if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch(e) {}
    }

    setIsRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: zoom });
      
      const canvas = canvasRef.current;
      const bufferCanvas = bufferCanvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      const bufferContext = bufferCanvas.getContext('2d', { alpha: false });

      if (!context || !bufferContext) return;

      bufferCanvas.width = Math.floor(viewport.width * outputScale);
      bufferCanvas.height = Math.floor(viewport.height * outputScale);
      
      const renderContext = {
        canvasContext: bufferContext,
        viewport: viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;

      canvas.width = bufferCanvas.width;
      canvas.height = bufferCanvas.height;
      context.drawImage(bufferCanvas, 0, 0);
      setDimensions({ width: viewport.width, height: viewport.height });
      
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
          console.error("Render Error:", err);
      }
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, pageNum, zoom]);

  useEffect(() => { 
    renderPage(); 
  }, [renderPage]);

  // LOGICA DE ZOOM VIA MOUSE WHEEL
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!onZoomChange) return;
    
    // Se o usuário estiver scrollando com a mãozinha ou apenas no container
    // mas não queremos que o scroll padrão de página interfira na precisão
    // e.preventDefault(); // Comentado para permitir scroll natural se não houver zoom

    const zoomStep = 0.1;
    if (e.deltaY < 0) {
      // Scroll UP -> Zoom IN
      onZoomChange(Math.min(5, zoom + zoomStep));
    } else {
      // Scroll DOWN -> Zoom OUT
      onZoomChange(Math.max(0.2, zoom - zoomStep));
    }
  }, [zoom, onZoomChange]);

  // LOGICA DE PANNING (Mãozinha)
  const [drag, setDrag] = useState({ isDragging: false, x: 0, y: 0, scrollL: 0, scrollT: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isHandToolActive || !containerRef.current) return;
    
    setDrag({
      isDragging: true, 
      x: e.clientX, 
      y: e.clientY,
      scrollL: containerRef.current.scrollLeft,
      scrollT: containerRef.current.scrollTop
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag.isDragging || !containerRef.current || !isHandToolActive) return;
    
    // Calcula o deslocamento e aplica ao scroll do container
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    
    containerRef.current.scrollLeft = drag.scrollL - dx;
    containerRef.current.scrollTop = drag.scrollT - dy;
  };

  const handleMouseUp = () => {
    setDrag(d => ({ ...d, isDragging: false }));
  };

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`flex-1 overflow-auto bg-[#020617] relative custom-scrollbar flex justify-center items-start p-12 select-none focus:outline-none transition-all duration-75 ${
        isHandToolActive ? (drag.isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      }`}
    >
      <div 
        className="relative shadow-[0_60px_120px_rgba(0,0,0,0.7)] bg-white transition-opacity duration-500"
        style={{ width: dimensions.width || 'auto', height: dimensions.height || 'auto', opacity: dimensions.width ? 1 : 0 }}
      >
        <canvas ref={canvasRef} style={{ width: dimensions.width, height: dimensions.height }} />
        {dimensions.width > 0 && renderOverlay && renderOverlay(dimensions.width, dimensions.height)}
        
        {isRendering && (
          <div className="absolute top-6 right-6 z-[60] bg-blue-600 p-2 rounded-full shadow-2xl animate-pulse">
             <Loader2 size={16} className="animate-spin text-white" />
          </div>
        )}
      </div>

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617]/95 z-50 p-12 text-center animate-in fade-in">
            <AlertCircle size={56} className="text-red-500 mb-6" />
            <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2">Falha na Visualização</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">O motor de renderização perdeu o foco. Reestabeleça a conexão para continuar.</p>
            <button onClick={() => window.location.reload()} className="flex items-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">
               <RefreshCw size={14} /> Recarregar Estação
            </button>
        </div>
      )}
    </div>
  );
};
