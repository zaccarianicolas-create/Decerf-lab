"use client";
import { useMemo } from "react";
import { X } from "lucide-react";
import { DentalFileReader } from "./dental-file-reader";

export function ScanPreviewImpl({ open, onClose, url, fileName }: {
  open: boolean; onClose: () => void; url: string; fileName: string; format: string | null;
}) {
  const remote = useMemo(() => ({ url, name: fileName }), [url, fileName]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Lecteur de fichiers">
    <div className="flex h-[calc(100dvh-16px)] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:h-[90dvh]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"><div className="min-w-0"><h2 className="font-semibold">Lecteur de fichiers</h2><p className="truncate text-xs text-gray-500">{fileName}</p></div><button type="button" onClick={onClose} aria-label="Fermer le lecteur" title="Fermer le lecteur" className="rounded p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
      <div className="min-h-0 flex-1"><DentalFileReader remote={remote} /></div>
    </div>
  </div>;
}