// supabase/functions/ilovepdf-proxy/index.ts
// Edge Function jako bezpečná proxy pro iLovePDF API
// Používá API klíče uložené v Supabase Secrets

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === ENV (iLovePDF klíče uloženy v Supabase Secrets) ===
const ILOVEPDF_SECRET_KEY = Deno.env.get("ILOVEPDF_SECRET_KEY");
const ILOVEPDF_PUBLIC_KEY = Deno.env.get("ILOVEPDF_PUBLIC_KEY");
const ILOVEPDF_BASE_URL = "https://api.ilovepdf.com/v1";

interface ProxyRequest {
  endpoint: string; // např. "/auth", "/start/pdfocr/eu"
  method?: string; // "GET", "POST", "DELETE"
  body?: any; // Request body (optional)
  server?: string; // Pro custom server URL (např. "api-eu1.ilovepdf.com")
  isFormData?: boolean; // Pokud true, použije FormData
  authToken?: string; // JWT token pro autentizované requesty
  usePublicKey?: boolean; // Pokud true, použije PUBLIC_KEY místo SECRET
}

// === Hlavní handler ===
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ověření API klíčů
    if (!ILOVEPDF_SECRET_KEY || !ILOVEPDF_PUBLIC_KEY) {
      throw new Error("iLovePDF API klíče nejsou nastaveny v Supabase Secrets");
    }

    // Parsování requestu
    const proxyRequest: ProxyRequest = await req.json();
    const { 
      endpoint, 
      method = "GET", 
      body, 
      server, 
      isFormData = false,
      authToken,
      usePublicKey = false
    } = proxyRequest;

    if (!endpoint) {
      throw new Error("Chybí povinné pole: endpoint");
    }

    console.log(`🔄 Proxy request na iLovePDF: ${method} ${endpoint}`);

    // Sestavení URL
    let url: string;
    if (server) {
      // Custom server (např. pro upload/download)
      url = `https://${server}${endpoint}`;
    } else {
      url = `${ILOVEPDF_BASE_URL}${endpoint}`;
    }

    // Sestavení headers
    const headers: Record<string, string> = {};

    // Autentizace
    if (authToken) {
      // Použití JWT tokenu
      headers["Authorization"] = `Bearer ${authToken}`;
    } else if (endpoint === "/auth") {
      // Auth endpoint nepotřebuje Authorization header
      headers["Content-Type"] = "application/json";
    }

    // Content-Type pro non-FormData requesty
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Sestavení fetch options
    const fetchOptions: RequestInit = {
      method: method,
      headers: headers,
    };

    // Body handling
    if (body) {
      if (isFormData) {
        // FormData upload
        const formData = new FormData();
        for (const [key, value] of Object.entries(body)) {
          if (key === "file") {
            // Pro file upload očekáváme base64 string a metadata
            const fileData = value as { data: string; name: string; type: string };
            const binaryString = atob(fileData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: fileData.type });
            formData.append(key, blob, fileData.name);
          } else {
            formData.append(key, value as string);
          }
        }
        fetchOptions.body = formData;
      } else if (method !== "GET" && method !== "HEAD") {
        // JSON body
        let bodyToSend = body;
        
        // Pro auth endpoint přidáme public_key
        if (endpoint === "/auth") {
          bodyToSend = {
            public_key: usePublicKey ? ILOVEPDF_PUBLIC_KEY : ILOVEPDF_PUBLIC_KEY,
            ...body
          };
        }
        
        fetchOptions.body = JSON.stringify(bodyToSend);
      }
    } else if (endpoint === "/auth") {
      // Auth endpoint vyžaduje public_key
      fetchOptions.body = JSON.stringify({
        public_key: ILOVEPDF_PUBLIC_KEY
      });
    }

    console.log(`📡 Volám: ${url}`);

    // Zavolání iLovePDF API
    const response = await fetch(url, fetchOptions);

    console.log(`📡 iLovePDF response status: ${response.status}`);

    // Pro HEAD requesty (kontrola dostupnosti) vracíme jen status
    if (method === "HEAD") {
      return new Response(null, {
        status: response.status,
        headers: corsHeaders,
      });
    }

    // Přeposíláme response
    let responseData;
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      responseData = await response.json();
    } else if (contentType?.includes("application/pdf") || contentType?.includes("octet-stream")) {
      // Pro binary soubory vracíme jako base64
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      responseData = {
        success: true,
        file: base64,
        contentType: contentType
      };
    } else {
      responseData = await response.text();
    }

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
    console.error("❌ Chyba v iLovePDF proxy:", error);
    
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

