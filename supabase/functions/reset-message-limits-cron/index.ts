// Edge Function: reset-message-limits-cron
// Cron job pro denní reset čítačů zpráv
// Běží každý den v 00:05 CET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  try {
    // Ověření authorization (ochrana před neoprávněným voláním)
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🕐 Running daily message limits reset...')

    // Zavolej database funkci pro reset
    const { data, error } = await supabaseClient.rpc('reset_all_message_limits')

    if (error) {
      console.error('❌ Error resetting limits:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Získej aktuální stav po resetu
    const { data: limits, error: fetchError } = await supabaseClient
      .from('message_limits')
      .select('*')

    if (fetchError) {
      console.error('❌ Error fetching limits:', fetchError)
    }

    console.log('✅ Message limits reset completed')
    console.log(`📊 Total limits: ${limits?.length || 0}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message limits reset completed',
        timestamp: new Date().toISOString(),
        total_limits: limits?.length || 0,
        limits: limits?.map(l => ({
          chatbot_id: l.chatbot_id || 'GLOBAL',
          current_count: l.current_count,
          daily_limit: l.daily_limit,
          reset_at: l.reset_at
        }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
