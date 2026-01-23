# 💾 Chat History Integration - Návod

## ✅ Co bylo vytvořeno

### 1. **Databázová struktura** ✅
- Tabulka `chat_messages` vytvořena v Supabase
- SQL funkce pro pagination a lazy loading
- Full-text search funkce
- RLS policies nastaveny

### 2. **Service layer** ✅
- `src/services/chatHistoryService.ts` - kompletní API pro práci s historií
- `src/utils/chatHistoryUtils.ts` - helper funkce

### 3. **Částečná integrace do SanaChat** ⚠️
- ✅ Import služeb přidán
- ✅ Ukládání USER zpráv funguje (přidáno do `handleSendMessage`)
- ✅ Ukládání FUNNEL BOT zpráv funguje
- ⚠️ Zbývá dokončit ukládání ostatních BOT zpráv

---

## 🔧 Co je potřeba ještě dodělat

### Přidat ukládání BOT zpráv na následující místa:

#### **Místo 1: Book Database Response (řádek ~1902)**
```typescript
setMessages(prev => [...prev, botMessage]);

// 💾 PŘIDAT TOTO:
saveBotMessageToHistory(
    sessionId,
    currentUser?.id,
    chatbotId,
    webhookResult.text,
    {
        sources: webhookResult.sources,
        matchedProducts: webhookResult.matchedProducts,
        hasCallout: shouldShowCallout
    }
);
```

#### **Místo 2: Hybrid Product Recommendations (řádek ~1946)**
```typescript
setMessages(prev => [...prev, botMessage]);
setAutoScroll(false);

// 💾 PŘIDAT TOTO:
saveBotMessageToHistory(
    sessionId,
    currentUser?.id,
    chatbotId,
    botMessage.text,
    {
        productRecommendations: productRecommendations
    }
);
```

#### **Místo 3: Silent Prompt Response (řádek ~2019)**
```typescript
setMessages(prev => [...prev, botMessage]);

// 💾 PŘIDAT TOTO:
saveBotMessageToHistory(
    sessionId,
    currentUser?.id,
    chatbotId,
    botText,
    {
        sources: sources,
        productRecommendations: productRecommendations,
        matchedProducts: matchedProducts
    }
);
```

#### **Místo 4: Duplicitní SanaChat komponenta (pokud existuje)**
Pokud v souboru existuje druhá implementace `SanaChat` (ne `SanaChatContent`), přidej stejné ukládání tam.

---

##  📝 Poznámky k implementaci

### USER zprávy
- ✅ Ukládají se **OKAMŽITĚ** po odeslání (před voláním API)
- ✅ Obsahují **metadata** (aktivní filtry v době odeslání)
- ✅ Pokud uložení selže, konverzace pokračuje normálně

### BOT zprávy
- Ukládají se **PO OBDRŽENÍ** odpovědi od API
- **NEOBSAHUJÍ metadata** (podle varianty B - bot zprávy nemají vlastní metadata)
- Obsahují `message_data` (sources, products, atd.)
- Pokud uložení selže, konverzace pokračuje normálně

### Error handling
- Všechny ukládací operace používají `.catch()` - nechceme přerušit konverzaci
- Chyby se logují do konzole, ale nezastaví chat

---

## 🧪 Testování

### 1. Otestuj ukládání zpráv
```typescript
// V prohlížeči otevři konzoli a pošli zprávu
// Měl bys vidět:
// ✅ 💾 [ChatHistory] Ukládám zprávu do Supabase
// ✅ ✅ [ChatHistory] Zpráva úspěšně uložena
```

### 2. Zkontroluj v Supabase
```sql
-- Otevři Supabase SQL Editor a spusť:
SELECT * FROM chat_messages
ORDER BY created_at DESC
LIMIT 10;

-- Měl bys vidět svoje zprávy
```

### 3. Testuj načítání sessions
```sql
-- Zkus načíst seznam sessions:
SELECT * FROM get_user_chat_sessions(
    'tvoje-user-id'::uuid,
    20,  -- limit
    0    -- offset
);
```

---

## 🎯 Finální checklist

- [x] SQL migrace aplikována
- [x] Service vytvořeny
- [x] Import do SanaChat přidán
- [x] USER zprávy ukládány
- [x] FUNNEL BOT zprávy ukládány
- [ ] Book Database BOT zprávy ukládány
- [ ] Hybrid Products BOT zprávy ukládány
- [ ] Silent Prompt BOT zprávy ukládány
- [ ] Combined Search BOT zprávy ukládány
- [ ] Testování v prohlížeči
- [ ] Ověření v Supabase

---

## 🚀 Jak to dokončit

### Rychlý způsob:
Vyhledej v `SanaChat.tsx` všechny výskyty:
```
setMessages(prev => [...prev, botMessage]);
```

A hned za každý přidej volání:
```typescript
saveBotMessageToHistory(sessionId, currentUser?.id, chatbotId, botMessage.text, { ...data... });
```

### Opatrný způsob:
Projdi soubor `SanaChat.tsx` a najdi všechna místa kde se vytváří `botMessage`.
Pro každé místo přidej ukládání podle typu odpovědi (sources, products, atd.).

---

## 📊 Výsledek

Po dokončení integrace budou všechny konverzace automaticky ukládány do Supabase:
- Každá USER zpráva s metadaty (filtry)
- Každá BOT zpráva se všemi daty (sources, products, funnel, atd.)
- Session ID propojuje zprávy do konverzací
- Připraveno pro UI "Historie konverzací" (lazy loading, pagination, search)

---

**Status:** 🟡 Částečně hotovo - zbývá přidat ukládání BOT zpráv na 3-4 místech
