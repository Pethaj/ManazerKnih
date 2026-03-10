// supabase/functions/bewit-account-proxy/index.ts
// ============================================================================
// BEWIT ACCOUNT API PROXY
// ============================================================================
//
// Jediný účel: Proxy volání na api.mybewit.com/account?include=bbo
// bez CORS omezení (server-to-server komunikace).
//
// Iframe posílá Bearer token → Edge Function zavolá Bewit API →
// Vrátí bbo_customer_prices_id → iframe namapuje 1=A, 2=B, 3=C
// ============================================================================

const BEWIT_API_URL = "https://api.mybewit.com/account?include=bbo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parsuj token z těla requestu
    const body = await req.json();
    const token: string | undefined = body?.token;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Chybí token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔄 Bewit Account Proxy - volám Bewit API...");

    // Server-to-server volání (bez CORS omezení)
    const response = await fetch(BEWIT_API_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    console.log(`📊 Bewit API status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Bewit API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Bewit API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Vyber jen co potřebujeme
    const bboCustomerPricesId = data?.data?.bbo?.bbo_customer_prices_id ?? null;
    const ccPotentialRaynet = data?.data?.cc_potential_raynet ?? null;

    // Mapování bbo_customer_prices_id na typ (1=A, 2=B, 3=C)
    const typeMap: Record<number, string> = { 1: "A", 2: "B", 3: "C" };
    const customerType = bboCustomerPricesId !== null
      ? (typeMap[bboCustomerPricesId] ?? "N/A")
      : (ccPotentialRaynet ?? "N/A");

    console.log(`✅ Bewit Account Proxy - customerType: ${customerType}`);

    return new Response(
      JSON.stringify({
        success: true,
        customer_type: customerType,
        bbo_customer_prices_id: bboCustomerPricesId,
        cc_potential_raynet: ccPotentialRaynet,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Bewit Account Proxy - chyba:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Neznámá chyba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
