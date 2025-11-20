/**
 * PDF to Image Service - Zástupná implementace
 * Tato služba poskytuje základní rozhraní pro konverzi PDF stránek na obrázky
 */

export async function convertPdfPagesToImages(
  fileData: ArrayBuffer | Uint8Array,
  maxPages: number = 10,
  scale: number = 2.0
): Promise<string[]> {
  console.warn('⚠️ PDF to Image konverze není implementována, vrací se prázdné pole');
  return [];
}

export async function convertPdfPageToImage(
  fileData: ArrayBuffer | Uint8Array,
  pageNumber: number,
  scale: number = 2.0
): Promise<string | null> {
  console.warn('⚠️ PDF to Image konverze není implementována, vrací se null');
  return null;
}
