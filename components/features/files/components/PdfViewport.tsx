import React, { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface PdfViewportProps {
  url: string | null;
  zoom: number;
  pageNum: number;
  onPdfLoad: (numPages: number) => void;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  renderOverlay?: (width: number, height: number) => React.ReactNode;
}

export const PdfViewport: React.FC<PdfViewportProps> = ({ 
  url, zoom, pageNum, onPdfLoad, renderOverlay
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [isRendering, setIsRendering] = useState(false);
  
  const currentRenderTaskRef = useRef<any>(null);
  const currentDocTaskRef = useRef<any>(null);

  // Carrega o documento
  useEffect(() => {
    if (!url) return;
    
    // Cancela carregamento anterior se existir
    if (currentDocTaskRef.current) {
        currentDocTaskRef.current.destroy();
    }

    const loadingTask = (window as any).pdfjsLib.getDocument(url);
    currentDocTaskRef.current = loadingTask;

    loadingTask.promise.then((pdf: any) => {
      setPdfDoc(pdf);
      onPdfLoad(pdf.numPages);
    }).catch((err: any) => {
      if (err.name !== 'WorkerAbandonedException' && err.name !== 'AbortException') {
        console.error("Erro ao carregar PDF:", err);
      }
    });

    return () => {
        if (currentDocTaskRef.current) {
            currentDocTaskRef.current.destroy();
        }
    };
  }, [url, onPdfLoad]);

  // Renderiza a página
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    const render = async () => {
      // Cancela renderização em curso
      if (currentRenderTaskRef.current) {
        currentRenderTaskRef.current.cancel();
      }

      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom * 2 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { alpha: false })!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        setCanvasSize({ w: viewport.width / 2, h: viewport.height / 2 });

        const renderTask = page.render({ canvasContext: context, viewport });
        currentRenderTaskRef.current = renderTask;
        
        await renderTask.promise;
        setIsRendering(false);
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
          console.error("Render error:", e);
          setIsRendering(false);
        }
      }
    };

    render();

    return () => {
        if (currentRenderTaskRef.current) {
            currentRenderTaskRef.current.cancel();
        }
    };
  }, [pdfDoc, pageNum, zoom]);

  return (
    <div className="flex-1 overflow-auto custom-scrollbar flex justify-center p-8 bg-[#020617] relative">
        <div 
          className={`relative shadow-[0_50px_100px_rgba(0,0,0,0.5)] bg-white transition-opacity duration-200 ${isRendering ? 'opacity-90' : 'opacity-100'}`}
          style={{ width: canvasSize.w, height: canvasSize.h, minWidth: canvasSize.w || '100px' }}
        >
            <canvas ref={canvasRef} className="block w-full h-auto" />
            {renderOverlay && canvasSize.w > 0 && renderOverlay(canvasSize.w, canvasSize.h)}
        </div>

        {!pdfDoc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-50">
             <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Iniciando Motor PDF...</p>
          </div>
        )}
    </div>
  );
};