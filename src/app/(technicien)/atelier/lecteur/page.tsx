import { DentalFileReader } from "@/components/scans/dental-file-reader";

export default function AtelierLecteurPage() {
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-gray-900">Lecteur de fichiers</h1><div className="h-[calc(100dvh-180px)] min-h-[440px]"><DentalFileReader /></div></div>;
}