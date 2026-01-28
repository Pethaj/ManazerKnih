# Sumarizace historie - Dokumentace implementace

## Přehled

Automatická sumarizace chatové historie pomocí LLM modelu pro efektivnější posílání kontextu do N8N webhooků.

## Motivace

**Problém:** Webhook posílá celou historii konverzace do N8N, což:
- Zvyšuje latenci
- Zvyšuje náklady na LLM tokeny
- Přenáší redundantní informace

**Řešení:** Automatická sumarizace každého Q&A páru pomocí LLM, posílání pouze sumarizací místo plné historie.

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User zadá otázku                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Odeslání do N8N s historií (sumarizace nebo plná)       │
│    - Pokud summarize_history = true: pošle sumarizace      │
│    - Pokud summarize_history = false: pošle plnou historii │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Zobrazení odpovědi uživateli                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ⚡ Paralelně: Spuštění sumarizace na pozadí             │
│    - Model: mistralai/mistral-nemo                          │
│    - Prompt: "Sumarizuj otázku + odpověď"                   │
│    - Output: ~150 slov stručné sumarizace                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Uložení sumarizace do React state                        │
│    - summarizedHistory: string[]                            │
└─────────────────────────────────────────────────────────────┘
```

## Klíčové komponenty

### 1. Databáze
**Soubor:** `add_summarize_history_field.sql`

```sql
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS summarize_history BOOLEAN DEFAULT false;
```

- Nový sloupec `summarize_history` v tabulce `chatbot_settings`
- Výchozí hodnota: `false` (zpětná kompatibilita)
- Per-chatbot nastavení

### 2. TypeScript interfaces
**Soubor:** `src/services/chatbotSettingsService.ts`

Přidáno do:
- `ChatbotSettings` interface
- `CreateChatbotSettingsData` interface
- `UpdateChatbotSettingsData` interface
- `ChatbotFilters` interface

### 3. Sumarizační služba
**Soubor:** `src/services/chatSummarizationService.ts`

**Hlavní funkce:**
```typescript
async function summarizeConversationPair(
  question: string, 
  answer: string
): Promise<string | null>
```

**Vlastnosti:**
- Volá OpenRouter API přes edge function proxy
- Model: `mistralai/mistral-nemo`
- Temperature: 0.3 (konzistentní výstupy)
- Max tokens: 300 (~150 slov)
- Vrací `null` při chybě (graceful degradation)

**Helper funkce:**
```typescript
// Formátování pro N8N webhook
formatSummarizedHistoryForWebhook(summaries: string[])

// Čištění HTML z odpovědi
stripHtmlForSummarization(html: string)
```

### 4. Chat komponenta
**Soubor:** `src/components/SanaChat/SanaChat.tsx`

**Nový state:**
```typescript
const [summarizedHistory, setSummarizedHistory] = useState<string[]>([]);
```

**Nová helper funkce:**
```typescript
triggerSummarizationInBackground(
  userQuestion: string,
  botAnswer: string,
  setSummarizedHistory: Dispatch<SetStateAction<string[]>>
)
```

**Modifikace `sendMessageToAPI`:**
- Nový parameter: `summarizedHistory?: string[]`
- Logika: pokud existují sumarizace, pošle je místo plné historie
- Fallback: při chybě sumarizace pošle plnou historii

**Volání sumarizace:**
Po každém `setMessages(prev => [...prev, botMessage])`:
```typescript
if (chatbotSettings.summarize_history) {
  triggerSummarizationInBackground(
    userQuestion, 
    botAnswer, 
    setSummarizedHistory
  );
}
```

## Datový tok

### Příklad: 3 otázky s sumarizací

#### Otázka 1
```
User: "Co jsou to čínské wany?"
→ N8N webhook payload:
  {
    chatHistory: [],  // Prázdná historie
    chatInput: "Co jsou to čínské wany?"
  }
→ Odpověď: "Čínské wany jsou tradiční léčebná metoda..."
→ 🔄 Sumarizace na pozadí
→ summarizedHistory = ["Uživatel se ptal na definici..."]
```

#### Otázka 2
```
User: "Jaké jsou wany přímo na bolest?"
→ N8N webhook payload:
  {
    chatHistory: [
      {
        id: "summary-0",
        role: "summary",
        text: "Uživatel se ptal na definici..."
      }
    ],
    chatInput: "Jaké jsou wany přímo na bolest?"
  }
→ Odpověď: "Pro bolest jsou vhodné wany..."
→ 🔄 Sumarizace na pozadí
→ summarizedHistory = [
    "Uživatel se ptal na definici...",
    "Uživatel se ptal na wany pro bolest..."
  ]
```

#### Otázka 3
```
User: "Kolik stojí?"
→ N8N webhook payload:
  {
    chatHistory: [
      { id: "summary-0", role: "summary", text: "..." },
      { id: "summary-1", role: "summary", text: "..." }
    ],
    chatInput: "Kolik stojí?"
  }
