// supabase/functions/cloudconvert-proxy/index.ts
// Edge Function jako bezpečná proxy pro CloudConvert API
// Používá API klíč uložený v Supabase Secrets

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === ENV (CloudConvert API klíč uložen v Supabase Secrets) ===
const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY");
const CLOUDCONVERT_API_BASE = "https://api.cloudconvert.com/v2";

interface ProxyRequest {
  endpoint: string; // např. "/jobs", "/jobs/123"
  method?: string; // "GET", "POST", "DELETE"
  body?: any; // Request body (optional)
  isFormData?: boolean; // Pokud true, endpoint obsahuje plnou URL a nepřidáváme auth header
}

// === Hlavní handler ===
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ověření API klíče
    if (!CLOUDCONVERT_API_KEY) {
      throw new Error("CLOUDCONVERT_API_KEY není nastaven v Supabase Secrets");
    }

    // Parsování requestu
    const proxyRequest: ProxyRequest = await req.json();
    const { endpoint, method = "GET", body, isFormData = false } = proxyRequest;

    if (!endpoint) {
      throw new Error("Chybí povinné pole: endpoint");
    }

    console.log(`🔄 Proxy request na CloudConvert: ${method} ${endpoint}`);

    // Pro FormData upload (upload task) - endpoint je plná URL
    if (isFormData) {
      console.log(`📤 FormData upload na: ${endpoint}`);
      
      // Speciální handling pro FormData - předpokládáme že body je již připravený
      // Aplikace nám pošle form data jako object, který musíme přeložit
      const formData = new FormData();
      if (body) {
        for (const [key, value] of Object.entries(body)) {
          formData.append(key, value as string);
        }
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

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
    }

    // Standardní API volání
    const url = `${CLOUDCONVERT_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json",
    };

    const fetchOptions: RequestInit = {
      method: method,
      headers: headers,
    };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    console.log(`📡 CloudConvert response status: ${response.status}`);

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
    console.error("❌ Chyba v CloudConvert proxy:", error);
    
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

