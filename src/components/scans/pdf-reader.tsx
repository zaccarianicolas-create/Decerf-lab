"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";

export function PdfReader({ file }: { file: File }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    let task: PDFDocumentLoadingTask | null = null;
    void (async () => {
      const pdf = await import("pdfjs-dist");
      pdf.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs",import.meta.url).toString();
      const data=await file.arrayBuffer();
      if(disposed)return;
      task = pdf.getDocument({ data });
      const result = await task.promise;
      if (disposed) { await task.destroy(); return; }
      setDocument(result);
    })().catch((error) => { if (!disposed) setError(error instanceof Error ? error.message : "PDF invalide ou protégé par un mot de passe."); });
    return () => { disposed = true; void task?.destroy(); };
  }, [file]);
  useEffect(() => {
    if (!document || !canvas.current || !host.current) return;
    let disposed = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null = null;
    void (async () => {
      const entry = await document.getPage(page);
      if (disposed || !canvas.current || !host.current) return;
      const initial = entry.getViewport({ scale: 1 });
      const scale = Math.min(1.7,(host.current.clientWidth - 24) / initial.width);
      const viewport = entry.getViewport({ scale });
      const context = canvas.current.getContext("2d");
      if (!context) return;
      canvas.current.width = viewport.width; canvas.current.height = viewport.height;
      render = entry.render({ canvas: canvas.current, canvasContext: context, viewport });
      await render.promise;
    })().catch((error) => { if (!disposed) setError(error instanceof Error ? error.message : "Page illisible."); });
    return () => { disposed = true; render?.cancel(); };
  }, [document,page]);
  return <div className="flex h-full min-h-0 flex-col"><div className="flex shrink-0 items-center justify-center gap-3 border-b bg-white p-2"><button type="button" aria-label="Page précédente" title="Page précédente" disabled={page<=1} onClick={()=>setPage(page-1)} className="rounded p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm">{page} / {document?.numPages ?? "…"}</span><button type="button" aria-label="Page suivante" title="Page suivante" disabled={!document || page>=document.numPages} onClick={()=>setPage(page+1)} className="rounded p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div><div ref={host} className="min-h-0 flex-1 overflow-auto bg-gray-100 p-3">{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <canvas ref={canvas} className="mx-auto max-w-full bg-white" />}</div></div>;
}