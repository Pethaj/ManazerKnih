// supabase/functions/screen-products/index.ts
// Edge Function pro screening produktů v textu pomocí OpenRouter GPT-4o-mini
// Identifikuje produkty a témata z čínské medicíny

// === ENV (OpenRouter API klíč uložen v Supabase Secrets) ===
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model pro screening
const MODEL = "openai/gpt-4o-mini"; // Levný, rychlý model

interface ScreeningRequest {
  text: string;
}

interface ScreeningResponse {
  success: boolean;
  products: string[];
  error?: string;
}

// === Prompt pro screening ===
const SCREENING_PROMPT = `Jsi odborný asistent pro analýzu textu v oblasti čínské medicíny a přírodní medicíny.

TVŮJ ÚKOL:
Analyzuj poskytnutý text a identifikuj všechny zmínky o:
- Konkrétních produktech (např. "009 - Čistý dech", "Bewit Levandule")
- Tématech týkajících se čínské medicíny (TČM)
- Bylinných směsích, wan (丸)
- Přírodních/alternativních léčebných metodách
- Ingrediencích a léčivých bylinách
- Terapeutických přístupech z oblasti přírodní medicíny

DŮLEŽITÁ PRAVIDLA:
1. Vyhledávej POUZE skutečné zmínky v textu (nevymýšlej)
2. Pokud text nemá žádné relevantní produkty/témata, vrať prázdný seznam
3. Každý produkt/téma zapiš jako samostatnou položku
4. Používej stručné názvy (např. "bolest hlavy - bylinky", "wan na imunitu")
5. Ignoruj obecné zdravotní rady bez konkrétního produktového zaměření

FORMÁT ODPOVĚDI:
Vrať POUZE validní JSON array (bez jakéhokoliv dalšího textu) ve formátu:
["produkt 1", "produkt 2", "téma 3"]

PŘÍKLADY:
Text: "Pro bolest hlavy doporučuji wan 009 - Čistý dech, který pomáhá s průchodností nosních dírek."
Odpověď: ["009 - Čistý dech", "bolest hlavy", "nosní průchodnost"]

Text: "Dobrý den, jak se máte dnes?"
Odpověď: []

Text: "Bewit Levandule 15ml je skvělý produkt na uklidnění mysli a podporu spánku."
Odpověď: ["Bewit Levandule", "uklidnění mysli", "podpora spánku"]`;

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
    const body: ScreeningRequest = await req.json();
    const { text } = body;

    console.log(`🔍 Product screening request - text length: ${text?.length || 0} znaků`);

    if (!text) {
      throw new Error("Chybí povinné pole: text");
    }

    // Validace textu
    if (text.trim().length === 0) {
      console.log("⚠️ Prázdný text, vracím prázdný seznam");
      return new Response(
        JSON.stringify({
          success: true,
          products: [],
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (text.trim().length < 20) {
      console.log("⚠️ Text příliš krátký pro screening");
      return new Response(
        JSON.stringify({
          success: true,
          products: [],
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`📡 Volám OpenRouter API s modelem: ${MODEL}`);
    console.log(`📝 Text preview: "${text.substring(0, 150)}..."`);

    // Zavoláme OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medbase.bewit.love",
        "X-Title": "MedBase - Product Screening",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SCREENING_PROMPT },
          { role: "user", content: `Analyzuj tento text a identifikuj produkty/témata:\n\n${text}` }
        ],
        max_tokens: 500,
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

    console.log(`📄 Response text: ${responseText}`);

    // Parsujeme JSON odpověď
    let jsonText = responseText;

    // Odebereme markdown code blocky pokud existují
    const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    let products: string[];
    try {
      products = JSON.parse(jsonText);

      // Ověříme, že je to array
      if (!Array.isArray(products)) {
        throw new Error("Odpověď není array");
      }

      // Filtrujeme pouze stringy
      products = products.filter(item => typeof item === "string" && item.trim().length > 0);

    } catch (parseError) {
      console.error("❌ Chyba při parsování JSON:", parseError);
      console.error("📄 Odpověď:", responseText);
      throw new Error(`Nepodařilo se parsovat JSON odpověď: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    console.log(`✅ Screening dokončen: ${products.length} produktů/témat nalezeno`);
    if (products.length > 0) {
      console.log("📦 Nalezené produkty/témata:", products);
    }

    // Vrátíme úspěšnou odpověď
    return new Response(
      JSON.stringify({
        success: true,
        products: products,
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
        products: [],
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


