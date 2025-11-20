// supabase/functions/qdrant-proxy/index.ts
// Edge Function pro bezpečné operace s Qdrant vektorovou databází
// Podporuje: delete, search, upsert operace

const QDRANT_API_KEY = Deno.env.get("QDRANT_API_KEY_cloud");
const QDRANT_URL = Deno.env.get("QDRANT_URL") || 
  "https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io:6333";
const QDRANT_COLLECTION = "documents";

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ověření API klíče
    if (!QDRANT_API_KEY) {
      throw new Error("QDRANT_API_KEY_cloud není nastaven v Supabase Secrets");
    }

    // Parsování requestu
    const body = await req.json();
    const { operation, bookId, filter, vector, limit, points } = body;

    if (!operation) {
      throw new Error(
        "Chybí povinné pole: operation (delete|search|upsert)",
      );
    }

    console.log(`🔍 Qdrant ${operation} operation`);

    let qdrantResponse;
    let qdrantUrl;

    // DELETE OPERATION - Smazání dokumentů podle bookId
    if (operation === "delete") {
      if (!bookId) {
        throw new Error("Pro operaci 'delete' je povinné pole 'bookId'");
      }

      console.log(`🗑️ Mažu dokumenty pro bookId: ${bookId}`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: "file_id",
                match: {
                  value: bookId,
                },
              },
            ],
          },
        }),
      });
    } 
    // SEARCH OPERATION - Vyhledávání podobných vektorů
    else if (operation === "search") {
      if (!vector) {
        throw new Error("Pro operaci 'search' je povinné pole 'vector'");
      }

      console.log(`🔍 Vyhledávám v Qdrant kolekci (limit: ${limit || 10})`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          vector: vector,
          limit: limit || 10,
          with_payload: true,
          with_vector: false,
          filter: filter || undefined,
        }),
      });
    } 
    // UPSERT OPERATION - Vložení/aktualizace bodů
    else if (operation === "upsert") {
      if (!points || !Array.isArray(points) || points.length === 0) {
        throw new Error(
          "Pro operaci 'upsert' je povinné pole 'points' (neprázdné pole)",
        );
      }

      console.log(`📝 Vkládám ${points.length} bodů do Qdrant`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          points: points,
        }),
      });
    } 
    // COUNT OPERATION - Spočítání bodů v kolekci
    else if (operation === "count") {
      console.log(`🔢 Počítám body v Qdrant kolekci`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/count`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          filter: filter || undefined,
          exact: true,
        }),
      });
    } 
    // SCROLL OPERATION - Iterace přes body v kolekci
    else if (operation === "scroll") {
      console.log(`📜 Scrolluji body v Qdrant kolekci (limit: ${limit || 10})`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          filter: filter || undefined,
          limit: limit || 10,
          with_payload: true,
          with_vector: false,
        }),
      });
    } else {
      throw new Error(
        `Neplatná operace: ${operation}. Podporované: delete, search, upsert, count, scroll`,
      );
    }

    // Kontrola odpovědi z Qdrant
    if (!qdrantResponse.ok) {
      const errorData = await qdrantResponse.json().catch(() => null);
      console.error("❌ Qdrant API error:", {
        status: qdrantResponse.status,
        errorData,
      });

      throw new Error(
        `Qdrant API chyba: ${qdrantResponse.status} - ${
          errorData?.status?.error || qdrantResponse.statusText
        }`,
      );
    }

    const data = await qdrantResponse.json();
    console.log(`✅ Qdrant ${operation} úspěšný`);

    // Vrátíme úspěšnou odpověď
    return new Response(
      JSON.stringify({
        success: true,
        operation: operation,
        result: data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
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
      },
    );
  }
});

