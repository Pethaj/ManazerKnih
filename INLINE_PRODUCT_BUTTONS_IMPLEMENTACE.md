# Implementace: Inline Product Buttons (ChatGPT Style)

## ✅ Co bylo implementováno

Přidány **inline produktové tlačítka** do chatbot odpovědí - zobrazují se automaticky pod textem odpovědi, stejně jako odkazy v ChatGPT.

## 🎨 Vizuální design

```
┌─────────────────────────────────────────────────────────────┐
│ Bot odpověď (markdown text)                                  │
│                                                               │
│ "Doporučuji Te Xiao Bi Min Gan Wan pro nosní průchodnost..." │
│ ─────────────────────────────────────────────────────────────│
│ 🛍️ Produkty: [🛒 009 - Čistý dech] [🛒 Levandule 15ml]      │
└─────────────────────────────────────────────────────────────┘
```

### Styl tlačítek:
- **Zelené pozadí** (`bg-green-50`) s zeleným textem (`text-green-700`)
- **Malá ikona košíku** (shopping bag) před názvem
- **Hover efekt** - zezelenání na `bg-green-100`
- **Tooltip** - při najetí myší: "Pinyin Name - Shoda: 95%"
- **Truncate** - dlouhé názvy se oříznou (max 120px)
- **Border** - jemný zelený okraj (`border-green-200`)

## 📁 Změněné soubory

### `src/components/SanaChat/SanaChat.tsx`

#### 1. Nová komponenta `ProductPill`

```typescript
const ProductPill: React.FC<{ 
    productName: string; 
    pinyinName: string;
    url: string; 
    similarity: number;
}> = ({ productName, pinyinName, url, similarity }) => (
    <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-md hover:bg-green-100 transition-colors border border-green-200 ml-1"
        title={`${pinyinName} - Shoda: ${(similarity * 100).toFixed(0)}%`}
    >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span className="max-w-[120px] truncate">{productName}</span>
    </a>
);
```

#### 2. Aktualizace `ChatMessage` interface

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  sources?: Source[];
  productRecommendations?: ProductRecommendation[];
  matchedProducts?: any[]; // 🆕 Matched produkty z name matching
}
```

#### 3. Aktualizace `sendMessageToAPI`

```typescript
// Návratový typ
Promise<{ 
  text: string; 
  sources: Source[]; 
  productRecommendations?: ProductRecommendation[]; 
  matchedProducts?: any[] // 🆕
}>

// V těle funkce po screeningu a matchingu
let matchedProducts: any[] = [];
// ... screening + matching ...
if (matchingResult.success && matchingResult.matches.length > 0) {
    matchedProducts = matchingResult.matches;
}

// Return statement
return {
    text: finalBotText,
    sources: responsePayload?.sources || [],
    productRecommendations: undefined,
    matchedProducts: matchedProducts, // 🆕
};
```

#### 4. Přidání matched produktů do bot message

```typescript
const { text: botText, sources, productRecommendations, matchedProducts } = await sendMessageToAPI(...);
const botMessage: ChatMessage = { 
    id: (Date.now() + 1).toString(), 
    role: 'bot', 
    text: botText, 
    sources: sources,
    productRecommendations: productRecommendations,
    matchedProducts: matchedProducts // 🆕
};
```

#### 5. Rendering matched produktů pod markdown obsahem

```tsx
{/* 🆕 MATCHED PRODUCTS: Zobrazíme nalezené produkty jako inline tlačítka */}
{!isUser && message.matchedProducts && message.matchedProducts.length > 0 && (
    <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-slate-500 mr-1">🛍️ Produkty:</span>
            {message.matchedProducts.map((product, index) => (
                <ProductPill
                    key={`${product.product_code}-${index}`}
                    productName={product.product_name}
                    pinyinName={product.pinyin_name}
                    url={product.url}
                    similarity={product.similarity}
                />
            ))}
        </div>
    </div>
)}
```

## 🔄 Data Flow

```
User dotaz
    ↓
N8N GPT odpověď
    ↓
Screening (GPT-4o-mini) → ["Te Xiao Bi Min Gan Wan", "009"]
    ↓
Matching (Fuzzy) → [{product_name, pinyin_name, url, similarity}, ...]
    ↓
matchedProducts přidány do ChatMessage
    ↓
Rendering: ProductPill komponenty zobrazeny pod textem
    ↓
User klikne na tlačítko → Otevře se URL produktu v novém tabu
```

## 🎯 Použití

### Automatické (default)

1. Uživatel se zeptá v chatu
2. GPT odpoví
3. Automaticky se spustí screening + matching
4. Nalezené produkty se zobrazí jako zelená tlačítka pod odpovědí
5. V konzoli se vypíše detailní log

### Příklad výstupu

**Chat:**

```
Bot: "Doporučuji Te Xiao Bi Min Gan Wan (009 - Čistý dech) pro 
      nosní průchodnost a uvolnění dutin."

