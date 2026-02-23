// supabase/functions/feed-agent-proxy/index.ts
// ============================================================================
// FEED AGENT PROXY - Edge Function pro nativní tool calling
// ============================================================================
//
// Na rozdíl od openrouter-proxy tato funkce:
// - Přijímá messages[] místo systemPrompt/userPrompt
// - Podporuje tools[] pro nativní tool calling (OpenAI formát)
// - Vrací raw OpenAI-compatible response (choices[0].message.tool_calls)
//
// Použití: pouze Feed Agent (feedAgentService.ts)
// ============================================================================

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY není nastaven v Supabase Secrets");
    }

    const body = await req.json();
    const {
      model,
      messages,
      tools,
      tool_choice,
      temperature = 0.1,
      max_tokens = 3000,
    } = body;

    if (!model || !messages || !Array.isArray(messages)) {
      throw new Error("Chybí povinné pole: model nebo messages[]");
    }

    console.log("═".repeat(60));
    console.log("🤖 Feed Agent Proxy - Request");
    console.log(`📡 Model: ${model}`);
    console.log(`💬 Messages: ${messages.length}`);
    console.log(`🔧 Tools: ${tools?.length || 0}`);
    console.log("═".repeat(60));

    // Sestavíme payload pro OpenRouter - přeposíláme 1:1
    const payload: Record<string, any> = {
      model,
      messages,
      temperature,
      max_tokens,
    };

    // Tools jsou volitelné - přidáme jen pokud jsou definovány
    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = tool_choice || "auto";
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bewit.cz",
        "X-Title": "BEWIT Feed Agent",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: response.statusText }));
      console.error("❌ OpenRouter chyba:", errData);
      throw new Error(`OpenRouter API chyba: ${response.status} - ${JSON.stringify(errData)}`);
    }

    // Vrátíme raw OpenAI-compatible response beze změny
    const data = await response.json();

    const choice = data?.choices?.[0];
    const hasToolCalls = !!(choice?.message?.tool_calls?.length);
    console.log(`✅ Response: ${hasToolCalls ? `tool_calls(${choice.message.tool_calls.length})` : 'text'}`);
    console.log(`💰 Tokens: ${data?.usage?.total_tokens || '?'}`);
    console.log("═".repeat(60));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Feed Agent Proxy Error:", error instanceof Error ? error.message : error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Neznámá chyba",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
