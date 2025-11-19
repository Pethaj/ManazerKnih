// supabase/functions/extract-metadata-ai/index.ts
// Edge Function pro inteligentní extrakci metadat z PDF pomocí OpenRouter API
// Podporuje jak textový vstup (OCR PDF), tak vision vstup (obrázky)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === ENV (OpenRouter API klíč uložen v Supabase Secrets) ===
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Modely pro různé typy vstupů
const TEXT_MODEL = "meta-llama/llama-3.1-8b-instruct"; // Levný, rychlý pro textový vstup
const VISION_MODEL = "openai/gpt-4o-mini"; // Vision support pro obrázky

interface MetadataRequest {
  type: "text" | "images" | "pdf_url";
  content?: string | string[]; // Text nebo array base64 obrázků (pro type="text" nebo "images")
  pdfUrl?: string; // URL na PDF soubor (pro type="pdf_url")
  fileName: string;
}

interface ExtractedMetadata {
  title?: string;
  author?: string;
  publicationYear?: number;
  publisher?: string;
  language?: string;
  summary?: string;
  keywords?: string[];
  releaseVersion?: string;
}

// === Prompt pro extrakci metadat ===
const SYSTEM_PROMPT = `Jsi odborný asistent pro analýzu dokumentů a extrakci metadat.

TVŮJ ÚKOL:
Analyzuj poskytnutý obsah (text nebo obrázky) z prvních 10 stránek dokumentu a extrahuj následující metadata:
- title: Název publikace (přesný název z titulní strany)
- author: Autor/autoři (odděleni čárkou pokud je jich více)
- publicationYear: Rok prvního vydání (pouze číslo)
- publisher: Nakladatelství nebo instituce
- language: Jazyk dokumentu (v češtině, např. "Čeština", "Angličtina", "Němčina")
- summary: Stručné shrnutí obsahu (2-3 věty, konkrétní a informativní)
- keywords: 5-7 klíčových slov (v češtině, oddělených čárkou)
- releaseVersion: Verze vydání (např. "1. vydání", "2. vydání", "revidované vydání")

DŮLEŽITÁ PRAVIDLA:
1. Používej POUZE informace viditelné v poskytnutém obsahu
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

// === Hlavní handler ===
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ověření API klíče
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY není nastaven v Supabase Secrets");
    }

    // Parsování requestu
    const body: MetadataRequest = await req.json();
    const { type, content, pdfUrl, fileName } = body;

    console.log(`🤖 Metadata extraction request:`, {
      type,
      fileName,
      contentLength: content ? (Array.isArray(content) ? content.length : content.length) : 0,
      pdfUrl: pdfUrl ? "provided" : "not provided",
    });

    if (!type || !fileName) {
      throw new Error("Chybí povinná pole: type, fileName");
    }

    // Pro pdf_url typ stáhneme PDF a zjistíme, zda má OCR
    let actualType: "text" | "images" = "text";
    let actualContent: string | string[] = "";

    if (type === "pdf_url") {
      if (!pdfUrl) {
        throw new Error("Pro type='pdf_url' je povinné pole 'pdfUrl'");
      }

      console.log(`📥 Stahuji PDF z URL: ${pdfUrl}`);
      
      // Stáhneme PDF
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Nepodařilo se stáhnout PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfBlob = await pdfResponse.arrayBuffer();
      console.log(`✅ PDF staženo (${Math.round(pdfBlob.byteLength / 1024)} KB)`);

      // Konvertujeme PDF na obrázky pomocí pdf-lib nebo podobné knihovny
      // Pro jednoduchost nyní použijeme images approach (vision model)
      // V produkci by bylo lepší použít server-side PDF.js pro detekci OCR
      
      console.log(`🖼️ PDF nemá OCR vrstvu, použijeme vision model s obrázky`);
      actualType = "images";
      
      // TODO: Implementovat konverzi PDF -> obrázky
      // Pro teď vrátíme chybu s jasnou zprávou
      throw new Error("PDF konverze na obrázky zatím není implementována v Edge Function. Použijte prosím frontend konverzi.");
      
    } else if (type === "text" || type === "images") {
      if (!content) {
        throw new Error(`Pro type='${type}' je povinné pole 'content'`);
      }
      actualType = type;
      actualContent = content;
    } else {
      throw new Error(`Neplatný typ vstupu: ${type}. Podporované: "text", "images" nebo "pdf_url"`);
    }

    // Připravíme zprávy podle typu vstupu
    let messages: any[];
    let model: string;

    if (actualType === "text") {
      // Textový vstup - použijeme textový model
      model = TEXT_MODEL;
      const textContent = Array.isArray(actualContent) ? actualContent.join("\n") : actualContent;
      const userPrompt = `Analyzuj následující text z prvních 10 stránek dokumentu "${fileName}" a extrahuj metadata podle instrukcí.\n\nTEXT:\n${textContent}`;
      
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ];
    } else if (actualType === "images") {
      // Vision vstup - použijeme vision model
      model = VISION_MODEL;
      const images = Array.isArray(actualContent) ? actualContent : [actualContent];
      
      const userContent: any[] = [
        {
          type: "text",
          text: `Analyzuj následující obrázky prvních 10 stránek dokumentu "${fileName}" a extrahuj metadata podle instrukcí.`,
        },
      ];

      // Přidáme všechny obrázky
      for (const img of images) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${img}`,
          },
        });
      }

      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ];
    }

    console.log(`📡 Volám OpenRouter API s modelem: ${model}`);

    // Zavoláme OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medbase.bewit.love", // Pro OpenRouter analytics
        "X-Title": "MedBase - Metadata Extraction",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("❌ OpenRouter API error:", { status: response.status, errorData });
      throw new Error(
        `OpenRouter API chyba: ${response.status} - ${errorData?.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ OpenRouter response received");

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Neplatná struktura odpovědi z OpenRouter API");
    }

    const responseText = data.choices[0].message.content?.trim();
    if (!responseText) {
      throw new Error("OpenRouter vrátil prázdnou odpověď");
    }

    console.log(`📄 Response text length: ${responseText.length} znaků`);

    // Parsujeme JSON odpověď
    let jsonText = responseText;

    // Odebereme markdown code blocky pokud existují
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    let metadata: ExtractedMetadata;
    try {
      metadata = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("❌ Chyba při parsování JSON:", parseError);
      console.error("📄 Odpověď:", responseText);
      throw new Error(`Nepodařilo se parsovat JSON odpověď: ${parseError.message}`);
    }

    console.log("✅ Metadata úspěšně extrahována:", metadata);

    // Vrátíme úspěšnou odpověď
    return new Response(
      JSON.stringify({
        success: true,
        metadata: metadata,
        model: model,
        type: type,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Chyba v edge function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Neznámá chyba",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});


