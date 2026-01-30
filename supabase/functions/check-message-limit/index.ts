// Edge Function: check-message-limit
// Kontrola a správa denních limitů zpráv pro chatboty

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MessageLimit {
  id: string
  chatbot_id: string | null
  daily_limit: number | null
  current_count: number
  reset_at: string
}

interface CheckLimitRequest {
  chatbot_id: string
  action: 'check' | 'increment' // check = ověř limit, increment = zvyš čítač
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { chatbot_id, action } = await req.json() as CheckLimitRequest

    if (!chatbot_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing chatbot_id or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Získej aktuální čas v CET/Prague
    const nowPrague = new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' })
    const currentTime = new Date(nowPrague)

    console.log(`🕐 Current time (Prague): ${currentTime.toISOString()}`)

    // --- 1. RESET ČÍTAČŮ (pokud je potřeba) ---
    await resetCountersIfNeeded(supabaseClient, currentTime)

    // --- 2. ZKONTROLUJ GLOBÁLNÍ LIMIT ---
    const { data: globalLimit } = await supabaseClient
      .from('message_limits')
      .select('*')
      .is('chatbot_id', null)
      .single()

    if (globalLimit) {
      // Zkontroluj jestli je potřeba resetovat
      const resetTime = new Date(globalLimit.reset_at)
      if (currentTime >= resetTime) {
        // Reset globálního čítače
        const nextMidnight = getNextMidnight(currentTime)
        await supabaseClient
          .from('message_limits')
          .update({ 
            current_count: 0, 
            reset_at: nextMidnight.toISOString(),
            updated_at: new Date().toISOString()
          })
          .is('chatbot_id', null)
        
        console.log('🔄 Global counter reset')
      } else if (globalLimit.daily_limit !== null && globalLimit.current_count >= globalLimit.daily_limit) {
        // Globální limit vyčerpán
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'global_limit_exceeded',
            message: 'Omlouváme se, ale globální denní limit zpráv byl dosažen. Chat bude opět dostupný od půlnoci.',
            reset_at: globalLimit.reset_at,
            current: globalLimit.current_count,
            limit: globalLimit.daily_limit
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // --- 3. ZKONTROLUJ INDIVIDUÁLNÍ LIMIT CHATBOTA ---
    const { data: chatbotLimit } = await supabaseClient
      .from('message_limits')
      .select('*')
      .eq('chatbot_id', chatbot_id)
      .single()

    if (chatbotLimit) {
      // Zkontroluj jestli je potřeba resetovat
      const resetTime = new Date(chatbotLimit.reset_at)
      if (currentTime >= resetTime) {
        // Reset čítače chatbota
        const nextMidnight = getNextMidnight(currentTime)
        await supabaseClient
          .from('message_limits')
          .update({ 
            current_count: 0, 
            reset_at: nextMidnight.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('chatbot_id', chatbot_id)
        
        console.log(`🔄 Chatbot ${chatbot_id} counter reset`)
      } else if (chatbotLimit.daily_limit !== null && chatbotLimit.current_count >= chatbotLimit.daily_limit) {
        // Limit chatbota vyčerpán
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'chatbot_limit_exceeded',
            message: 'Omlouváme se, ale denní limit zpráv pro tento chat byl dosažen. Chat bude opět dostupný od půlnoci.',
            reset_at: chatbotLimit.reset_at,
            current: chatbotLimit.current_count,
            limit: chatbotLimit.daily_limit
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Chatbot nemá nastavený limit - vytvoř záznam
      const nextMidnight = getNextMidnight(currentTime)
      await supabaseClient
        .from('message_limits')
        .insert({
          chatbot_id,
          daily_limit: null, // NULL = bez limitu
          current_count: 0,
          reset_at: nextMidnight.toISOString()
        })
      
      console.log(`✅ Created limit entry for chatbot ${chatbot_id}`)
    }

    // --- 4. POKUD JE ACTION = INCREMENT ---
    if (action === 'increment') {
      // Inkrementuj globální čítač
      if (globalLimit) {
        await supabaseClient.rpc('increment_message_count', { 
          limit_id: globalLimit.id 
        })
      }

      // Inkrementuj čítač chatbota
      if (chatbotLimit) {
        await supabaseClient.rpc('increment_message_count', { 
          limit_id: chatbotLimit.id 
        })
      }

      console.log(`📈 Counters incremented for chatbot ${chatbot_id}`)
    }

    // --- 5. VRAT USPECH ---
    return new Response(
      JSON.stringify({
        allowed: true,
        message: 'Zpráva povolena',
        global: {
          current: globalLimit?.current_count || 0,
          limit: globalLimit?.daily_limit || null,
          reset_at: globalLimit?.reset_at
        },
        chatbot: {
          current: chatbotLimit?.current_count || 0,
          limit: chatbotLimit?.daily_limit || null,
          reset_at: chatbotLimit?.reset_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper: Reset čítačů pokud je čas
async function resetCountersIfNeeded(supabaseClient: any, currentTime: Date) {
  const { data: limitsToReset } = await supabaseClient
    .from('message_limits')
    .select('*')
    .lt('reset_at', currentTime.toISOString())

  if (limitsToReset && limitsToReset.length > 0) {
    console.log(`🔄 Resetting ${limitsToReset.length} counters`)
    
    for (const limit of limitsToReset) {
      const nextMidnight = getNextMidnight(currentTime)
      await supabaseClient
        .from('message_limits')
        .update({
          current_count: 0,
          reset_at: nextMidnight.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', limit.id)
    }
  }
}

// Helper: Další půlnoc v Prague timezone
function getNextMidnight(currentTime: Date): Date {
  const midnight = new Date(currentTime)
  midnight.setHours(24, 0, 0, 0) // Další den, 00:00:00
  
  // Převedeme na Prague timezone string a zpět
  const pragueString = midnight.toLocaleString('en-US', { timeZone: 'Europe/Prague' })
  return new Date(pragueString)
}
