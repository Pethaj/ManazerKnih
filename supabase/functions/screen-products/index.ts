// supabase/functions/screen-products/index.ts
// ============================================================================
// MINIMÁLNÍ EDGE FUNCTION - POUZE PROXY PRO OPENROUTER API
// ============================================================================
// Tato funkce POUZE:
// 1. Přijme request z frontendu (systemPrompt, userPrompt, model, temperature)
// 2. Zavolá OpenRouter API s těmito parametry
// 3. Vrátí surovou odpověď
// 
// ⚠️ ŽÁDNÁ BUSINESS LOGIKA TADY!
// Veškeré prompty, parsování, rozhodování je na frontendu.
// ============================================================================

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ============================================================================
// INTERFACES
// ============================================================================

interface OpenRouterRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenRouterResponse {
  success: boolean;
  response: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// HLAVNÍ HANDLER
// ============================================================================
Deno.serve(async (req) => {
  const startTime = Date.now();
  
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
    const body: OpenRouterRequest = await req.json();
    const { systemPrompt, userPrompt, model, temperature, maxTokens } = body;

    console.log("═".repeat(70));
    console.log("🔐 OpenRouter API Proxy");
    console.log("═".repeat(70));
    console.log(`📡 Model: ${model || 'default'}`);
    console.log(`🌡️ Temperature: ${temperature ?? 0.3}`);
    console.log(`📝 System prompt length: ${systemPrompt?.length || 0}`);
    console.log(`📝 User prompt length: ${userPrompt?.length || 0}`);

    // Validace
    if (!systemPrompt || !userPrompt) {
      throw new Error("Chybí systemPrompt nebo userPrompt");
    }

    // Zavoláme OpenRouter API
    console.log(`📡 Volám OpenRouter API...`);
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medbase.bewit.love",
        "X-Title": "MedBase - Wany Chat Agent",
      },
      body: JSON.stringify({
        model: model || "anthropic/claude-3-haiku",  // ✅ OPRAVENO: Správný model ID
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens || 1500,
        temperature: temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("❌ OpenRouter API chyba:", errorData);
      throw new Error(`OpenRouter API chyba: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      throw new Error("OpenRouter vrátil prázdnou odpověď");
    }

    const duration = Date.now() - startTime;

    console.log("═".repeat(70));
    console.log(`✅ OpenRouter API Success`);
    console.log(`📄 Response length: ${responseText.length} znaků`);
    console.log(`⏱️ Duration: ${duration}ms`);
    if (data.usage) {
      console.log(`💰 Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    }
    console.log("═".repeat(70));

    // Vrátíme surovou odpověď
    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        usage: data.usage
      } as OpenRouterResponse),
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
        response: "",
        error: error instanceof Error ? error.message : "Neznámá chyba",
      } as OpenRouterResponse),
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
