// ============================================
// PŘÍKLAD: Integrace message limits do chat API
// ============================================

import { checkMessageLimit, incrementMessageCount } from '@/lib/message-limits'

// Příklad 1: API endpoint pro odeslání zprávy
export async function POST(req: Request) {
  try {
    const { chatbot_id, message, user_id } = await req.json()

    // ✅ 1. PŘED ODESLÁNÍM - Zkontroluj limity
    const limitCheck = await checkMessageLimit(chatbot_id)

    if (!limitCheck.allowed) {
      // ❌ LIMIT PŘEKROČEN - Vrať chybovou hlášku
      return Response.json({
        success: false,
        error: limitCheck.reason,
        message: limitCheck.message,
        reset_at: limitCheck.reset_at,
        details: {
          global: limitCheck.global,
          chatbot: limitCheck.chatbot
        }
      }, { status: 429 }) // 429 = Too Many Requests
    }

    // ✅ 2. ODESLÁNÍ ZPRÁVY - Zavolej AI model
    const aiResponse = await callAIModel(chatbot_id, message)

    // ✅ 3. ULOŽENÍ DO DATABÁZE
    await saveMessageToDatabase(chatbot_id, user_id, message, aiResponse)

    // ✅ 4. PO ÚSPĚCHU - Inkrementuj čítač
    // Poznámka: Počítáme 1 konverzační dvojici (user + AI) = 1 zpráva
    await incrementMessageCount(chatbot_id)

    // ✅ 5. VRAŤ ODPOVĚĎ
    return Response.json({
      success: true,
      message: aiResponse,
      limits: {
        global: limitCheck.global,
        chatbot: limitCheck.chatbot
      }
    })

  } catch (error) {
    console.error('❌ Chat API error:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// ============================================
// Příklad 2: React komponenta - Chat Widget
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { checkMessageLimit, formatResetTime } from '@/lib/message-limits'

export function ChatWidget({ chatbotId }: { chatbotId: string }) {
  const [isLimitExceeded, setIsLimitExceeded] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const [resetAt, setResetAt] = useState<string | null>(null)

  // Zkontroluj limity při načtení
  useEffect(() => {
    checkLimits()
  }, [chatbotId])

  async function checkLimits() {
    const result = await checkMessageLimit(chatbotId)
    
    if (!result.allowed) {
      setIsLimitExceeded(true)
      setLimitMessage(result.message || 'Denní limit byl dosažen')
      setResetAt(result.reset_at || null)
    } else {
      setIsLimitExceeded(false)
    }
  }

  async function handleSendMessage(message: string) {
    // Zkontroluj limity před odesláním
    const limitCheck = await checkMessageLimit(chatbotId)
    
    if (!limitCheck.allowed) {
      setIsLimitExceeded(true)
      setLimitMessage(limitCheck.message || 'Denní limit byl dosažen')
      setResetAt(limitCheck.reset_at || null)
      return
    }

    // Odešli zprávu...
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        chatbot_id: chatbotId,
        message: message
      })
    })

    const result = await response.json()

    if (!result.success && result.error === 'chatbot_limit_exceeded') {
      // Zobraz limit warning
      setIsLimitExceeded(true)
      setLimitMessage(result.message)
      setResetAt(result.reset_at)
    }
  }

  if (isLimitExceeded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="mb-4 text-5xl">⏰</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Denní limit zpráv dosažen
          </h3>
          <p className="text-gray-600 mb-4">
            {limitMessage}
          </p>
          {resetAt && (
            <p className="text-sm text-gray-500">
              Reset {formatResetTime(resetAt)}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="chat-widget">
      {/* Normální chat UI */}
    </div>
  )
}

// ============================================
// Příklad 3: Admin panel - Nastavení limitů
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { setChatbotLimit, getChatbotLimit } from '@/lib/message-limits'
import { createClient } from '@/lib/supabase/client'

export function ChatbotLimitSettings({ chatbotId }: { chatbotId: string }) {
  const [limit, setLimit] = useState<number | null>(null)
  const [currentCount, setCurrentCount] = useState(0)
  const [resetAt, setResetAt] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadLimitData()
  }, [chatbotId])

  async function loadLimitData() {
    const supabase = createClient()
    const data = await getChatbotLimit(supabase, chatbotId)
    
    if (data) {
      setLimit(data.daily_limit)
      setCurrentCount(data.current_count)
      setResetAt(data.reset_at)
    }
  }

  async function handleSaveLimit() {
    setSaving(true)
    const supabase = createClient()
    const success = await setChatbotLimit(supabase, chatbotId, limit)
    
    if (success) {
      alert('✅ Limit uložen')
      await loadLimitData()
    } else {
      alert('❌ Chyba při ukládání')
    }
    
    setSaving(false)
  }

  const percentage = limit ? Math.round((currentCount / limit) * 100) : 0

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Denní limit zpráv</h3>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Maximální počet zpráv za den
        </label>
        <input
          type="number"
          value={limit ?? ''}
          onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : null)}
          placeholder="Například 5000 (prázdné = bez limitu)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500">
          Ponechte prázdné pro neomezený počet zpráv
        </p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Aktuální využití:</span>
          <span className="text-lg font-bold">
            {currentCount} / {limit ?? '∞'}
          </span>
        </div>
        
        {limit && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentage >= 95 ? 'bg-red-500' :
                  percentage >= 80 ? 'bg-orange-500' :
                  percentage >= 60 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {percentage}% využito
            </p>
          </>
        )}
        
        {resetAt && (
          <p className="text-xs text-gray-500 mt-2">
            Reset: {new Date(resetAt).toLocaleString('cs-CZ')}
          </p>
        )}
      </div>

      <button
        onClick={handleSaveLimit}
        disabled={saving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Ukládám...' : 'Uložit limit'}
      </button>
    </div>
  )
}

// ============================================
// Pomocné funkce (mock)
// ============================================

async function callAIModel(chatbotId: string, message: string): Promise<string> {
  // Zde by byla logika volání AI modelu
  return "AI odpověď..."
}

async function saveMessageToDatabase(
  chatbotId: string, 
  userId: string, 
  userMessage: string, 
  aiResponse: string
): Promise<void> {
  // Uložení do chat_messages tabulky
}
