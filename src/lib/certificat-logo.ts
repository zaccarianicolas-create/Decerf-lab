import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function getCertificatLogo(): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile(join(process.cwd(), "public/images/logod.png")));
  } catch {
    return undefined;
  }
}
