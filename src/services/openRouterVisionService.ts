/**
 * OpenAI Vision Service
 * Pro extrakci metadat z PDF obrázků pomocí vision modelů (GPT-4o mini)
 * Používá přímo OpenAI API místo OpenRouter
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface VisionImageInput {
  page_number: number;
  base64_png: string; // Base64 encoded PNG image
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

export interface VisionResponse {
  success: boolean;
  metadata?: ExtractedMetadata;
  error?: string;
}

/**
 * Extrahuje metadata z PDF obrázků pomocí vision LLM modelu
 */
export async function extractMetadataFromImages(
  images: VisionImageInput[],
  originalFileName: string
): Promise<VisionResponse> {
  console.log(`🖼️ Extrahuji metadata z ${images.length} obrázků pomocí vision LLM...`);
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OpenAI API klíč není nastaven');
    return {
      success: false,
      error: 'OpenAI API klíč není nastaven'
    };
  }

  if (!images || images.length === 0) {
    return {
      success: false,
      error: 'Žádné obrázky k analýze'
    };
  }

  try {
    // Vytvoříme prompt s instrukcemi pro extrakci metadat
    const systemPrompt = `Jsi odborný asistent pro analýzu dokumentů. Dostaneš obrázky prvních stránek PDF dokumentu (max 10 stránek).

TVŮJ ÚKOL:
Analyzuj text a informace viditelné na obrázcích a extrahuj následující metadata:
- title: Název publikace (přesný název z titulní strany)
- author: Autor/autoři (odděleni čárkou pokud je jich více)
- publicationYear: Rok prvního vydání (pouze číslo)
- publisher: Nakladatelství nebo instituce
- language: Jazyk dokumentu (v češtině, např. "Čeština", "Angličtina", "Němčina")
- summary: Stručné shrnutí obsahu (2-3 věty, konkrétní a informativní)
- keywords: 5-7 klíčových slov (v češtině, oddělených čárkou)
- releaseVersion: Verze vydání (např. "1. vydání", "2. vydání", "revidované vydání")

DŮLEŽITÁ PRAVIDLA:
1. Používej POUZE informace viditelné na obrázcích
2. Pokud nějakou informaci nenajdeš, vynech ji úplně (nevymýšlej)
3. Pro summary: Buď konkrétní, nezačínej frázemi jako "Tato kniha je o..."
4. Pro keywords: Zaměř se na hlavní témata a obsah knihy
5. Pro language: Nikdy neodpovídej "neznámý" - vyber konkrétní jazyk na základě textu

FORMÁT ODPOVĚDI:
Vrať POUZE validní JSON objekt (bez jakéhokoliv dalšího textu) ve formátu:
{
  "title": "...",
  "author": "...",
  "publicationYear": 2023,
  "publisher": "...",
  "language": "...",
  "summary": "...",
  "keywords": ["...", "...", "..."],
  "releaseVersion": "..."
}`;

    const userPrompt = `Analyzuj následující obrázky prvních ${images.length} stránek dokumentu "${originalFileName}" a extrahuj metadata podle instrukcí.`;

    // Připravíme content s textem a obrázky
    const content: any[] = [
      {
        type: 'text',
        text: userPrompt
      }
    ];

    // Přidáme všechny obrázky
    for (const img of images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${img.base64_png}`
        }
      });
    }

    console.log('📦 Request na OpenAI Vision API:', {
      model: 'gpt-4o-mini',
      images: images.length,
      fileName: originalFileName,
      apiUrl: OPENAI_API_URL
    });

    console.log('🔑 API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 20)}...` : 'CHYBÍ!');

    let response;
    try {
      console.log('📡 Odesílám fetch požadavek...');
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: content }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });
      console.log('✅ Fetch dokončen, response obdržen');
    } catch (fetchError) {
      console.error('❌ Fetch selhal:', fetchError);
      console.error('❌ Fetch error type:', typeof fetchError);
      console.error('❌ Fetch error details:', {
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        name: fetchError instanceof Error ? fetchError.name : 'Unknown',
        stack: fetchError instanceof Error ? fetchError.stack : 'N/A'
      });
      return {
        success: false,
        error: `Network error při volání OpenAI API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}.`
      };
    }

    console.log('📡 OpenAI Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ OpenAI API error:', { status: response.status, errorData });
      return {
        success: false,
        error: `OpenAI API chyba: ${response.status} - ${errorData?.error?.message || response.statusText}`
      };
    }

    const data = await response.json();
    console.log('📊 OpenAI response data:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Neplatná struktura odpovědi:', data);
      return {
        success: false,
        error: 'Neplatná odpověď z OpenRouter API - chybí message data'
      };
    }

    const responseText = data.choices[0].message.content?.trim();
    if (!responseText) {
      return {
        success: false,
        error: 'Vision LLM vrátil prázdnou odpověď'
      };
    }

    console.log(`✅ Vision LLM odpověď vygenerována! Délka: ${responseText.length} znaků`);
    console.log('📄 Odpověď:', responseText);

    // Parsujeme JSON odpověď
    try {
      // Pokusíme se extrahovat JSON z odpovědi (někdy LLM přidá markdown formátování)
      let jsonText = responseText;
      
      // Odebereme markdown code blocky pokud existují
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      const metadata: ExtractedMetadata = JSON.parse(jsonText);
      
      console.log('✅ Metadata úspěšně extrahována:', metadata);
      
      return {
        success: true,
        metadata: metadata
      };
      
    } catch (parseError) {
      console.error('❌ Chyba při parsování JSON odpovědi:', parseError);
      console.error('📄 Odpověď, kterou se nepodařilo parsovat:', responseText);
      return {
        success: false,
        error: `Nepodařilo se parsovat JSON odpověď: ${parseError instanceof Error ? parseError.message : 'Neznámá chyba'}`
      };
    }

  } catch (error) {
    console.error('❌ Chyba při volání OpenRouter Vision API:', error);
    return {
      success: false,
      error: `Chyba při volání Vision API: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
}

/**
 * Testovací funkce pro ověření API klíče
 */
export async function testVisionAPI(): Promise<boolean> {
  console.log('🧪 Testuji OpenRouter Vision API...');
  
  try {
    // Vytvoříme jednoduchý testovací obrázek (1x1 pixel PNG)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await extractMetadataFromImages([
      { page_number: 1, base64_png: testImage }
    ], 'test.pdf');
    
    console.log('✅ Vision API test:', result.success ? 'ÚSPĚŠNÝ' : 'NEÚSPĚŠNÝ');
    return result.success;
  } catch (error) {
    console.error('❌ Vision API test neúspěšný:', error);
    return false;
  }
}

