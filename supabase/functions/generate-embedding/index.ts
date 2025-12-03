// supabase/functions/generate-embedding/index.ts
// Edge Function pro generování embeddings pomocí OpenAI text-embedding-3-large

// === ENV (OpenRouter API klíč uložen v Supabase Secrets) ===
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";

// Model pro embeddings
const MODEL = "text-embedding-3-large";  // OpenAI large embedding model
const DIMENSIONS = 3072;  // Rozměr embeddingu (default pro text-embedding-3-large)

interface EmbeddingRequest {
  text: string;
}

interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  dimensions?: number;
  model?: string;
  error?: string;
}

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
    const body: EmbeddingRequest = await req.json();
    const { text } = body;

    console.log(`🔢 Embedding request - text length: ${text?.length || 0} znaků`);

    if (!text) {
      throw new Error("Chybí povinné pole: text");
    }

    // Validace textu
    if (text.trim().length === 0) {
      throw new Error("Text je prázdný");
    }

    console.log(`📡 Volám OpenRouter API s modelem: ${MODEL}`);
    console.log(`📝 Text: "${text.substring(0, 100)}..."`);

    // Zavoláme OpenRouter API pro embeddings
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medbase.bewit.love",
        "X-Title": "MedBase - Embedding Generation",
      },
      body: JSON.stringify({
        model: MODEL,
        input: text,
        dimensions: DIMENSIONS
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

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error("Neplatná struktura odpovědi z OpenRouter API");
    }

    const embedding = data.data[0].embedding;

    if (!Array.isArray(embedding)) {
      throw new Error("Embedding není array");
    }

    console.log(`✅ Embedding vygenerován: ${embedding.length} rozměrů`);

    // Vrátíme úspěšnou odpověď
    return new Response(
      JSON.stringify({
        success: true,
        embedding: embedding,
        dimensions: embedding.length,
        model: MODEL
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

