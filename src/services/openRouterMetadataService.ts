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
    console.log(`📄 Extrahuji text z prvních ${numPages} stránek...`);
    
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
        console.log(`📝 Stránka ${pageNum}: ${pageText.length} znaků`);
      } catch (pageError) {
        console.warn(`⚠️ Chyba při zpracování stránky ${pageNum}:`, pageError);
      }
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('❌ Chyba při extrakci textu z PDF:', error);
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
    console.log(`🖼️ Konvertuji prvních ${numPages} stránek na obrázky...`);
    
    const images: string[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // Vytvoříme canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          console.error('❌ Nepodařilo se získat 2D kontext canvasu');
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
        
        console.log(`✅ Stránka ${pageNum} převedena (${Math.round(base64Image.length / 1024)} KB)`);
      } catch (pageError) {
        console.error(`❌ Chyba při konverzi stránky ${pageNum}:`, pageError);
      }
    }
    
    return images;
  } catch (error) {
    console.error('❌ Chyba při konverzi PDF na obrázky:', error);
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
  console.log('🤖 Spouštím inteligentní extrakci metadat...');
  console.log('📥 PDF URL:', pdfUrl);
  console.log('📁 Název souboru:', filename);
  
  try {
    // 1. Stáhneme PDF
    console.log('📥 Stahuji PDF soubor...');
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Nepodařilo se stáhnout PDF: ${pdfResponse.status}`);
    }
    
    const pdfBlob = await pdfResponse.blob();
    const pdfData = await pdfBlob.arrayBuffer();
    const pdfSizeMB = (pdfData.byteLength / 1024 / 1024).toFixed(2);
    console.log(`✅ PDF staženo (${pdfSizeMB} MB)`);
    
    // 2. Detekujeme OCR - pokusíme se extrahovat text
    console.log('🔍 Detekuji OCR text...');
    const extractedText = await extractTextFromPDF(pdfData, 10);
    
    let requestData: any;
    let inputType: 'text' | 'images';
    
    // 3. Rozhodneme se podle množství textu
    if (extractedText.length > 500) {
      // ✅ Má OCR text
      console.log(`✅ PDF obsahuje OCR text (${extractedText.length} znaků)`);
      console.log(`📝 První 200 znaků: "${extractedText.substring(0, 200)}..."`);
      
      inputType = 'text';
      requestData = {
        type: 'text',
        content: extractedText,
        fileName: filename,
      };
    } else {
      // ❌ Nemá OCR text → konvertujeme na obrázky
      console.log(`❌ PDF neobsahuje OCR text (pouze ${extractedText.length} znaků)`);
      console.log('🖼️ Konvertuji PDF na obrázky pro vision model...');
      
      const images = await convertPdfToImages(pdfData, 10, 2.0);
      
      if (images.length === 0) {
        throw new Error('Nepodařilo se převést PDF na obrázky');
      }
      
      console.log(`✅ Převedeno ${images.length} stránek na obrázky`);
      
      inputType = 'images';
      requestData = {
        type: 'images',
        content: images,
        fileName: filename,
      };
    }
    
    // 4. Zavoláme Supabase Edge Function
    console.log(`📡 Volám Edge Function s typem: ${inputType}`);
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
    
    console.log('✅ Metadata úspěšně extrahována:', result.metadata);
    console.log(`📊 Model: ${result.model} | Typ: ${result.type}`);
    
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
    console.error('❌ Chyba při inteligentní extrakci metadat:', error);
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
  console.warn('⚠️ analyzeDocument je deprecated, použijte extractMetadataIntelligent');
  return {
    summary: '',
    keywords: [],
    language: 'cs',
    categories: []
  };
}