```

## Přínosy

### Výhody
✅ **Nižší latence** - menší payload = rychlejší přenos  
✅ **Nižší náklady** - méně tokenů v N8N LLM volání  
✅ **Lepší kontext** - sumarizace obsahuje pouze klíčové informace  
✅ **Zpětná kompatibilita** - vypnutá sumarizace = původní chování  
✅ **Per-chatbot nastavení** - lze zapnout jen pro specifické chatboty  
✅ **Graceful degradation** - při chybě sumarizace použije plnou historii  

### Trade-offs
⚠️ **Extra LLM volání** - každá odpověď = 1 sumarizace (ale levnější model)  
⚠️ **Memory-only** - sumarizace se ztratí při refreshi (DB storage možné v budoucnu)  
⚠️ **Možná ztráta detailů** - sumarizace může vynechat okrajové informace  

## Nastavení

### Zapnutí pro chatbot
```sql
UPDATE chatbot_settings 
SET summarize_history = true 
WHERE chatbot_id = 'vany_chat';
```

### Vypnutí pro chatbot
```sql
UPDATE chatbot_settings 
SET summarize_history = false 
WHERE chatbot_id = 'vany_chat';
```

### Kontrola stavu
```sql
SELECT chatbot_id, chatbot_name, summarize_history 
FROM chatbot_settings;
```

## Monitoring

### Console logy (Development)

**Spuštění sumarizace:**
```
🔄 Spouštím sumarizaci na pozadí...
   Otázka: Co jsou to čínské wany? (100 chars)
   Odpověď: Čínské wany jsou... (450 chars)
```

**Úspěšná sumarizace:**
```
✅ Sumarizace dokončena: Uživatel se ptal... (120 chars)
💰 Tokeny: 245 (prompt: 180 + completion: 65)
```

**Chyba sumarizace:**
```
❌ Chyba při sumarizaci na pozadí: Error message
```

**Webhook payload:**
```
📊 Historie pro webhook: {
  summarizedHistoryLength: 2,
  fullHistoryLength: 4,
  usingSummarized: true
}
```

## Testování

Viz: `TEST_SUMARIZACE_INSTRUKCE.md`

Rychlý test:
1. Spustit SQL migraci
2. Zapnout `summarize_history` pro `vany_chat`
3. Otevřít Wany Chat
4. Položit 2-3 otázky
5. Sledovat console logy
6. Ověřit N8N webhook payload

## Budoucí vylepšení

### Krátkodobé
- [ ] Admin UI checkbox pro zapnutí/vypnutí sumarizace
- [ ] Zobrazení sumarizací v debug módu
- [ ] Metriky: sledování úspěšnosti sumarizace

### Dlouhodobé
- [ ] Perzistentní ukládání sumarizací do DB
- [ ] Různé strategie sumarizace (progressive, hierarchical)
- [ ] Konfigurovatelný model a parametry
- [ ] A/B testing kvality odpovědí

## Soubory změněné/vytvořené

### Nové soubory
- `add_summarize_history_field.sql` - SQL migrace
- `src/services/chatSummarizationService.ts` - Sumarizační služba
- `TEST_SUMARIZACE_INSTRUKCE.md` - Testovací instrukce
- `SUMARIZACE_HISTORIE_README.md` - Tento soubor

### Upravené soubory
- `src/services/chatbotSettingsService.ts` - Přidány interfaces
- `src/components/SanaChat/SanaChat.tsx` - Hlavní logika
- `src/pages/EmbedVanyChat.tsx` - Předání nastavení (pokud nutné)

## Technické detaily

### LLM model
- **ID:** `mistralai/mistral-nemo`
- **Poskytovatel:** OpenRouter
- **Context window:** 128k tokenů
- **Cena:** ~$0.13 / 1M input tokens, ~$0.13 / 1M output tokens
- **Rychlost:** Velmi rychlý (~150ms pro sumarizaci)

### Prompt template
```
Jsi specializovaný asistent pro sumarizaci chatových konverzací o zdraví a produktech BEWIT.

Tvým úkolem je vytvořit stručnou, ale informativní sumarizaci výměny otázka-odpověď.
Sumarizace bude použita jako kontext pro další dotazy uživatele.

PRAVIDLA:
- Piš ve třetí osobě (např. "Uživatel se ptal na...")
- Zahrň hlavní téma otázky
- Zahrň klíčové body z odpovědi
- Pokud jsou zmíněny produkty, symptomy nebo léčebné postupy, vždy je zahrň
- Maximálně 150 slov
- Buď konkrétní a věcný
- Nepoužívej ozdobné fráze nebo přebytečný text
- Zachovej faktickou přesnost

Otázka: {question}
Odpověď: {answer}

Sumarizace:
```

## Kontakt

Pro otázky nebo problémy otevřete issue nebo kontaktujte tým.

---

**Implementováno:** Leden 2026  
**Verze:** 1.0  
**Status:** ✅ Připraveno k testování
