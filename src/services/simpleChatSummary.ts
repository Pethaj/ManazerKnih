/**
 * JEDNODUCHÁ SUMARIZACE KONVERZACE
 * =================================
 * Po každé odpovědi bota → vytvoř sumarizaci a vypiš do console
 * Používá Mistral 7B přes Supabase Edge Function (OpenRouter proxy)
 */

const EDGE_FUNCTION_URL = 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/openrouter-proxy';

/**
 * Vytvoř sumarizaci konverzace
 * @param userQuestion - Otázka uživatele
 * @param botAnswer - Odpověď bota
 * @returns Sumarizace nebo null při chybě
 */
export async function createSimpleSummary(
  userQuestion: string,
  botAnswer: string
): Promise<string | null> {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 SUMARIZACE - START');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❓ Otázka:', userQuestion.substring(0, 150));
    console.log('💬 Odpověď:', botAnswer.substring(0, 150) + '...');
    console.log('═══════════════════════════════════════════════════════════');

    // Vyčistíme HTML tagy z odpovědi
    const cleanAnswer = botAnswer
      .replace(/<[^>]+>/g, ' ')
      .replace(/<<<PRODUCT:[^>]+>>>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Zkrátíme texty pokud jsou moc dlouhé
    const shortQuestion = userQuestion.substring(0, 1000);
    const shortAnswer = cleanAnswer.substring(0, 5000);

    // Prompt pro sumarizaci
    const userPrompt = `Vytvoř krátkou sumarizaci (max 150 slov) této konverzace. Zaměř se na hlavní body a důležité informace pro zákazníka.

OTÁZKA ZÁKAZNÍKA:
${shortQuestion}

ODPOVĚĎ:
${shortAnswer}

SUMARIZACE (max 150 slov):`;

    console.log('🚀 Volám Supabase Edge Function...');

    // Volání přes Supabase Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemPrompt: 'Jsi expert na sumarizaci konverzací. Vytváříš stručné a přesné sumarizace.',
        userPrompt: userPrompt,
        model: 'mistralai/mistral-7b-instruct',
        temperature: 0.3,
        maxTokens: 300
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Edge Function chyba:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.success || !data.response) {
      console.error('❌ Edge Function nevrátila sumarizaci:', data.error);
      return null;
    }

    const summary = data.response.trim();

    // VÝPIS DO CONSOLE
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUMARIZACE HOTOVA:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(summary);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Tokeny:', data.usage?.total_tokens || 'N/A');
    console.log('═══════════════════════════════════════════════════════════');

    return summary;

  } catch (error) {
    console.error('❌ CHYBA při sumarizaci:', error);
    return null;
  }
}
