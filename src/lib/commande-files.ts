export const FILE_BUCKET = "fichiers-stl";

export const COMMANDE_FILE_ACCEPT =
  ".stl,.obj,.ply,.zip,.pdf,.jpg,.jpeg,.png";

export const SCAN_3D_EXTENSIONS = ["stl", "obj", "ply", "zip"];
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function getScanFormat(fileName: string, mimeType?: string | null) {
  const ext = getFileExtension(fileName);
  if (SCAN_3D_EXTENSIONS.includes(ext)) return ext;
  if (mimeType?.includes("stl")) return "stl";
  return null;
}

export function isPreviewable3D(fileName: string, mimeType?: string | null) {
  const ext = getFileExtension(fileName);
  return SCAN_3D_EXTENSIONS.includes(ext) || Boolean(mimeType?.includes("model"));
}

export function isImageFile(fileName: string, mimeType?: string | null) {
  const ext = getFileExtension(fileName);
  return IMAGE_EXTENSIONS.includes(ext) || Boolean(mimeType?.startsWith("image/"));
}

export function detectFileKind(fileName: string, mimeType?: string | null) {
  if (isPreviewable3D(fileName, mimeType)) return "scan_3d";
  if (isImageFile(fileName, mimeType)) return "photo";
  return "document";
}
