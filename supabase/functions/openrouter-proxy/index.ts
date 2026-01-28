// supabase/functions/openrouter-proxy/index.ts
// ============================================================================
// OPENROUTER API PROXY - MINIMÁLNÍ EDGE FUNCTION
// ============================================================================
// 
// Jediný účel: Bezpečné volání OpenRouter API bez exposování API klíče.
// 
// ŽÁDNÁ BUSINESS LOGIKA!
// Veškerá logika (prompty, parsování, rozhodování) je na frontendu.
// 
// Použití:
// - Intent Routing (rozhodování chat vs funnel)
// - Product Funnel (výběr 2 produktů)
// - Jakékoliv další LLM volání v budoucnu
// ============================================================================

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ============================================================================
// INTERFACES
// ============================================================================

interface OpenRouterProxyRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenRouterProxyResponse {
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
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
    const body: OpenRouterProxyRequest = await req.json();
    const { 
      systemPrompt, 
      userPrompt, 
      model = "anthropic/claude-3-haiku",  // ✅ OPRAVENO: Správný model ID
      temperature = 0.3,
      maxTokens = 1500
    } = body;

    console.log("═".repeat(70));
    console.log("🔐 OpenRouter Proxy - Request Received");
    console.log("═".repeat(70));
    console.log(`📡 Model: ${model}`);
    console.log(`🌡️ Temperature: ${temperature}`);
    console.log(`📊 Max Tokens: ${maxTokens}`);
    console.log(`📝 System Prompt: ${systemPrompt?.length || 0} chars`);
    console.log(`📝 User Prompt: ${userPrompt?.length || 0} chars`);

    // Validace vstupů
    if (!systemPrompt || !userPrompt) {
      throw new Error("Chybí povinné pole: systemPrompt nebo userPrompt");
    }

    if (systemPrompt.length > 50000 || userPrompt.length > 50000) {
      throw new Error("Prompt je příliš dlouhý (max 50000 znaků)");
    }

    // Volání OpenRouter API
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
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("❌ OpenRouter API Error:", errorData);
      throw new Error(`OpenRouter API chyba: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      throw new Error("OpenRouter vrátil prázdnou odpověď");
    }

    const duration = Date.now() - startTime;

    console.log("═".repeat(70));
    console.log(`✅ OpenRouter API - Success`);
    console.log(`📄 Response: ${responseText.length} chars`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    if (data.usage) {
      console.log(`💰 Tokens Used: ${data.usage.total_tokens}`);
      console.log(`   - Prompt: ${data.usage.prompt_tokens}`);
      console.log(`   - Completion: ${data.usage.completion_tokens}`);
    }
    
    console.log("═".repeat(70));

    // Vrátíme čistou odpověď
    const responseBody: OpenRouterProxyResponse = {
      success: true,
      response: responseText,
      usage: data.usage
    };

    return new Response(
      JSON.stringify(responseBody),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error("═".repeat(70));
    console.error("❌ OpenRouter Proxy - Error");
    console.error("═".repeat(70));
    console.error(`🚫 Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`⏱️ Duration: ${duration}ms`);
    console.error("═".repeat(70));

    const errorResponse: OpenRouterProxyResponse = {
      success: false,
      response: "",
      error: error instanceof Error ? error.message : "Neznámá chyba",
    };

    return new Response(
      JSON.stringify(errorResponse),
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
