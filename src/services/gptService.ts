/**
 * GPT-4o Mini Service
 * Pro generování odpovědí pouze s produktovým doporučením (bez databáze knih)
 */

// Supabase Edge Function URL pro OpenAI proxy
const OPENAI_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://modopafybeslbcqjxsve.supabase.co'}/functions/v1/openai-proxy`;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

export interface GPTChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GPTResponse {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Generuje odpověď pomocí GPT-4o mini pro produktové dotazy
 */
export async function generateProductResponse(
  userMessage: string,
  conversationHistory: GPTChatMessage[] = []
): Promise<GPTResponse> {
  console.log('🤖 Generuji odpověď pomocí GPT-4o mini pro produktové doporučení...');
  
  if (!userMessage || userMessage.trim().length === 0) {
    return {
      success: false,
      error: 'Prázdná zpráva'
    };
  }

  try {
    // Systémový prompt pro produktové poradenství
    const systemPrompt = `Jsi SANA AI - odborný asistent na zdraví a wellness. Specializuješ se na doporučování produktů a poradenství v oblasti:

- Aromaterapie a esenciální oleje
- Přírodní produkty pro zdraví
- Wellness a pohoda
- Alternativní medicína
- Masáže a relaxace

DŮLEŽITÉ POKYNY:
1. Odpovídej vždy v ČEŠTINĚ
2. Buď přátelský, odborný a užitečný
3. Zaměř se na praktické rady a doporučení
4. Pokud je dotaz zdravotní, doporuč konzultaci s odborníkem
5. Udržuj odpovědi stručné a na věc (max 3-4 věty)
6. Buď optimistický a povzbudivý

Uživatel se ptá na produkty nebo zdravotní témata. Poskytni užitečnou odpověď a naznač, že můžeš doporučit konkrétní produkty.`;

    const messages: GPTChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Posledních 6 zpráv pro kontext
      { role: 'user', content: userMessage.trim() }
    ];

    console.log('📦 Request na OpenAI GPT-4o mini:', {
      model: 'gpt-4o-mini',
      messages: messages.length,
      userMessage: userMessage.substring(0, 100) + '...'
    });

    // Volání přes Supabase Edge Function proxy
    const response = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        endpoint: '/chat/completions',
        method: 'POST',
        body: {
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        }
      }),
    });

    console.log('📡 GPT Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ OpenAI GPT API error:', { status: response.status, errorData });
      return {
        success: false,
        error: `OpenAI API chyba: ${response.status} - ${errorData?.error?.message || response.statusText}`
      };
    }

    const data = await response.json();
    console.log('📊 GPT response data:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Neplatná struktura odpovědi:', data);
      return {
        success: false,
        error: 'Neplatná odpověď z GPT API - chybí message data'
      };
    }

    const responseText = data.choices[0].message.content?.trim();
    if (!responseText) {
      return {
        success: false,
        error: 'GPT vrátil prázdnou odpověď'
      };
    }

    console.log(`✅ GPT odpověď vygenerována! Délka: ${responseText.length} znaků`);

    return {
      success: true,
      text: responseText
    };

  } catch (error) {
    console.error('❌ Chyba při volání GPT API:', error);
    return {
      success: false,
      error: `Chyba při volání GPT API: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
}

/**
 * Převede chat historii z aplikace na GPT formát
 */
export function convertChatHistoryToGPT(messages: { role: 'user' | 'bot'; text: string }[]): GPTChatMessage[] {
  return messages.map(msg => ({
    role: msg.role === 'bot' ? 'assistant' : 'user',
    content: msg.text
  }));
}
