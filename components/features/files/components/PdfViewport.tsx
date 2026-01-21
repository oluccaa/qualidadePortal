
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const renderTaskRef = useRef<any>(null);
  const isMounted = useRef(true);

  // Carregamento do Documento
  useEffect(() => {
    if (!url) return;
    const loadPdf = async () => {
      setError(null);
      setIsRendering(true);
      try {
        const loadingTask = (window as any).pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        if (isMounted.current) {
          setPdfDoc(pdf);
          onPdfLoad(pdf.numPages);
        }
      } catch (err) {
        if (isMounted.current) setError("Falha na integridade do arquivo.");
      } finally {
        if (isMounted.current) setIsRendering(false);
      }
    };
    loadPdf();
  }, [url]);

  // Motor de Renderização de Alta Performance (Anti-Flicker)
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    setIsRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNum);
      
      // Cálculo de High DPI (Retina support)
      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: zoom });
      
      const canvas = canvasRef.current;
      const bufferCanvas = bufferCanvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      const bufferContext = bufferCanvas.getContext('2d', { alpha: false });

      if (!context || !bufferContext) return;

      // Configuramos o BUFFER primeiro para não limpar a tela principal
      bufferCanvas.width = Math.floor(viewport.width * outputScale);
      bufferCanvas.height = Math.floor(viewport.height * outputScale);
      
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: bufferContext,
        transform: transform,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      if (isMounted.current) {
        // TROCA ATÔMICA: Copiamos o buffer para o canvas principal em um único frame
        canvas.width = bufferCanvas.width;
        canvas.height = bufferCanvas.height;
        context.drawImage(bufferCanvas, 0, 0);
        
        setDimensions({ 
          width: viewport.width, 
          height: viewport.height 
        });
      }
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error("Erro de renderização:", err);
      }
    } finally {
      if (isMounted.current) setIsRendering(false);
    }
  }, [pdfDoc, pageNum, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Lógica de Panning (Mãozinha)
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
    if (!drag.isDragging || !containerRef.current) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    containerRef.current.scrollLeft = drag.scrollL - dx;
    containerRef.current.scrollTop = drag.scrollT - dy;
  };

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDrag(d => ({ ...d, isDragging: false }))}
      onMouseLeave={() => setDrag(d => ({ ...d, isDragging: false }))}
      className={`flex-1 overflow-auto bg-[#020617] relative custom-scrollbar flex justify-center items-start p-12 select-none ${
        isHandToolActive ? (drag.isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
    >
      {/* Camada de Renderização do PDF */}
      <div 
        className="relative shadow-[0_50px_100px_rgba(0,0,0,0.6)] bg-white transition-transform duration-75 ease-out"
        style={{ 
          width: dimensions.width || 'auto', 
          height: dimensions.height || 'auto',
          minWidth: dimensions.width
        }}
      >
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: dimensions.width, 
            height: dimensions.height,
            display: dimensions.width ? 'block' : 'none'
          }}
        />
        
        {/* Camada de Desenho (Sincronizada com o zoom) */}
        {dimensions.width > 0 && renderOverlay && renderOverlay(dimensions.width, dimensions.height)}

        {/* Loading Overlay Minimalista */}
        {isRendering && (
          <div className="absolute top-4 right-4 z-50 bg-[#081437]/80 backdrop-blur-md p-2 rounded-full border border-white/10">
             <Loader2 size={16} className="animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#020617]/90 z-50">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-xs">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-black uppercase tracking-widest mb-2">Erro de Viewport</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
