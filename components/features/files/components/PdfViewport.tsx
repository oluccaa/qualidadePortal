import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface PdfViewportProps {
  url: string | null;
  zoom: number;
  pageNum: number;
  onPdfLoad: (numPages: number) => void;
  renderOverlay?: (width: number, height: number) => React.ReactNode;
}

export const PdfViewport: React.FC<PdfViewportProps> = ({ 
  url, zoom, pageNum, onPdfLoad, renderOverlay
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentRenderTaskRef = useRef<any>(null);
  const currentDocTaskRef = useRef<any>(null);
  const isMounted = useRef(true);

  // Limpeza total de tarefas pendentes
  const cleanupTasks = useCallback(() => {
    if (currentRenderTaskRef.current) {
      currentRenderTaskRef.current.cancel();
      currentRenderTaskRef.current = null;
    }
    if (currentDocTaskRef.current) {
      currentDocTaskRef.current.destroy();
      currentDocTaskRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanupTasks();
    };
  }, [cleanupTasks]);

  // Carregamento do Documento
  useEffect(() => {
    if (!url) return;
    
    const loadDocument = async () => {
      cleanupTasks();
      setError(null);
      setIsRendering(true);

      try {
        const loadingTask = (window as any).pdfjsLib.getDocument({
          url,
          withCredentials: true,
          stopAtErrors: false
        });
        
        currentDocTaskRef.current = loadingTask;

        const pdf = await loadingTask.promise;
        if (isMounted.current) {
          setPdfDoc(pdf);
          onPdfLoad(pdf.numPages);
        }
      } catch (err: any) {
        if (err.name === 'WorkerAbandonedException' || err.name === 'AbortException') return;
        console.error("Falha ao carregar documento PDF:", err);
        if (isMounted.current) {
          setError("O documento não pôde ser processado pelo motor Vital.");
        }
      } finally {
        if (isMounted.current) setIsRendering(false);
      }
    };

    loadDocument();
  }, [url, onPdfLoad, cleanupTasks]);

  // Renderização da Página
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !isMounted.current) return;
    
    const renderPage = async () => {
      // Cancela renderização anterior se ainda estiver em curso
      if (currentRenderTaskRef.current) {
        currentRenderTaskRef.current.cancel();
      }

      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom * 2 }); // Supersampling para nitidez
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (isMounted.current) {
          setCanvasSize({ w: viewport.width / 2, h: viewport.height / 2 });
        }

        const renderTask = page.render({ 
          canvasContext: context, 
          viewport,
          intent: 'display'
        });
        
        currentRenderTaskRef.current = renderTask;
        
        await renderTask.promise;
        if (isMounted.current) setIsRendering(false);
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException' && isMounted.current) {
          console.error("Erro de renderização de página:", e);
          setIsRendering(false);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, zoom]);

  const handleRetry = () => {
    setPdfDoc(null);
    setError(null);
    window.location.reload();
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar flex justify-center p-8 bg-[#020617] relative">
        {error ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-3xl border border-white/10 max-w-sm animate-in zoom-in-95">
             <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                <AlertCircle size={32} />
             </div>
             <h3 className="text-white font-bold text-lg mb-2">Falha no Visualizador</h3>
             <p className="text-slate-400 text-sm mb-8">{error}</p>
             <button 
               onClick={handleRetry}
               className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
             >
               <RefreshCw size={14} /> Tentar Sincronizar Novamente
             </button>
          </div>
        ) : (
          <div 
            className={`relative shadow-[0_50px_100px_rgba(0,0,0,0.5)] bg-white transition-all duration-300 ${isRendering && !pdfDoc ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{ width: canvasSize.w || 'auto', height: canvasSize.h || 'auto', minWidth: canvasSize.w || '100px' }}
          >
              <canvas ref={canvasRef} className="block w-full h-auto" />
              {renderOverlay && canvasSize.w > 0 && !isRendering && renderOverlay(canvasSize.w, canvasSize.h)}
              
              {isRendering && pdfDoc && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                   <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              )}
          </div>
        )}

        {!pdfDoc && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-50">
             <div className="relative mb-6">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Carregando Buffer Vital...</p>
          </div>
        )}
    </div>
  );
};