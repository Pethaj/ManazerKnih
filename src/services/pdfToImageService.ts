/**
 * PDF to Image Service
 * Konvertuje PDF stránky na PNG obrázky pomocí PDF.js
 */

// Helper pro získání PDF.js z window
function getPdfjsLib(): any {
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }
  throw new Error('PDF.js není načten! Ujistěte se, že je PDF.js načten v HTML před použitím této služby.');
}

export interface PDFPageImage {
  page_number: number;
  base64_png: string;
  width: number;
  height: number;
}

/**
 * Převede prvních N stránek PDF na PNG obrázky
 */
export async function convertPdfPagesToImages(
  pdfFile: File | Blob,
  maxPages: number = 10,
  scale: number = 2.0 // DPI scale (2.0 = ~192 DPI)
): Promise<PDFPageImage[]> {
  console.log(`📄 Konvertuji prvních ${maxPages} stránek PDF na obrázky...`);
  
  try {
    // Načteme PDF soubor
    console.log('📄 Načítám PDF soubor do array buffer...');
    const arrayBuffer = await pdfFile.arrayBuffer();
    console.log(`✅ Array buffer načten (${arrayBuffer.byteLength} bytů)`);
    
    console.log('📚 Inicializuji PDF.js...');
    const pdfjsLib = getPdfjsLib(); // Získáme PDF.js z window
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    console.log('⏳ Čekám na načtení PDF dokumentu...');
    const pdf = await loadingTask.promise;
    console.log('✅ PDF dokument načten');
    
    console.log(`📊 PDF má ${pdf.numPages} stránek`);
    
    // Určíme kolik stránek zpracovat
    const pagesToProcess = Math.min(maxPages, pdf.numPages);
    console.log(`🔄 Zpracovávám ${pagesToProcess} stránek...`);
    
    const images: PDFPageImage[] = [];
    
    // Procházíme stránky
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      console.log(`📄 Zpracovávám stránku ${pageNum}/${pagesToProcess}...`);
      
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        // Vytvoříme canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: false });
        
        if (!context) {
          console.error(`❌ Nepodařilo se vytvořit canvas context pro stránku ${pageNum}`);
          continue;
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Vykreslíme stránku na canvas
        await page.render({ 
          canvasContext: context, 
          viewport: viewport 
        }).promise;
        
        console.log(`✅ Stránka ${pageNum} vykreslena (${viewport.width}x${viewport.height}px)`);
        
        // Převedeme canvas na base64 PNG
        const base64Data = canvas.toDataURL('image/png').split(',')[1]; // Odebereme "data:image/png;base64," prefix
        
        images.push({
          page_number: pageNum,
          base64_png: base64Data,
          width: viewport.width,
          height: viewport.height
        });
        
        console.log(`💾 Stránka ${pageNum} převedena na PNG (${Math.round(base64Data.length / 1024)} KB)`);
        
        // Uvolníme paměť
        canvas.remove();
        
      } catch (pageError) {
        console.error(`❌ Chyba při zpracování stránky ${pageNum}:`, pageError);
        // Pokračujeme s dalšími stránkami
      }
    }
    
    console.log(`✅ Převod dokončen! Vytvořeno ${images.length} obrázků`);
    
    // Spočítáme celkovou velikost
    const totalSize = images.reduce((sum, img) => sum + img.base64_png.length, 0);
    console.log(`📦 Celková velikost obrázků: ${Math.round(totalSize / 1024)} KB (${Math.round(totalSize / 1024 / 1024)} MB)`);
    
    return images;
    
  } catch (error) {
    console.error('❌ Chyba při konverzi PDF na obrázky:', error);
    throw new Error(`Nepodařilo se převést PDF na obrázky: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
  }
}

/**
 * Převede prvních N stránek PDF z URL na PNG obrázky
 */
export async function convertPdfUrlToImages(
  pdfUrl: string,
  maxPages: number = 10,
  scale: number = 2.0
): Promise<PDFPageImage[]> {
  console.log(`📥 Stahuji PDF z URL: ${pdfUrl}`);
  
  try {
    // Stáhneme PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Nepodařilo se stáhnout PDF: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`✅ PDF staženo (${Math.round(blob.size / 1024)} KB)`);
    
    // Konvertujeme na obrázky
    return await convertPdfPagesToImages(blob, maxPages, scale);
    
  } catch (error) {
    console.error('❌ Chyba při stahování nebo konverzi PDF:', error);
    throw error;
  }
}

/**
 * Testovací funkce pro ověření PDF.js
 */
export async function testPdfToImage(file: File): Promise<boolean> {
  console.log('🧪 Testuji konverzi PDF na obrázky...');
  
  try {
    const images = await convertPdfPagesToImages(file, 1, 1.0); // Pouze první stránka v nízké kvalitě
    console.log('✅ Test konverze:', images.length > 0 ? 'ÚSPĚŠNÝ' : 'NEÚSPĚŠNÝ');
    return images.length > 0;
  } catch (error) {
    console.error('❌ Test konverze neúspěšný:', error);
    return false;
  }
}

