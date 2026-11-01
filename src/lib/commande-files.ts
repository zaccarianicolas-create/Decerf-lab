export const FILE_BUCKET = "fichiers-stl";

export const COMMANDE_FILE_ACCEPT =
  ".stl,.obj,.ply,.glb,.gltf,.mtl,.bin,.zip,.tw,.trophy,.3oxz,.3ox,.dentalproject,.sdx,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.dcm,.dic,.dicom,.ima,.dcm30,.dc3,.dicm";

export const SCAN_3D_EXTENSIONS = ["stl", "obj", "ply", "glb", "gltf"];
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp"];
export const DICOM_EXTENSIONS = ["dcm", "dic", "dicom", "ima", "dcm30", "dc3", "dicm"];
export const ZIP_CANDIDATE_EXTENSIONS = ["zip", "tw", "trophy", "3oxz", "3ox", "dentalproject", "sdx"];

export function isReadableFile(fileName: string) {
  const extension = getFileExtension(fileName);
  return [...SCAN_3D_EXTENSIONS, ...IMAGE_EXTENSIONS, ...DICOM_EXTENSIONS, ...ZIP_CANDIDATE_EXTENSIONS, "pdf"].includes(extension);
}

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
  if (getFileExtension(fileName) === "zip") return "scan_3d";
  if (isPreviewable3D(fileName, mimeType)) return "scan_3d";
  if (isImageFile(fileName, mimeType)) return "photo";
  return "document";
}
