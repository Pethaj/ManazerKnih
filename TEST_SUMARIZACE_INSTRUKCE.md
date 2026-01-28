# Testovací instrukce - Sumarizace historie

## Přehled
Tento dokument obsahuje instrukce pro testování nové funkce automatické sumarizace historie chatových konverzací.

## Prerekvizity

### 1. Spustit SQL migraci
Před testováním je nutné přidat nový sloupec do databáze:

```sql
-- Spustit v Supabase SQL editoru
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS summarize_history BOOLEAN DEFAULT false;

-- Vytvořit index
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_summarize_history 
ON chatbot_settings(summarize_history) 
WHERE summarize_history = true;
```

### 2. Zapnout sumarizaci pro vany_chat
```sql
UPDATE chatbot_settings 
SET summarize_history = true 
WHERE chatbot_id = 'vany_chat';
```

### 3. Ověřit nastavení
```sql
SELECT chatbot_id, chatbot_name, summarize_history 
FROM chatbot_settings 
WHERE chatbot_id = 'vany_chat';
```

Mělo by vrátit:
```
chatbot_id: vany_chat
chatbot_name: Wany Chat
summarize_history: true
```

## Testovací scénáře

### Scénář 1: Základní sumarizace

1. Otevřít Wany Chat (např. `/embed.html`)
2. **První otázka:** "Co jsou to čínské wany?"
3. Čekat na odpověď
4. **Sledovat console:**
   - `🔄 Spouštím sumarizaci na pozadí...`
   - `✅ Sumarizace dokončena: ...`
   
5. **Druhá otázka:** "Jaké jsou wany přímo na bolest?"
6. **Sledovat console:**
   - `📊 Historie pro webhook: { summarizedHistoryLength: 1, fullHistoryLength: 2, usingSummarized: true }`
   - N8N webhook by měl dostat `chatHistory` s 1 sumarizací místo 2 zpráv

### Scénář 2: Vícenásobné sumarizace

1. Otázka 1: "Co jsou to wany?"
2. Čekat na sumarizaci (console)
3. Otázka 2: "Jaké jsou přínosY wanů?"
4. Čekat na sumarizaci (console)
5. Otázka 3: "Kolik stojí?"
6. **Sledovat console:**
   - `📊 Historie pro webhook: { summarizedHistoryLength: 2, ... }`
   - N8N dostane 2 sumarizace

### Scénář 3: Vypnutá sumarizace (zpětná kompatibilita)

1. **Vypnout sumarizaci:**
```sql
UPDATE chatbot_settings 
SET summarize_history = false 
WHERE chatbot_id = 'vany_chat';
```

2. Otevřít Wany Chat
3. Položit otázky
4. **Ověřit console:**
   - Žádné zprávy o sumarizaci
   - `📊 Historie pro webhook: { ..., usingSummarized: false }`
   - N8N dostává plnou historii

### Scénář 4: Nový chat (vyčištění sumarizací)

1. S aktivní sumarizací položit 2-3 otázky
2. Kliknout "Nový chat"
3. **Ověřit:**
   - `summarizedHistory` state je prázdný
   - První otázka v novém chatu nemá historii

## Co sledovat

### V Developer Console (F12)

#### Očekávané logy při sumarizaci:
```
🔄 Spouštím sumarizaci na pozadí...
   Otázka: Co jsou to čínské wany?
   Odpověď: Čínské wany jsou...
📝 Zahajuji sumarizaci konverzace...
✅ Sumarizace dokončena: Uživatel se ptal na definici čínských wanů...
💰 Tokeny: 245 (prompt: 180 + completion: 65)
```

#### Očekávané logy při odesílání do N8N:
```
📊 Historie pro webhook:
   summarizedHistoryLength: 2
   fullHistoryLength: 4
   usingSummarized: true
```

### V N8N workflow

Webhook by měl dostat payload:
```json
{
  "sessionId": "...",
  "action": "sendMessage",
  "chatInput": "Aktuální otázka",
  "chatHistory": [
    {
      "id": "summary-0",
      "role": "summary",
      "text": "Sumarizace první konverzace..."
    },
    {
      "id": "summary-1",
      "role": "summary",
      "text": "Sumarizace druhé konverzace..."
    }
  ]
}
```

## Edge Cases

### 1. Sumarizace selže
- Aplikace pokračuje normálně
- Console: `⚠️ Sumarizace selhala, pokračuji bez ní`
- Při další otázce se pošle plná historie (fallback)

### 2. Velmi dlouhá konverzace
- Každá sumarizace ~150 slov
- 10 otázek = 10 sumarizací (cca 1500 slov)
- Stále výrazně menší než plná historie

### 3. Refresh stránky
- Sumarizace se ztratí (memory-only)
- **Očekávané chování** (není bug)
- Pro perzistenci by bylo potřeba DB storage (v plánu možná později)

## Úspěšný test

Implementace je úspěšná, pokud:

✅ SQL migrace proběhla bez chyb  
✅ Sumarizace se spouští na pozadí po každé odpovědi  
✅ Console obsahuje logy o sumarizaci  
✅ N8N webhook dostává sumarizace místo plné historie  
✅ Při vypnuté sumarizaci vše funguje jako dříve  
✅ Nový chat vyčistí sumarizace  
✅ Aplikace nezamrzá během sumarizace  
✅ Žádné TypeScript/JavaScript chyby v console  

## Troubleshooting

### Problém: Sumarizace se nespouští
**Řešení:**
1. Zkontrolovat `chatbot_settings.summarize_history = true`
2. Zkontrolovat console pro chyby
3. Ověřit že OpenRouter proxy funguje

### Problém: N8N dostává plnou historii
**Řešení:**
1. Zkontrolovat console log `usingSummarized: true`
2. Ověřit že sumarizace byly vytvořeny (`summarizedHistoryLength > 0`)
3. Zkontrolovat že `chatbotSettings.summarize_history` je true

### Problém: TypeScript chyby
**Řešení:**
1. Ověřit že všechny interfaces byly aktualizovány
2. Zkontrolovat import `chatSummarizationService`
3. Restartovat TypeScript server (Cmd+Shift+P → "Restart TS Server")

## Poznámky pro development

- Model: `mistralai/mistral-nemo` (rychlý, levný, vhodný pro sumarizaci)
- Temperature: 0.3 (nízká = konzistentní výstupy)
- Max tokens: 300 (~150 slov)
- Sumarizace běží asynchronně (nepřerušuje UI)
- Fallback: pokud sumarizace selže, pošle se plná historie

## Další kroky (budoucí vylepšení)

- [ ] Přidat UI checkbox pro zapnutí/vypnutí sumarizace v admin rozhraní
- [ ] Perzistentní ukládání sumarizací do DB (volitelné)
- [ ] Možnost zobrazit sumarizace v UI (pro debugging)
- [ ] Metriky: sledování ceny sumarizace vs. úspory na N8N volání
- [ ] A/B testing: porovnání kvality odpovědí s/bez sumarizace
