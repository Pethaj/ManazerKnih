// supabase/functions/openai-proxy/index.ts
// Edge Function jako bezpečná proxy pro OpenAI API
// Používá API klíč uložený v Supabase Secrets

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === ENV (OpenAI API klíč uložen v Supabase Secrets) ===
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_BASE = "https://api.openai.com/v1";

interface ProxyRequest {
  endpoint: string; // např. "/chat/completions", "/embeddings"
  method?: string; // "POST" default
  body: any; // Request body pro OpenAI API
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
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY není nastaven v Supabase Secrets");
    }

    // Parsování requestu
    const proxyRequest: ProxyRequest = await req.json();
    const { endpoint, method = "POST", body } = proxyRequest;

    if (!endpoint) {
      throw new Error("Chybí povinné pole: endpoint");
    }

    console.log(`🔄 Proxy request na OpenAI: ${endpoint}`);

    // Zavoláme OpenAI API s naším klíčem
    const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
      method: method,
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`📡 OpenAI response status: ${response.status}`);

    // Přeposíláme response včetně status kódu
    const responseData = await response.json();

    return new Response(
      JSON.stringify(responseData),
      {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("❌ Chyba v OpenAI proxy:", error);
    
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : "Neznámá chyba",
          type: "proxy_error"
        }
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