─────────────────────────────────────────────────────────────
🛍️ Produkty: [🛒 009 - Čistý dech]
```

**Console:**

```
🔍 Zahajuji screening a matching produktů z odpovědi...
📦 GPT identifikoval 2 produktů: ["Te Xiao Bi Min Gan Wan", "009"]
✅ Match: "Te Xiao Bi Min Gan Wan" → "Te Xiao Bi Min Gan Wan" (100%)
   🔗 URL: https://bewit.love/produkt/bewit-cisty-dech
============================================================
📊 SHRNUTÍ MATCHINGU PRODUKTŮ
============================================================
✅ Nalezeno: 1 produktů
🔗 URL NALEZENÝCH PRODUKTŮ:
1. 009 - Čistý dech
   URL: https://bewit.love/produkt/bewit-cisty-dech
   Shoda: 100%
============================================================
```

## 🎨 Vlastní styling

Pokud chceš změnit barvu tlačítek, uprav třídy v `ProductPill`:

```typescript
// Aktuální (zelená)
className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"

// Modrá varianta
className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"

// Oranžová varianta
className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"

// Bewit brand barvy
className="bg-bewit-lightBlue text-bewit-blue border-blue-200 hover:bg-blue-200/70"
```

## 📊 Features

✅ **Automatická detekce** - Žádná konfigurace potřeba
✅ **ChatGPT style** - Vizuálně podobné odkazy v ChatGPT
✅ **Responsive** - Wrap na více řádků pokud je hodně produktů
✅ **Tooltip** - Zobrazí pinyin název a % shodu
✅ **External links** - Otevře se v novém tabu
✅ **Console logging** - Detailní info pro debugging
✅ **Truncate** - Dlouhé názvy se oříznou
✅ **Icon** - Shopping bag ikona před každým produktem

## 🔧 Konfigurace

### Pozice tlačítek

Aktuálně: **Pod textem, nad source pills**

Chceš-li změnit pozici, přesuň tento kód v `SanaChat.tsx`:

```tsx
{/* MATCHED PRODUCTS */}
{!isUser && message.matchedProducts && message.matchedProducts.length > 0 && (
    <div className="mt-3 pt-3 border-t border-slate-200">
        ...
    </div>
)}
```

**Možnosti:**
1. **Nad textem** - přesuň nad `<ReactMarkdown>`
2. **Vedle sources** - přidej do stejného divu jako SourcePills
3. **V samostatné sekci** - mimo message bubble

### Počet zobrazených produktů

Aktuálně: **Všechny matched produkty**

Pokud chceš limit:

```typescript
{message.matchedProducts.slice(0, 5).map((product, index) => (
    <ProductPill ... />
))}
```

### Similarity threshold

Produkty se zobrazují pokud mají shodu >= 50%

Změna v `productNameMatchingService.ts`:

```typescript
if (match && match.similarity >= 0.5) { // Změní na 0.7 pro přísnější
```

## 🐛 Troubleshooting

### Produkty se nezobrazují

**1. Zkontroluj console:**

```
🔍 Zahajuji screening a matching...
📦 GPT identifikoval X produktů
✅ Nalezeno Y produktů
```

**2. Zkontroluj, že máš matched produkty:**

```javascript
// V browser console (F12)
// Po obdržení odpovědi
console.log(messages[messages.length - 1].matchedProducts);
```

**3. Zkontroluj SQL funkci:**

```sql
SELECT * FROM get_products_with_pinyin_names() LIMIT 10;
```

### Tlačítka vypadají divně

**Zkontroluj Tailwind config** - možná chybí zelené barvy:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        green: { // Ujisti se, že je definováno
          50: '#f0fdf4',
          100: '#dcfce7',
          // ...
        }
      }
    }
  }
}
```

### Chybí ikona košíku

Ikona je SVG inline - pokud se nezobrazuje, zkontroluj:

```tsx
<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
</svg>
```

## 📈 Monitoring

### Metriky ke sledování:

1. **% zobrazení tlačítek** - Kolik odpovědí obsahuje matched produkty
2. **Průměrný počet produktů** - Per odpověď
3. **Click-through rate** - % kliknutí na tlačítka
4. **Avg. similarity** - Průměrná shoda matched produktů

### Tracking (budoucí vylepšení):

```typescript
// V ProductPill onClick handler
const handleClick = () => {
    // Track click event
    analytics.track('product_pill_clicked', {
        product_code: product.product_code,
        similarity: product.similarity,
        source: 'chat_inline'
    });
};
```

## 🚀 Budoucí vylepšení

1. **Inline v textu** - Místo pod textem přímo v průběhu věty
2. **Product preview** - Hover zobrazí obrázek a cenu
3. **Quick add to cart** - Tlačítko pro přidání do košíku
4. **Tracking** - Analytics pro kliknutí
5. **A/B testy** - Různé barvy/styly tlačítek
6. **Smart positioning** - Zobrazit jen u relevantních vět

---

**Status:** ✅ Implementováno a ready k testování
**Datum:** 2025-12-03
**Verze:** 1.0


