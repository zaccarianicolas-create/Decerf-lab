"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Focus, Contrast, ZoomIn, ZoomOut } from "lucide-react";
import type { ReaderFile } from "@/lib/reader-files";
import { DICOM_EXTENSIONS } from "@/lib/commande-files";
import type { Types } from "@cornerstonejs/core";

let initialized: Promise<void> | null = null;
type Series = { key: string; imageIds: string[] };

export function DicomReader({ files, selected }: { files: ReaderFile[]; selected: ReaderFile }) {
  const host = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Types.IStackViewport | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [slice, setSlice] = useState(0);
  const [windowWidth, setWindowWidth] = useState(1500);
  const [windowLevel, setWindowLevel] = useState(500);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;
    void (async () => {
      const core = await import("@cornerstonejs/core");
      const loader = await import("@cornerstonejs/dicom-image-loader");
      const parser = await import("dicom-parser");
      if (!initialized) initialized = (async () => { await core.init(); loader.init({ maxWebWorkers: 2 }); })();
      await initialized;
      if (disposed || !host.current) return;
      const engine = new core.RenderingEngine(`dicom-${crypto.randomUUID()}`);
      const registered: string[] = [];
      const cacheIds: string[] = [];
      const observer = new ResizeObserver(() => engine.resize(true,true));
      observer.observe(host.current);
      cleanup = () => {
        observer.disconnect(); engine.destroy(); viewportRef.current = null;
        for (const id of cacheIds) if(core.cache.getImageLoadObject(id)) core.cache.removeImageLoadObject(id);
        for (const id of registered) loader.wadouri.fileManager.remove(Number(loader.wadouri.parseImageId(id).url));
      };
      engine.enableElement({ viewportId: "stack", type: core.Enums.ViewportType.STACK, element: host.current, defaultOptions: { background: [0,0,0] } });
      const viewport = engine.getViewport("stack") as Types.IStackViewport;
      viewportRef.current = viewport;
      const groups = new Map<string, { imageIds: string[]; order: number }[]>();
      let selectedSeries = "";
      let totalFrames = 0;
      for (const file of files.filter((entry) => DICOM_EXTENSIONS.includes(entry.extension))) {
        const bytes=await file.file.arrayBuffer();
        if(disposed)return;
        const data = parser.parseDicom(new Uint8Array(bytes), { untilTag: "x7fe00010" });
        if(!data.uint16("x00280010") || !data.uint16("x00280011")) continue;
        const key = data.string("x0020000e") || file.name;
        if (file.name === selected.name) selectedSeries = key;
        const frames = Number(data.string("x00280008") || 1);
        if (!Number.isInteger(frames) || frames < 1 || frames > 3000) throw new Error("Nombre de coupes DICOM trop élevé ou invalide.");
        totalFrames += frames;
        if(totalFrames>3000)throw new Error("3000 coupes DICOM maximum par sélection.");
        const id = loader.wadouri.fileManager.add(file.file); registered.push(id);
        const images = frames === 1 ? [id] : Array.from({ length: frames }, (_, index) => `${id}?frame=${index+1}`);
        cacheIds.push(...images);
        const values = groups.get(key) ?? []; values.push({ imageIds: images, order: Number(data.string("x00200013") || 0) }); groups.set(key,values);
      }
      const values = [...groups].map(([key, entries]) => ({ key, imageIds: entries.sort((first,second)=>first.order-second.order).flatMap(entry=>entry.imageIds) }));
      if (!values.length) throw new Error("Aucune série DICOM exploitable.");
      const index = Math.max(0,values.findIndex((entry)=>entry.key===selectedSeries));
      if (disposed) return;
      setSeries(values); setSeriesIndex(index);
      await viewport.setStack(values[index].imageIds,0);
      if (disposed) return;
      const range=viewport.getProperties().voiRange;
      if(range){setWindowWidth(range.upper-range.lower);setWindowLevel((range.upper+range.lower)/2);}
      viewport.render(); setLoading(false);
    })().catch(error=>{if(!disposed){setLoading(false);setError(error instanceof Error ? error.message : "DICOM non pris en charge ou corrompu.");}});
    return()=>{disposed=true;cleanup?.();};
  },[files,selected]);
  const changeSlice = async (index: number) => {
    setSlice(index);
    try { await viewportRef.current?.setImageIdIndex(index); viewportRef.current?.render(); }
    catch { setError("Cette coupe n’a pas pu être décodée."); }
  };
  const changeSeries = async (index: number) => {
    setSeriesIndex(index); setSlice(0);
    try { await viewportRef.current?.setStack(series[index].imageIds,0); viewportRef.current?.render(); }
    catch { setError("Cette série n’a pas pu être chargée."); }
  };
  const voi = (width: number, level: number) => { setWindowWidth(width);setWindowLevel(level);viewportRef.current?.setProperties({voiRange:{lower:level-width/2,upper:level+width/2}});viewportRef.current?.render(); };
  const zoom = (factor: number) => { const viewport=viewportRef.current;if(!viewport)return;viewport.setZoom(viewport.getZoom()*factor);viewport.render(); };
  const length = series[seriesIndex]?.imageIds.length ?? 1;
  const scrollSlice = useEffectEvent((step: number) => { void changeSlice(Math.max(0,Math.min(length-1,slice+step))); });
  useEffect(()=>{
    const element=host.current;
    if(!element)return;
    const wheel=(event: WheelEvent)=>{if(!viewportRef.current)return;event.preventDefault();scrollSlice(event.deltaY>0?1:-1);};
    element.addEventListener("wheel",wheel,{passive:false});
    return()=>element.removeEventListener("wheel",wheel);
  },[]);
  return <div className="flex h-full min-h-0 flex-col bg-black">
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white p-2">
      <select aria-label="Série DICOM" value={seriesIndex} onChange={event=>{void changeSeries(Number(event.target.value));}} className="min-h-8 min-w-0 rounded border px-2 text-sm">{series.map((entry,index)=><option key={entry.key} value={index}>Série {index+1} · {entry.imageIds.length} coupes</option>)}</select>
      <button type="button" title="Recentrer DICOM" aria-label="Recentrer DICOM" onClick={()=>{viewportRef.current?.resetCamera();viewportRef.current?.render();}} className="rounded p-2"><Focus className="h-4 w-4" /></button>
      <button type="button" title="Zoom DICOM avant" aria-label="Zoom DICOM avant" onClick={()=>zoom(1.25)} className="rounded p-2"><ZoomIn className="h-4 w-4" /></button>
      <button type="button" title="Zoom DICOM arrière" aria-label="Zoom DICOM arrière" onClick={()=>zoom(0.8)} className="rounded p-2"><ZoomOut className="h-4 w-4" /></button>
      <label className="flex items-center gap-1 text-xs"><Contrast className="h-4 w-4" />Fenêtre<input aria-label="Fenêtre DICOM" type="number" min={1} max={20000} value={windowWidth} onChange={event=>voi(Math.max(1,Number(event.target.value)),windowLevel)} className="w-20 rounded border px-2 py-1" /></label>
      <label className="flex items-center gap-1 text-xs">Niveau<input aria-label="Niveau DICOM" type="number" value={windowLevel} onChange={event=>voi(windowWidth,Number(event.target.value))} className="w-20 rounded border px-2 py-1" /></label>
    </div>
    <div className="relative min-h-0 flex-1"><div ref={host} className="absolute inset-0" />{loading && <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-white">Chargement DICOM…</p>}{error && <p role="alert" className="absolute inset-x-0 top-0 bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div>
    <label className="flex shrink-0 items-center gap-3 bg-white p-3 text-xs">Coupe {slice+1}/{length}<input aria-label="Coupe DICOM" type="range" min={0} max={Math.max(0,length-1)} value={slice} onChange={event=>{void changeSlice(Number(event.target.value));}} className="min-w-0 flex-1" /></label>
  </div>;
}