"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Download, FolderOpen, Maximize, Trash2 } from "lucide-react";
import { COMMANDE_FILE_ACCEPT, DICOM_EXTENSIONS, IMAGE_EXTENSIONS, SCAN_3D_EXTENSIONS, isReadableFile } from "@/lib/commande-files";
import { prepareReaderFiles, MAX_READER_FILE, type ReaderFile } from "@/lib/reader-files";

const Scene = dynamic(()=>import("./scan-scene").then(module=>module.ScanScene),{ssr:false});
const Pdf = dynamic(()=>import("./pdf-reader").then(module=>module.PdfReader),{ssr:false});
const Dicom = dynamic(()=>import("./dicom-reader").then(module=>module.DicomReader),{ssr:false});

export function DentalFileReader({ remote }: { remote?: { url: string; name: string } }) {
  const [files, setFiles] = useState<ReaderFile[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owned = useRef<ReaderFile[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(()=>()=>{ mounted.current=false; for(const file of owned.current) URL.revokeObjectURL(file.url); },[]);
  const replace = (next: ReaderFile[]) => { for(const file of owned.current)URL.revokeObjectURL(file.url); owned.current=next; setFiles(next);setSelected(next.find(file=>isReadableFile(`file.${file.extension}`))?.name||""); };
  const load = async (selection: File[]) => {
    const request=++generation.current; setLoading(true);setError(null);replace([]);
    try { const next=await prepareReaderFiles(selection); if(!mounted.current || request!==generation.current){for(const file of next)URL.revokeObjectURL(file.url);return;} replace(next); }
    catch(error){if(mounted.current && request===generation.current)setError(error instanceof Error?error.message:"Fichier illisible.");}
    finally {if(mounted.current && request===generation.current)setLoading(false);}
  };
  useEffect(()=>{
    mounted.current=true;
    if(!remote)return;
    const controller=new AbortController();
    const request=++generation.current;
    void (async()=>{
      setLoading(true);
      const response=await fetch(remote.url,{signal:controller.signal});
      if(!response.ok)throw new Error("Impossible de récupérer le fichier de la commande.");
      if(Number(response.headers.get("content-length"))>MAX_READER_FILE)throw new Error("Fichier trop volumineux pour l’aperçu.");
      const blob=await response.blob();
      const next=await prepareReaderFiles([new File([blob],remote.name,{type:blob.type})]);
      if(controller.signal.aborted || request!==generation.current){for(const file of next)URL.revokeObjectURL(file.url);return;}
      for(const file of owned.current)URL.revokeObjectURL(file.url);owned.current=next;setFiles(next);setSelected(next.find(file=>isReadableFile(`file.${file.extension}`))?.name||"");setLoading(false);
    })().catch(error=>{if(!controller.signal.aborted && request===generation.current){setLoading(false);setError(error instanceof Error?error.message:"Chargement impossible.");}});
    return()=>controller.abort();
  },[remote]);
  const active=files.find(file=>file.name===selected);
  return <div ref={host} className="flex h-full min-h-0 flex-col bg-white">
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 p-3">
      <button type="button" disabled={loading} onClick={()=>input.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm disabled:opacity-40"><FolderOpen className="h-4 w-4" />Ouvrir des fichiers</button>
      <input ref={input} type="file" multiple hidden accept={COMMANDE_FILE_ACCEPT} onChange={event=>{void load(Array.from(event.target.files??[]));event.target.value="";}} />
      {files.length>0 && <select aria-label="Fichier à lire" value={selected} onChange={event=>setSelected(event.target.value)} className="order-last min-h-10 w-full min-w-0 max-w-full rounded-md border px-2 text-sm sm:order-none sm:w-auto sm:flex-1">{files.map(file=><option key={file.name} value={file.name}>{file.name}{isReadableFile(`file.${file.extension}`)?"":" (fichier associé)"}</option>)}</select>}
      {active && <a href={active.url} download={active.name} title="Télécharger l’original" aria-label="Télécharger l’original" className="rounded p-2 hover:bg-gray-100"><Download className="h-4 w-4" /></a>}
      <button type="button" title="Plein écran" aria-label="Plein écran" onClick={async()=>{try{if(typeof host.current?.requestFullscreen!=="function")throw new Error();await host.current.requestFullscreen();}catch{setError("Plein écran indisponible sur ce navigateur.");}}} className="rounded p-2 hover:bg-gray-100"><Maximize className="h-4 w-4" /></button>
      {files.length>0 && <button type="button" title="Fermer les fichiers" aria-label="Fermer les fichiers" onClick={()=>{generation.current++;replace([]);setLoading(false);setError(null);}} className="rounded p-2 hover:bg-gray-100"><Trash2 className="h-4 w-4" /></button>}
    </div>
    {error && <p role="alert" className="shrink-0 border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="relative min-h-0 flex-1">
      {loading ? <p role="status" className="flex h-full items-center justify-center text-sm text-gray-500">Ouverture du fichier…</p> : !active ? <div className="flex h-full items-center justify-center px-6"><FolderOpen className="h-12 w-12 text-gray-300" /></div> : SCAN_3D_EXTENSIONS.includes(active.extension) ? <Scene key={active.name} file={active} files={files} /> : IMAGE_EXTENSIONS.includes(active.extension) ? <div className="relative h-full bg-gray-100"><Image unoptimized fill sizes="100vw" src={active.url} alt={active.name} className="object-contain" /></div> : active.extension==="pdf" ? <Pdf key={active.name} file={active.file} /> : DICOM_EXTENSIONS.includes(active.extension) ? <Dicom key={active.name} files={files} selected={active} /> : <p className="p-4 text-sm text-gray-500">Ce fichier accompagne un modèle ou nécessite le logiciel de son fournisseur.</p>}
    </div>
    <div className="shrink-0 break-all border-t border-gray-200 px-3 py-2 text-xs text-gray-500">{active ? `${active.name} · ${(active.file.size/1024/1024).toFixed(2)} Mo` : "STL, PLY, OBJ/MTL, GLB/glTF, ZIP, images et PDF · Ouverture locale sans transfert"}</div>
  </div>;
}