import { unzip, unzipSync } from "fflate";
import { getFileExtension, isReadableFile } from "@/lib/commande-files";

export const MAX_READER_FILE = 100 * 1024 * 1024;
export type ReaderFile = { name: string; file: File; url: string; extension: string };

export async function extractReaderZip(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_READER_FILE) throw new Error("Archive de 100 Mo maximum.");
  let total = 0;
  let count = 0;
  unzipSync(bytes, { filter: (entry) => {
    if (++count > 500 || entry.name.includes("\0") || entry.name.startsWith("/") || entry.name.includes("\\") || entry.name.split("/").includes("..")) throw new Error("Archive invalide ou trop de fichiers.");
    if (!entry.name.endsWith("/")) {
      total += entry.originalSize;
      if (entry.originalSize <= 0 || entry.originalSize > MAX_READER_FILE || total > 200 * 1024 * 1024 || entry.originalSize > Math.max(entry.size, 1) * 200) throw new Error("Archive trop volumineuse après décompression.");
    }
    return false;
  } });
  const data = await new Promise<Record<string, Uint8Array>>((resolve, reject) => unzip(bytes, { filter: (entry) => !entry.name.endsWith("/") }, (error, result) => error ? reject(error) : resolve(result)));
  return Object.entries(data).map(([name, value]) => new File([new Uint8Array(value)], name));
}

export async function prepareReaderFiles(files: File[]) {
  if (files.length > 500) throw new Error("500 fichiers maximum.");
  const expanded: File[] = [];
  let size = 0;
  for (const file of files) {
    size += file.size;
    if (file.size > MAX_READER_FILE || size > 200 * 1024 * 1024) throw new Error("Fichier de 100 Mo maximum et sélection de 200 Mo maximum.");
    const signature=new Uint8Array(await file.slice(0,4).arrayBuffer());
    const zipped=signature[0]===0x50 && signature[1]===0x4b && signature[2]===0x03 && signature[3]===0x04;
    if (getFileExtension(file.name) === "zip" || zipped) expanded.push(...await extractReaderZip(new Uint8Array(await file.arrayBuffer())));
    else expanded.push(file);
  }
  if (expanded.length > 500 || expanded.reduce((total, file) => total + file.size, 0) > 200 * 1024 * 1024) throw new Error("Sélection trop volumineuse après décompression.");
  const names = new Set<string>();
  for (const file of expanded) { if (names.has(file.name)) throw new Error("Deux fichiers portent le même nom : utilise un ZIP conservant les dossiers."); names.add(file.name); }
  const formats = await Promise.all(expanded.map(async (file) => {
    const extension = getFileExtension(file.name);
    if (isReadableFile(file.name)) return extension;
    const header = new Uint8Array(await file.slice(128,132).arrayBuffer());
    return header.length === 4 && String.fromCharCode(...header) === "DICM" ? "dcm" : extension;
  }));
  if (!formats.some((extension) => isReadableFile(`file.${extension}`))) throw new Error("Aucun fichier lisible dans la sélection. Les formats propriétaires nécessitent un export STL, PLY, OBJ ou DICOM.");
  return expanded.map((file,index): ReaderFile => ({ name: file.name, file, url: URL.createObjectURL(file), extension: formats[index] }));
}

export function readerResourceUrl(resource: string, modelName: string, files: ReaderFile[]) {
  if (/^blob:/.test(resource)) return resource;
  if (/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,/i.test(resource) && resource.length < MAX_READER_FILE * 1.4) return resource;
  if (/^(https?:|data:|file:)/i.test(resource)) throw new Error("Une ressource externe du modèle a été bloquée.");
  const base = modelName.includes("/") ? modelName.slice(0, modelName.lastIndexOf("/") + 1) : "";
  const pieces: string[] = [];
  for (const part of `${base}${decodeURIComponent(resource)}`.split("/")) { if (part === "..") pieces.pop(); else if (part && part !== ".") pieces.push(part); }
  const path = pieces.join("/");
  const found = files.find((file) => file.name === path) ?? files.find((file) => file.name === resource);
  if (!found) throw new Error(`Ressource manquante : ${resource}. Charge le modèle avec ses matériaux/textures, ou un ZIP complet.`);
  return found.url;
}