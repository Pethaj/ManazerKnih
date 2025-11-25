# Product Chat - Quick Start Guide 🚀

## Problém vyřešen ✅

**Chyba**: `ProductChat is not defined` v `index.ts`

**Oprava**: 
- Změna z named export na default export
- Build nyní funguje správně

## Jak spustit aplikaci

### 1. Development server
```bash
npm run dev
```
Aplikace poběží na: http://localhost:5173

### 2. Production build
```bash
npm run build
```

## Jak otevřít Product Chat

### Krok za krokem:

1. **Spusť aplikaci**
   ```bash
   npm run dev
   ```

2. **Přihlas se do aplikace**
   - Otevři http://localhost:5173
   - Přihlaš se svými credentials

3. **Otevři Správu chatbotů**
   - V horní liště klikni na tlačítko **"🤖 Správa chatbotů"**

4. **Najdi Product Chat**
   - Ve seznamu chatbotů najdi **"Product Chat"**
   - Má zelené tlačítko **"💬 Otevřít Product Chat"**

5. **Spusť chat**
   - Klikni na zelené tlačítko
   - Otevře se fullscreen Product Chat

6. **Zadej dotaz**
   - Například: "wany na bolest nohy"
   - Nebo: "produkty pro lepší spánek"
   - Nebo: "co doporučujete na trávení"

7. **Získej výsledky**
   - GPT odpověď
   - Carousel s 6 produkty
   - Každý produkt má personalizované doporučení

## Test N8N Webhook

### Před použitím v aplikaci:

1. **Otevři test HTML**
   ```
   Otevři soubor: test-product-chat.html v browseru
   ```

2. **Test Connection**
   - Klikni "Test Connection"
   - Ověří že N8N webhook odpovídá

3. **Test Query**
   - Zadej dotaz (např. "wany na bolest nohy")
   - Klikni "Test Query"
   - Zkontroluj že vrací produkty s `recommendation`

4. **Validate Format**
   - Klikni "Validate Format"
   - Ověří správný formát response

### Očekávaný N8N Response:

```json
{
  "text": "Našel jsem pro vás 6 wan vhodných na bolest nohy:",
  "products": [
    {
      "product_code": "2324",
      "recommendation": "Tento wan pomáhá při akutní bolesti nohou díky protizánětlivým bylinám."
    },
    {
      "product_code": "2347",
      "recommendation": "Ideální pro chronickou bolest, podporuje prokrvení."
    }
    // ... celkem 6 produktů
  ]
}
```

## Řešení problémů

### Aplikace se nezobrazuje

**Zkontroluj**:
```bash
# 1. Dev server běží?
npm run dev

# 2. Žádné build errors?
npm run build

# 3. Port 5173 je volný?
lsof -i :5173
```

### Product Chat tlačítko není vidět

**Zkontroluj v Supabase**:
```sql
-- Product Chat musí existovat v databázi
SELECT * FROM chatbot_settings 
WHERE chatbot_id = 'product_chat';

-- Pokud neexistuje, vytvoř ho:
INSERT INTO chatbot_settings (
  chatbot_id, 
  chatbot_name, 
  description,
  product_recommendations,
  book_database,
  is_active
) VALUES (
  'product_chat',
  'Product Chat',
  'Produktový chat s personalizovanými doporučeními',
  true,
  false,
  true
);
```

### N8N webhook nefunguje

**Debug checklist**:
1. ✅ N8N workflow je aktivní?
2. ✅ Webhook URL je správná?
3. ✅ CORS je povolený v N8N?
4. ✅ N8N vrací správný formát (text + products array)?
5. ✅ Každý produkt má `recommendation` field?

**Test v browser console**:
```javascript
fetch('https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatInput: 'test',
    session_id: 'test-123',
    timestamp: new Date().toISOString()
  })
})
.then(r => r.json())
.then(data => console.log('N8N response:', data))
.catch(err => console.error('N8N error:', err));
```

### Produkty nemají obrázky/ceny

**Zkontroluj product_feed_2**:
```sql
-- Počet produktů
SELECT COUNT(*) FROM product_feed_2;

-- Kontrola metadat
SELECT 
  product_code,
  product_name,
  thumbnail,
  price,
  url,
  availability
FROM product_feed_2 
WHERE product_code IN ('2324', '2347')
LIMIT 5;

-- Pokud chybí data, spusť sync
-- V aplikaci: Správa chatbotů → Produktový feed → Synchronizovat
```

## Klávesové zkratky

V Product Chat:
- **Enter** - Odeslat zprávu
- **Shift + Enter** - Nový řádek
- **Esc** - Zavřít chat (pokud implementováno)

## Užitečné odkazy

- **Dokumentace**: `PRODUCT_CHAT_IMPLEMENTATION.md`
- **Shrnutí**: `PRODUCT_CHAT_SUMMARY.md`
- **Test**: `test-product-chat.html`
- **N8N Webhook**: https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b

## Status kontrola

```bash
# Build
npm run build
# ✓ built in ~1s

# Linter
npm run lint
# No errors

# Dev server
npm run dev
# Running on http://localhost:5173
```

---

**Vše funguje?** ✅ **Ano!**

**Připraveno k použití?** ✅ **Ano!**

**N8N workflow ready?** ⚠️ **Vyžaduje nastavení na straně N8N**

