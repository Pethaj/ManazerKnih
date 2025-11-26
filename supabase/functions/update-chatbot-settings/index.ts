// supabase/functions/update-chatbot-settings/index.ts
// Edge funkce pro aktualizaci nastavení chatbotů
// Používá service_role_key pro obejití RLS politik

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ENV proměnné (bez prefixu SUPABASE_)
const SUPABASE_URL = Deno.env.get("SB_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");

interface UpdateChatbotSettingsRequest {
  chatbot_id: string;
  updates: {
    chatbot_name?: string;
    description?: string;
    product_recommendations?: boolean;
    product_button_recommendations?: boolean;
    book_database?: boolean;
    allowed_categories?: string[];
    allowed_publication_types?: string[];
    allowed_labels?: string[];
    is_active?: boolean;
    use_feed_1?: boolean;
    use_feed_2?: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { chatbot_id, updates }: UpdateChatbotSettingsRequest = await req.json();

    if (!chatbot_id) {
      return new Response(
        JSON.stringify({ error: "Missing chatbot_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client with service_role_key (obchází RLS)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`🔍 Aktualizuji chatbota: ${chatbot_id}`, updates);

    // Zkontroluj, zda chatbot existuje
    const { data: existingRecord, error: checkError } = await supabase
      .from("chatbot_settings")
      .select("*")
      .eq("chatbot_id", chatbot_id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Chyba při kontrole:", checkError);
      return new Response(
        JSON.stringify({ error: checkError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!existingRecord) {
      return new Response(
        JSON.stringify({ error: `Chatbot s ID "${chatbot_id}" nebyl nalezen` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Proveď UPDATE
    const { data: updateResult, error: updateError } = await supabase
      .from("chatbot_settings")
      .update(updates)
      .eq("chatbot_id", chatbot_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Chyba při UPDATE:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ UPDATE úspěšný");

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateResult 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Kritická chyba:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

