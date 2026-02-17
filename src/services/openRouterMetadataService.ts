/**
 * OpenRouter Metadata Service - Inteligentní extrakce metadat
 * Automaticky detekuje OCR a volá správný AI model přes Supabase Edge Function
 */

// Použijeme globální pdfjsLib z window, který je už inicializovaný v index.html
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// Pro TypeScript import (není potřeba, používáme window.pdfjsLib)
// import * as pdfjsLib from 'pdfjs-dist';

export interface ExtractedMetadata {
  title?: string;
  author?: string;
  publicationYear?: number;
  publisher?: string;
  summary?: string;
  keywords?: string[];
  language?: string;
  categories?: string[];
  releaseVersion?: string;
  hasOCR?: boolean;
}

interface MetadataResponse {
  success: boolean;
  metadata?: ExtractedMetadata;
  error?: string;
  type?: 'text' | 'images';
  model?: string;
}

/**
 * Extrahuje text z PDF pomocí PDF.js
 */
async function extractTextFromPDF(
  pdfData: ArrayBuffer,
  maxPages: number = 10
): Promise<string> {
  try {
    // Použijeme globální pdfjsLib z window
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error('PDF.js není načten. Zkuste obnovit stránku.');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    const numPages = Math.min(pdf.numPages, maxPages);
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => {
            if (item.str !== undefined) return String(item.str);
            if (item.text !== undefined) return String(item.text);
            if (item.chars !== undefined) return String(item.chars);
            if (typeof item === 'string') return item;
            return '';
          })
          .join(' ');
        
        fullText += pageText + '\n';
      } catch (pageError) {
      }
    }
    
    return fullText.trim();
  } catch (error) {
    return '';
  }
}

/**
 * Konvertuje PDF stránky na obrázky pomocí PDF.js
 */
async function convertPdfToImages(
  pdfData: ArrayBuffer,
  maxPages: number = 10,
  scale: number = 2.0
): Promise<string[]> {
  try {
    // Použijeme globální pdfjsLib z window
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error('PDF.js není načten. Zkuste obnovit stránku.');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    const numPages = Math.min(pdf.numPages, maxPages);
    
    const images: string[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // Vytvoříme canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          continue;
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Vykreslíme stránku na canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Převedeme canvas na base64 PNG (bez data:image/png;base64, prefixu)
        const base64Image = canvas.toDataURL('image/png').split(',')[1];
        images.push(base64Image);
        
      } catch (pageError) {
      }
    }
    
    return images;
  } catch (error) {
    return [];
  }
}

/**
 * Hlavní funkce pro inteligentní extrakci metadat
 * Automaticky detekuje OCR a volá Edge Function s textem nebo obrázky
 */
export async function extractMetadataIntelligent(
  pdfUrl: string,
  filename: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<MetadataResponse> {
  
  try {
    // 1. Stáhneme PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Nepodařilo se stáhnout PDF: ${pdfResponse.status}`);
    }
    
    const pdfBlob = await pdfResponse.blob();
    const pdfData = await pdfBlob.arrayBuffer();
    
    // 2. Detekujeme OCR - pokusíme se extrahovat text
    const extractedText = await extractTextFromPDF(pdfData, 10);
    
    let requestData: any;
    let inputType: 'text' | 'images';
    
    // 3. Rozhodneme se podle množství textu
    if (extractedText.length > 500) {
      // ✅ Má OCR text
      inputType = 'text';
      requestData = {
        type: 'text',
        content: extractedText,
        fileName: filename,
      };
    } else {
      // ❌ Nemá OCR text → konvertujeme na obrázky
      const images = await convertPdfToImages(pdfData, 10, 2.0);
      
      if (images.length === 0) {
        throw new Error('Nepodařilo se převést PDF na obrázky');
      }
      
      inputType = 'images';
      requestData = {
        type: 'images',
        content: images,
        fileName: filename,
      };
    }
    
    // 4. Zavoláme Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/extract-metadata-ai`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function chyba: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Edge Function vrátila chybu');
    }
    
    
    return {
      success: true,
      metadata: {
        ...result.metadata,
        hasOCR: inputType === 'text',
      },
      type: inputType,
      model: result.model,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extrakce metadat z textového obsahu (pro TXT soubory)
 */
export async function extractMetadataFromText(
  textContent: string,
  filename: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<MetadataResponse> {
  try {
    // Pokud nemáme Supabase credentials, získáme je z prostředí
    const finalSupabaseUrl = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const finalSupabaseKey = supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!finalSupabaseUrl || !finalSupabaseKey) {
      throw new Error('Chybí Supabase konfigurace');
    }

    // Zavoláme Supabase Edge Function s textovým obsahem
    const edgeFunctionUrl = `${finalSupabaseUrl}/functions/v1/extract-metadata-ai`;
    
    const requestData = {
      type: 'text',
      content: textContent,
      fileName: filename,
    };
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalSupabaseKey}`,
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function chyba: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Edge Function vrátila chybu');
    }
    
    return {
      success: true,
      metadata: {
        ...result.metadata,
        hasOCR: true, // TXT soubor je už text
      },
      type: 'text',
      model: result.model,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Stará metoda - zachována pro kompatibilitu
 */
export async function analyzeDocument(
  content: string
): Promise<ExtractedMetadata> {
  return {
    summary: '',
    keywords: [],
    language: 'cs',
    categories: []
  };
}
