# ⚡ QUICK FIX - Chat History se neukládá

## 🎯 Problém
Data se neukládají do `chat_messages` tabulky.

## 🔍 Diagnostika

### Krok 1: Zjisti který mode používáš

Otevři konzoli (F12) a pošli zprávu. Hledej tyto logy:

**Combined Search (knihy + produkty):**
```
🚀 Kombinované vyhledávání: knihy + produkty současně
```

**Pouze Book Database:**
```
📚 Používám pouze webhook pro databázi knih
```

**Pouze Products:**
```
🛍️ Používám hybridní systém pro produktové doporučení
```

**Funnel:**
```
🎯 SPUŠTĚNÍ PRODUKTOVÉHO FUNNELU
```

---

## ⚡ Řešení podle mode

### Pokud vidíš: "Kombinované vyhledávání"

**Problém:** Combined Search NEMÁ implementované ukládání!

**Quick Fix:**
Přidej tento kód do `SanaChat.tsx` na řádek **~1851** (za `performCombinedSearch`):

```typescript
await performCombinedSearch(...);

// 💾 QUICK FIX: Uložíme combined search výsledek
setTimeout(() => {
    const allMessages = [...newMessages];
    const lastBotMsg = allMessages.filter(m => m.role === 'bot').pop();
    if (lastBotMsg) {
        saveChatPairToHistory(
            sessionId,
            currentUser?.id,
            chatbotId,
            text.trim(),
            lastBotMsg.text,
            Object.keys(currentMetadataForHistory).length > 0 ? currentMetadataForHistory : undefined,
            {
                sources: lastBotMsg.sources,
                products: lastBotMsg.productRecommendations
            }
        );
    }
}, 3000);
```

---

### Pokud vidíš: "Používám pouze webhook" (Book Database)

**Mělo by fungovat!** Zkontroluj:

1. Je v konzoli tento log?
```
💾 [ChatHistory] Ukládám PAR otázka-odpověď
```

2. Pokud NE → používáš špatnou komponentu

**Quick Fix:**
Najdi v kódu který `SanaChat` se používá a přidej import:
```typescript
import { saveChatPairToHistory } from '../../utils/chatHistoryUtils';
```

---

### Pokud vidíš: "hybridní systém" (Products)

**Problém:** Hybrid Products mode NEMÁ ukládání!

**Quick Fix:**
Přidej na řádek **~1951** (za `setAutoScroll(false)`):

```typescript
setAutoScroll(false);

// 💾 QUICK FIX: Uložíme products výsledek
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
```

---

## 🚨 Nejčastější problém: Používáš duplicitní komponentu

V `SanaChat.tsx` jsou DVĚ komponenty:
1. **SanaChatContent** (řádek 1369) - ✅ MÁ ukládání
2. **SanaChat** (řádek 2050) - ❌ NEMÁ ukládání

### Jak zjistit kterou používáš?

Vyhledej v kódu kde se komponenta renderuje:
```typescript
// Pokud vidíš:
<SanaChatContent ... />  // ✅ Dobrá komponenta

// Pokud vidíš:
<SanaChat ... />  // ❌ Špatná komponenta
```

### Pokud používáš `SanaChat` (ne Content):

Musíš přidat ukládání i tam. Najdi řádek **~2257** a přidej stejný kód jako výše.

---

## 🧪 Test po opravě

1. Pošli zprávu
2. Zkontroluj konzoli:
```
💾 [ChatHistory] Ukládám PAR otázka-odpověď
✅ [ChatHistory] Pár otázka-odpověď úspěšně uložen
```

3. Zkontroluj DB:
```sql
SELECT 
    role,
    message_text,
    message_data->>'answer' as answer
FROM chat_messages
WHERE role = 'pair'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📞 Potřebuji info

Napiš mi:
1. **Který log vidíš v konzoli?** (Combined? Book Database? Products?)
2. **Vidíš log "💾 Ukládám PAR"?** (ANO/NE)
3. **Který chatbot používáš?** (sana_medbase? vany_chat?)

Podle toho ti řeknu přesně co opravit! 🚀
