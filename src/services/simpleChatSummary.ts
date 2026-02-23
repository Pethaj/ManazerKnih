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
    const userPrompt = `Vytvoř krátkou sumarizaci (max 200 slov) této konverzace. Zaměř se na hlavní body a důležité informace pro zákazníka. DŮLEŽITÉ: Sumarizaci musíš vždy dokončit celou, nepřerušuj věty.

OTÁZKA ZÁKAZNÍKA:
${shortQuestion}

ODPOVĚĎ:
${shortAnswer}

SUMARIZACE (max 200 slov):`;


    // Volání přes Supabase Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemPrompt: 'Jsi expert na sumarizaci konverzací. Vytváříš stručné a přesné sumarizace. Vždy dokončíš celou sumarizaci bez přerušení.',
        userPrompt: userPrompt,
        model: 'mistralai/mistral-7b-instruct',
        temperature: 0.3,
        maxTokens: 600
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return null;
    }

    const data = await response.json();
    
    if (!data.success || !data.response) {
      return null;
    }

    const summary = data.response.trim();

    // VÝPIS DO CONSOLE

    return summary;

  } catch (error) {
    return null;
  }
}
