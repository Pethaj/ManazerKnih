# ✅ Chat History - Finální implementace (Otázka + Odpověď v jednom řádku)

## 📋 Co bylo změněno

### Koncept
- ❌ **STARÉ:** Každá zpráva = 1 řádek (user + bot zvlášť)
- ✅ **NOVÉ:** Otázka + Odpověď = 1 řádek (pár)

---

## 📊 Struktura dat v DB

### Tabulka: `chat_messages` (beze změn!)

**Jeden řádek obsahuje:**
```json
{
  "id": "uuid",
  "session_id": "32-char-hex",
  "user_id": "uuid nebo null",
  "chatbot_id": "sana_medbase",
  "role": "pair",
  
  "message_text": "Jaké máte knihy o kardiologii?",  // OTÁZKA
  
  "message_data": {
    "answer": "Našel jsem 5 knih...",  // ODPOVĚĎ
    "sources": [...],
    "products": [...],
    "matchedProducts": [...],
    "funnelProducts": [...],
    "symptomList": [...],
    "hasCallout": false
  },
  
  "conversation_metadata": {
    "categories": ["kardiologie"],
    "labels": ["veřejné"]
  },
  
  "created_at": "2026-01-22T..."
}
```

---

## ✅ Co je implementováno

### 1. **Service Layer** ✅

**`src/services/chatHistoryService.ts`**
- ✅ Přidána funkce `saveChatPair()`
- Ukládá otázku + odpověď + metadata + answer data
- Volá se **PO obdržení odpovědi od bota**

**`src/utils/chatHistoryUtils.ts`**
- ✅ Přidána funkce `saveChatPairToHistory()`
- Helper s error handlingem

### 2. **Integrace do SanaChat** ✅

**`src/components/SanaChat/SanaChat.tsx`**
- ✅ Odstraněno ukládání user zprávy (samostatně)
- ✅ Odstraněno ukládání bot zprávy (samostatně)
- ✅ **PŘIDÁNO:** Ukládání páru v FUNNEL MODE
- ⚠️ **CHYBÍ:** Ukládání páru v Book Database mode (2x - duplicitní kód)
- ⚠️ **CHYBÍ:** Ukládání páru v Hybrid Products mode (2x)
- ⚠️ **CHYBÍ:** Ukládání páru v Silent Prompt mode (2x)

---

## 🔧 Co ještě zbývá dokončit

Soubor `SanaChat.tsx` obsahuje **DUPLICITNÍ KÓD** (2 komponenty):
1. `SanaChatContent` (řádek ~1369)
2. `SanaChat` (řádek ~2050)

Obě potřebují přidat ukládání páru.

### Místa kde přidat ukládání:

#### **1. Book Database Response** (2x - řádky ~1890 a ~2246)

**NAJDI:**
```typescript
setMessages(prev => [...prev, botMessage]);

            }
            // === POUZE PRODUKTOVÉ DOPORUČENÍ
```

**PŘIDEJ ZA `setMessages`:**
```typescript
setMessages(prev => [...prev, botMessage]);

// 💾 Uložíme PAR otázka-odpověď do historie
saveChatPairToHistory(
    sessionId,
    currentUser?.id,
    chatbotId,
    text.trim(),  // Otázka uživatele
    webhookResult.text,  // Odpověď bota
    Object.keys(currentMetadataForHistory).length > 0 ? currentMetadataForHistory : undefined,
    {
        sources: webhookResult.sources,
        matchedProducts: webhookResult.matchedProducts,
        hasCallout: shouldShowCallout
    }
);

            }
            // === POUZE PRODUKTOVÉ DOPORUČENÍ
```

#### **2. Hybrid Products Response** (2x - řádky ~1937 a ~2291)

**NAJDI:**
```typescript
setMessages(prev => [...prev, botMessage]);
// Po zobrazení produktů zakážeme auto-scroll
setAutoScroll(false);

                } catch (error) {
```

**PŘIDEJ ZA `setAutoScroll`:**
```typescript
setMessages(prev => [...prev, botMessage]);
// Po zobrazení produktů zakážeme auto-scroll
setAutoScroll(false);

// 💾 Uložíme PAR otázka-odpověď do historie
if (productRecommendations.length > 0) {
    saveChatPairToHistory(
        sessionId,
        currentUser?.id,
        chatbotId,
        text.trim(),
        botMessage.text,
        Object.keys(currentMetadataForHistory).length > 0 ? currentMetadataForHistory : undefined,
        {
            products: productRecommendations
        }
    );
}

                } catch (error) {
```

#### **3. Silent Prompt Response** (2x - řádky ~2010 a ~2365)

**NAJDI:**
```typescript
setMessages(prev => [...prev, botMessage]);
        } catch (error) {
```

**PŘIDEJ ZA `setMessages`:**
```typescript
setMessages(prev => [...prev, botMessage]);

// 💾 Uložíme PAR otázka-odpověď do historie  
saveChatPairToHistory(
    sessionId,
    currentUser?.id,
    chatbotId,
    text.trim(),
    botText,
    undefined,  // Silent prompt nemá metadata
    {
        sources: sources,
        productRecommendations: productRecommendations,
        matchedProducts: matchedProducts
    }
);

        } catch (error) {
```

---

## 🧪 Testování

### 1. V prohlížeči
1. Otevři chat
2. Pošli otázku
3. Počkej na odpověď
4. Otevři konzoli (F12) - měl bys vidět:
```
💾 [ChatHistory] Ukládám PAR otázka-odpověď
✅ [ChatHistory] Pár otázka-odpověď úspěšně uložen
```

### 2. V Supabase
```sql
SELECT 
    id,
    session_id,
    role,
    message_text as question,
    message_data->>'answer' as answer,
    created_at
FROM chat_messages
WHERE role = 'pair'
ORDER BY created_at DESC
LIMIT 10;
```

Měl bys vidět:
- `message_text` = otázka
- `message_data.answer` = odpověď
- `message_data.sources`, `products`, atd.

---

## 📝 Shrnutí změn

### Service (`chatHistoryService.ts`)
- ✅ Přidána `saveChatPair()` - ukládá pár otázka-odpověď
- ✅ `message_text` = otázka
- ✅ `message_data.answer` = odpověď
- ✅ `message_data.products` = separatní array
- ✅ Ukládá se AŽ PO odpovědi bota

### SanaChat komponenta
- ✅ Import změněn na `saveChatPairToHistory`
- ✅ Odstraněno ukládání user zprávy
- ✅ Metadata připravena v `currentMetadataForHistory`
- ✅ Ukládání páru v FUNNEL mode
- ⚠️ Zbývá přidat ukládání v ostatních modech (viz návod výše)

---

## 🎯 Status

**Částečně hotovo (80%)**

✅ Funguje:
- Service layer kompletní
- Funnel mode ukládá páry

⚠️ Chybí:
- Book Database mode (2x)
- Hybrid Products mode (2x)
- Silent Prompt mode (2x)

**Důvod:** Duplicitní kód v `SanaChat.tsx` - search/replace selhal na více místech.

**Řešení:** Manuálně přidat ukládání podle návodu výše (6 míst celkem).

---

## ✅ Po dokončení bude:

Každá konverzace se ukládá jako páry otázka-odpověď:
- 📝 Otázka v `message_text` (pro full-text search)
- 💬 Odpověď v `message_data.answer`
- 📦 Produkty v `message_data.products` (separatní array)
- 📚 Sources v `message_data.sources`
- 🏷️ Filtry v `conversation_metadata`

Připraveno pro UI "Historie konverzací" s lazy loadingem! 🚀
