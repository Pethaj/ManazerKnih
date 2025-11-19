/**
 * OpenRouter Intelligent Metadata Service
 * Inteligentní extrakce metadat z PDF - automaticky detekuje OCR a volá optimální AI model
 */

import * as pdfToImageService from './pdfToImageService';

// Helper pro získání PDF.js z window
function getPdfjsLib(): any {
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }
  throw new Error('PDF.js není načten!');
}

export interface ExtractedMetadata {
  title?: string;
  author?: string;
  publicationYear?: number;
  publisher?: string;
  language?: string;
  summary?: string;
  keywords?: string[];
  releaseVersion?: string;
}

export interface IntelligentExtractionResult {
  success: boolean;
  metadata?: ExtractedMetadata;
  type?: 'text' | 'images'; // Jaký typ vstupu byl použit
  model?: string; // Jaký AI model byl použit
  error?: string;
}

/**
 * Extrahuje text z prvních N stránek PDF pomocí PDF.js
 */
async function extractTextFromPDF(
  pdfBlob: Blob,
  maxPages: number = 10
): Promise<string> {
  console.log(`📄 Pokus o extrakci textu z prvních ${maxPages} stránek PDF...`);
  
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfjsLib = getPdfjsLib();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pagesToProcess = Math.min(maxPages, pdf.numPages);
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    console.log(`✅ Text extrahován: ${fullText.length} znaků`);
    return fullText.trim();
    
  } catch (error) {
    console.error('❌ Chyba při extrakci textu z PDF:', error);
    throw error;
  }
}

/**
 * Detekuje zda PDF obsahuje OCR text
 * @returns true pokud PDF obsahuje dostatek textu (>500 znaků)
 */
async function detectOCR(pdfBlob: Blob, maxPages: number = 10): Promise<boolean> {
  try {
    const text = await extractTextFromPDF(pdfBlob, maxPages);
    const hasOCR = text.length > 500;
    
    console.log(`🔍 OCR detekce: ${hasOCR ? '✅ Obsahuje text' : '❌ Neobsahuje dostatek textu'} (${text.length} znaků)`);
    
    return hasOCR;
  } catch (error) {
    console.error('❌ Chyba při detekci OCR:', error);
    return false;
  }
}

/**
 * Stáhne PDF soubor ze Supabase storage
 */
async function downloadPDF(pdfUrl: string): Promise<Blob> {
  console.log(`📥 Stahuji PDF z URL: ${pdfUrl}`);
  
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Nepodařilo se stáhnout PDF: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`✅ PDF staženo (${Math.round(blob.size / 1024)} KB)`);
    
    return blob;
  } catch (error) {
    console.error('❌ Chyba při stahování PDF:', error);
    throw error;
  }
}

/**
 * Zavolá Supabase Edge Function pro extrakci metadat
 */
async function callEdgeFunction(
  type: 'text' | 'images',
  content: string | string[],
  fileName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<IntelligentExtractionResult> {
  console.log(`📡 Volám Edge Function s typem: ${type}`);
  
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/extract-metadata-ai`;
  
  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        type: type,
        content: content,
        fileName: fileName,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Edge Function error: ${response.status} - ${errorData?.error || response.statusText}`
      );
    }
    
    const result = await response.json();
    console.log('✅ Edge Function response:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Chyba při volání Edge Function:', error);
    throw error;
  }
}

/**
 * Hlavní funkce pro inteligentní extrakci metadat
 * Automaticky detekuje OCR a volá odpovídající AI model přes Supabase Edge Function
 */
export async function extractMetadataIntelligent(
  pdfUrl: string,
  fileName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<IntelligentExtractionResult> {
  console.log('🤖 Spouštím inteligentní extrakci metadat...');
  console.log(`📄 Soubor: ${fileName}`);
  console.log(`🔗 URL: ${pdfUrl}`);
  
  try {
    // 1. Stáhneme PDF
    const pdfBlob = await downloadPDF(pdfUrl);
    
    // 2. Detekujeme, zda obsahuje OCR text
    const hasOCR = await detectOCR(pdfBlob);
    
    let type: 'text' | 'images';
    let content: string | string[];
    
    if (hasOCR) {
      // PDF má OCR text - extrahujeme text
      console.log('✅ PDF obsahuje OCR text, použijeme textový model');
      type = 'text';
      content = await extractTextFromPDF(pdfBlob, 10);
      
      if (!content || content.length < 100) {
        console.warn('⚠️ Extrahovaný text je příliš krátký, použijeme vision model');
        type = 'images';
        const images = await pdfToImageService.convertPdfPagesToImages(pdfBlob, 10);
        content = images.map(img => img.base64_png);
      }
    } else {
      // PDF nemá OCR text - použijeme vision model
      console.log('❌ PDF neobsahuje OCR text, použijeme vision model');
      type = 'images';
      const images = await pdfToImageService.convertPdfPagesToImages(pdfBlob, 10);
      content = images.map(img => img.base64_png);
    }
    
    // 3. Zavoláme Edge Function s připraveným obsahem
    console.log(`📡 Odesílám ${type === 'text' ? 'text' : 'obrázky'} do Edge Function...`);
    
    const result = await callEdgeFunction(
      type,
      content,
      fileName,
      supabaseUrl,
      supabaseKey
    );
    
    return result;
    
  } catch (error) {
    console.error('❌ Chyba při inteligentní extrakci metadat:', error);
    return {
      success: false,
      error: `Chyba při extrakci metadat: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
    };
  }
}

/**
 * Testovací funkce pro ověření Edge Function
 */
export async function testEdgeFunction(
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  console.log('🧪 Testuji Edge Function...');
  
  try {
    const result = await callEdgeFunction(
      'text',
      'Test document content',
      'test.pdf',
      supabaseUrl,
      supabaseKey
    );
    
    console.log('✅ Edge Function test:', result.success ? 'ÚSPĚŠNÝ' : 'NEÚSPĚŠNÝ');
    return result.success;
  } catch (error) {
    console.error('❌ Edge Function test neúspěšný:', error);
    return false;
  }
}

