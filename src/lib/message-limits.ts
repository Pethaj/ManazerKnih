// Message Limits - Helper funkce a typy
// Správa denních limitů zpráv pro chatboty

import type { SupabaseClient } from '@supabase/supabase-js'

export interface MessageLimit {
  id: string
  chatbot_id: string | null // NULL = globální limit
  daily_limit: number | null // NULL = bez limitu
  current_count: number
  reset_at: string
  created_at: string
  updated_at: string
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: 'global_limit_exceeded' | 'chatbot_limit_exceeded'
  message?: string
  reset_at?: string
  current?: number
  limit?: number | null
  global?: {
    current: number
    limit: number | null
    reset_at?: string
  }
  chatbot?: {
    current: number
    limit: number | null
    reset_at?: string
  }
}

/**
 * Zkontroluje jestli je možné odeslat zprávu (nepřekročí limity)
 * @param chatbotId ID chatbota
 * @returns Výsledek kontroly s detaily
 */
export async function checkMessageLimit(chatbotId: string): Promise<LimitCheckResult> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-message-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        chatbot_id: chatbotId,
        action: 'check'
      })
    })

    const result = await response.json()
    return result

  } catch (error) {
    console.error('❌ Error checking message limit:', error)
    // V případě chyby povolit zprávu (fail-open strategie)
    return {
      allowed: true,
      message: 'Limit check failed, allowing message'
    }
  }
}

/**
 * Inkrementuje čítač zpráv po úspěšném odeslání
 * @param chatbotId ID chatbota
 */
export async function incrementMessageCount(chatbotId: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-message-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        chatbot_id: chatbotId,
        action: 'increment'
      })
    })

    console.log('📈 Message count incremented')

  } catch (error) {
    console.error('❌ Error incrementing message count:', error)
  }
}

/**
 * Získá aktuální stav limitů pro chatbot
 * @param chatbotId ID chatbota
 * @returns Limit data nebo null
 */
export async function getChatbotLimit(
  supabase: SupabaseClient,
  chatbotId: string
): Promise<MessageLimit | null> {
  const { data, error } = await supabase
    .from('message_limits')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .single()

  if (error) {
    console.error('❌ Error fetching chatbot limit:', error)
    return null
  }

  return data
}

/**
 * Získá globální limit
 */
export async function getGlobalLimit(
  supabase: SupabaseClient
): Promise<MessageLimit | null> {
  const { data, error } = await supabase
    .from('message_limits')
    .select('*')
    .is('chatbot_id', null)
    .single()

  if (error) {
    console.error('❌ Error fetching global limit:', error)
    return null
  }

  return data
}

/**
 * Nastaví denní limit pro chatbot
 * @param supabase Supabase client
 * @param chatbotId ID chatbota
 * @param limit Denní limit (null = bez limitu)
 */
export async function setChatbotLimit(
  supabase: SupabaseClient,
  chatbotId: string,
  limit: number | null
): Promise<boolean> {
  try {
    // Zkus update
    const { error: updateError } = await supabase
      .from('message_limits')
      .update({ 
        daily_limit: limit,
        updated_at: new Date().toISOString()
      })
      .eq('chatbot_id', chatbotId)

    if (updateError) {
      // Pokud neexistuje, vytvoř
      const nextMidnight = getNextMidnightCET()
      const { error: insertError } = await supabase
        .from('message_limits')
        .insert({
          chatbot_id: chatbotId,
          daily_limit: limit,
          current_count: 0,
          reset_at: nextMidnight.toISOString()
        })

      if (insertError) {
        console.error('❌ Error inserting limit:', insertError)
        return false
      }
    }

    console.log(`✅ Limit set for chatbot ${chatbotId}: ${limit ?? 'unlimited'}`)
    return true

  } catch (error) {
    console.error('❌ Error setting chatbot limit:', error)
    return false
  }
}

/**
 * Nastaví globální denní limit
 * @param supabase Supabase client
 * @param limit Denní limit (null = bez limitu)
 */
export async function setGlobalLimit(
  supabase: SupabaseClient,
  limit: number | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('message_limits')
      .update({ 
        daily_limit: limit,
        updated_at: new Date().toISOString()
      })
      .is('chatbot_id', null)

    if (error) {
      console.error('❌ Error setting global limit:', error)
      return false
    }

    console.log(`✅ Global limit set: ${limit ?? 'unlimited'}`)
    return true

  } catch (error) {
    console.error('❌ Error setting global limit:', error)
    return false
  }
}

/**
 * Formátuje reset čas do čitelné podoby
 */
export function formatResetTime(resetAt: string): string {
  const reset = new Date(resetAt)
  const now = new Date()
  const diff = reset.getTime() - now.getTime()
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `za ${hours}h ${minutes}m`
  } else {
    return `za ${minutes} minut`
  }
}

/**
 * Vypočítá další půlnoc v CET timezone
 */
function getNextMidnightCET(): Date {
  const now = new Date()
  const pragueTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Prague' }))
  
  // Nastaví na další den, 00:00:00
  pragueTime.setHours(24, 0, 0, 0)
  
  return pragueTime
}

/**
 * Vypočítá procenta využití limitu
 */
export function calculateLimitPercentage(current: number, limit: number | null): number {
  if (limit === null) return 0 // Bez limitu
  if (limit === 0) return 100
  return Math.round((current / limit) * 100)
}

/**
 * Určí CSS třídu podle využití limitu
 */
export function getLimitStatusColor(percentage: number): string {
  if (percentage >= 95) return 'text-red-600'
  if (percentage >= 80) return 'text-orange-500'
  if (percentage >= 60) return 'text-yellow-500'
  return 'text-green-600'
}
