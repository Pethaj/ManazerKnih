# 🔧 Oprava - inline_product_links chyběl v chatbotSettings

## ❌ Problém

Screening produktů se nespouštěl, protože `inline_product_links` **chyběl** v `chatbotSettings` objektu, který se předává do `SanaChat` komponenty.

### Console log ukázal:
```javascript
chatbotSettings: {
  book_database: true,
  product_recommendations: false, 
  willUseCombinedSearch: false
  // ❌ CHYBÍ: inline_product_links
  // ❌ CHYBÍ: product_button_recommendations
}
```

### Důsledek:
```javascript
inline_product_links: undefined
isScreeningEnabled: false
⚠️ Screening PŘESKOČEN - podmínky nesplněny
```

---

## ✅ Řešení

Přidal jsem `inline_product_links` do všech míst, kde se vytváří nebo předává `chatbotSettings` objekt.

### Opravené soubory:

#### 1. `index.tsx` (hlavní app)
**Řádek 4851:** Přidán `inline_product_links`

```typescript
chatbotSettings={{
    product_recommendations: activeChatbot.features.product_recommendations || false,
    product_button_recommendations: activeChatbot.features.product_button_recommendations || false,
    inline_product_links: activeChatbot.features.inline_product_links || false,  // 🆕 PŘIDÁNO
    book_database: activeChatbot.features.book_database || false,
    use_feed_1: activeChatbot.features.use_feed_1 !== undefined ? activeChatbot.features.use_feed_1 : true,
    use_feed_2: activeChatbot.features.use_feed_2 !== undefined ? activeChatbot.features.use_feed_2 : true
}}
```

#### 2. `src/components/SanaChat/ChatWidget.tsx`

**Interface:** Přidán typ
```typescript
interface ChatWidgetProps {
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // 🆕 PŘIDÁNO
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
    };
}
```

**State:** Přidán typ
```typescript
const [chatbotSettings, setChatbotSettings] = useState<{
    product_recommendations: boolean;
    product_button_recommendations: boolean;
    inline_product_links?: boolean;  // 🆕 PŘIDÁNO
    book_database: boolean;
    use_feed_1?: boolean;
    use_feed_2?: boolean;
} | null>(null);
```

**Načítání z databáze:**
```typescript
setChatbotSettings({
    product_recommendations: settings.product_recommendations || false,
    product_button_recommendations: settings.product_button_recommendations || false,
    inline_product_links: settings.inline_product_links || false,  // 🆕 PŘIDÁNO
    book_database: settings.book_database !== undefined ? settings.book_database : true,
    use_feed_1: settings.use_feed_1 !== undefined ? settings.use_feed_1 : true,
    use_feed_2: settings.use_feed_2 !== undefined ? settings.use_feed_2 : true,
});
```

**Fallback defaulty (2 místa):**
```typescript
setChatbotSettings({
    product_recommendations: false,
    product_button_recommendations: false,
    inline_product_links: false,  // 🆕 PŘIDÁNO
    book_database: true,
    use_feed_1: true,
    use_feed_2: true,
});
```

---

## 🧪 Testování

### Po restartu aplikace:

1. Otevři chatbot (který má `inline_product_links: true` v DB)
2. Napiš: **"jaké wany na bolest hlavy"**
3. Sleduj console:

**Mělo by se zobrazit:**
```javascript
🤖 Product Screening - useEffect trigger: {
  isUser: false,
  hasSettings: true,
  isScreeningEnabled: true,  // ✅ TRUE!
  hasText: true,
  textLength: 1450
}

🤖 ✅ SPOUŠTÍM screening produktů přes GPT mini...
📡 Volám Supabase Edge Function...
✅ Edge Function response received
✅ Screening dokončen: X produktů/témat nalezeno
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VÝSLEDKY SCREENINGU:
   1. CHUAN XIONG CHA TIAO WAN
   2. XIN YI WAN
   3. bolest hlavy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Ověření v databázi

Všechny aktivní chatboty už mají `inline_product_links: true`:

```sql
SELECT chatbot_id, chatbot_name, inline_product_links, is_active
FROM chatbot_settings;
```

| chatbot_id | chatbot_name | inline_product_links | is_active |
|------------|-------------|---------------------|-----------|
| sana_local_format | Sana Local Format | true | true |
| test_chat | Testovací Chat | true | true |
| product_chat | Product Chat | true | true |
| sana_2 | Sana 2 | true | false |

---

## 📝 Poznámky

### Proč to chybělo?
- Při implementaci screeningu jsem aktualizoval `SanaChat.tsx` komponenty
- Ale zapomněl jsem aktualizovat **volající komponenty** (`index.tsx`, `ChatWidget.tsx`)
- Tyto komponenty vytvářejí `chatbotSettings` objekt a předávají ho do `SanaChat`

### Co je důležité?
- **Všechny komponenty** které vytváří/předávají `chatbotSettings` musí zahrnovat všechny properties
- TypeScript interface pomáhá, ale není dokonalý (optional properties `?`)

---

## ✅ Status

**Oprava dokončena!** 

Po restartu aplikace by měl screening fungovat správně.

---

**Opraveno:** 3. prosince 2025  
**Soubory:** 2 (index.tsx, ChatWidget.tsx)  
**Změny:** Přidán `inline_product_links` do chatbotSettings


