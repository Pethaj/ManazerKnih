# Product Pills - Duální zobrazení (uvnitř zprávy)

> **Implementováno:** 2026-01-22
> **Status:** ✅ Aktivní

## Popis změny

Product Pills (inline produktové linky) se nyní zobrazují na **dvou místech současně** **UVNITŘ zprávy bota**, pokud je nastavení `inline_product_links` zapnuté:

1. **Sekce "Související produkty BEWIT" po prvním odstavci** - Všechny produkty pod sebou (vertikálně)
2. **Průběžně v textu** - Product Pills inline (horizontálně) - beze změny

**DŮLEŽITÉ:** Sekce není samostatný blok nad zprávou, ale je **vložena do obsahu zprávy** pod úvodem/prvním odstavcem.

## Vizuální design

```
┌─────────────────────────────────────────────────────────────┐
│ Bot (EO-Smesi):                                              │
│                                                              │
│ [Disclaimer text]                                            │
│                                                              │
│ [Úvodní odstavec odpovědi...]                               │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🛒 Související produkty BEWIT                            │ │
│ │                                                           │ │
│ │ [009 - Čistý dech]         ← Modrý gradient button       │ │
│ │ [205 - Pružná stezka]      ← Modrý gradient button       │ │
│ │ [118 - Klidná mysl]        ← Modrý gradient button       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ "Doporučuji wan 009 Te Xiao Bi Min Gan Wan [🛒 009 - Čistý │
│  dech] pro nosní průchodnost a 205 Jin Gu Die Shang Wan    │
│  [🛒 205 - Pružná stezka] na bolest kloubů..."             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technická implementace

### Změny v `SanaChat.tsx`

#### 1. Nová funkce `extractAllProductMarkers()`

```typescript
const extractAllProductMarkers = () => {
    const text = message.text || '';
    const productMarkerRegex = /<<<PRODUCT:([^|]+)\|\|\|([^|]+)\|\|\|([^|]+)\|\|\|([^>]+)>>>/g;
    const products: Array<{
        productCode: string;
        productUrl: string;
        productName: string;
        pinyinName: string;
    }> = [];
    
    let match;
    while ((match = productMarkerRegex.exec(text)) !== null) {
        const [, productCode, productUrl, productName, pinyinName] = match;
        products.push({
            productCode: productCode.trim(),
            productUrl: productUrl.trim(),
            productName: productName.trim(),
            pinyinName: pinyinName.trim()
        });
    }
    
    return products;
};
```

**Účel:**
- Extrahuje všechny `<<<PRODUCT:...>>>` markery z textu zprávy
- Vrací pole objektů s daty produktů
- Používá stejný regex jako `renderTextWithProductButtons()`

#### 2. Upravená funkce `renderTextWithProductButtons()`

**Logika vložení sekce:**
1. Najde pozici prvního dvojitého nového řádku `\n\n` v textu (konec prvního odstavce)
2. Při parsování markerů zjišťuje, kdy překročila tuto pozici
3. V ten moment:
   - Rozdělí aktuální text segment na dvě části (před a po pozici)
   - Renderuje první část (před pozicí)
   - **Vloží sekci "Související produkty BEWIT"**
   - Renderuje druhou část (po pozici)
   - Pokračuje normálním parsováním inline Product Pills

**Kód sekce produktů:**

```tsx
<div key={`products-section`} className="my-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
    <h4 className="text-sm font-semibold text-bewit-blue mb-3 flex items-center gap-2">
        <svg>...</svg>
        Související produkty BEWIT
    </h4>
    <div className="flex flex-col gap-2">
        {allProducts.map((product, index) => (
            <ProductPill
                key={`top-product-${index}`}
                productName={product.productName}
                pinyinName={product.pinyinName}
                url={product.productUrl}
            />
        ))}
    </div>
</div>
```

**Vlastnosti:**
- ✅ Vkládá se **do obsahu zprávy** (ne jako samostatný blok)
- ✅ Pozice: **po prvním odstavci** (po prvním `\n\n`)
- ✅ Modrý gradient pozadí (`from-blue-50 to-indigo-50`)
- ✅ Ikona košíku v nadpisu
- ✅ Product Pills **pod sebou** (`flex-col gap-2`)
- ✅ Stejná `ProductPill` komponenta jako inline
- ✅ Zobrazuje se pouze pokud:
  - `chatbotSettings.inline_product_links === true`
  - Existují produkty (`allProducts.length > 0`)
  - Text má alespoň jeden `\n\n` (oddělené odstavce)

#### 3. Inline zobrazení (beze změny)

Stávající inline Product Pills se nadále renderují stejně - po sekci "Související produkty BEWIT" pokračuje normální parsování textu s inline buttons.

## Podmínky zobrazení

### Horní sekce se zobrazí když:
1. ✅ Zpráva je od **bota** (ne uživatele)
2. ✅ `chatbotSettings.inline_product_links === true`
3. ✅ Text obsahuje alespoň jeden `<<<PRODUCT:...>>>` marker

### Inline Pills se zobrazí když:
1. ✅ Zpráva je od **bota**
2. ✅ `usesMarkdown === true` (Sana Local, Vany Chat, EO-Smesi, Wany Chat Local)
3. ✅ Text obsahuje `<<<PRODUCT:`

## Ovlivněné chatboty

Změna ovlivňuje pouze chatboty s:
- `inline_product_links: true` v nastavení
- Markdown rendering (Sana 2, EO-Smesi, Wany Chat Local, Vany Chat)

**Testovat s:**
- ✅ **EO-Smesi** - TCM produkty (wany)
- ✅ **Wany Chat Local** - TCM produkty
- ✅ **Sana Local Format** - Obecné BEWIT produkty

## Výhody implementace

### 1. **Žádný breaking change**
- Stávající inline zobrazení funguje stejně
- Přidává se pouze nová sekce nahoře

### 2. **Minimální kód**
- Přidáno cca 50 řádků kódu
- Žádná komplexní logika
- Jednoduchá extrakce pomocí regex

### 3. **Konzistentní UX**
- Stejná `ProductPill` komponenta na obou místech
- Stejné hover efekty a klikací behaviour
- Stejná vizuální identita (modrý gradient)

### 4. **Lepší přehlednost**
- Uživatel vidí **všechny doporučené produkty nahoře** na jednom místě
- Zároveň vidí **kontext v textu** kde byl produkt zmíněn
- Maximální viditelnost produktů

## Nevýhody

### 1. **Duplikace komponent**
- Každý `ProductPill` se renderuje 2x
- Mírně vyšší spotřeba paměti (ale zanedbatelná)

**Řešení:** Přijatelné pro lepší UX

### 2. **Scroll při mnoha produktech**
- Pokud bot doporučí 10+ produktů, horní sekce může být dlouhá

**Řešení:** Typicky bot doporučuje 2-5 produktů, takže to není problém

## Testování

### Test 1: Základní zobrazení

**Kroky:**
1. Otevři EO-Smesi chat
2. Napiš: "bolí mě hlava"
3. Počkej na odpověď bota

**Očekávaný výsledek:**
- ✅ Horní sekce "Související produkty BEWIT" se zobrazí nad zprávou
- ✅ Všechny Product Pills jsou v horní sekci pod sebou
- ✅ Stejné Product Pills jsou také inline v textu
- ✅ Obě verze mají modrý gradient a hover efekt
- ✅ Klik na jakýkoliv pill otevře URL produktu

### Test 2: Bez product markerů

**Kroky:**
1. Otevři EO-Smesi chat
2. Napiš: "Jak se máš?"
3. Počkej na odpověď bota

**Očekávaný výsledek:**
- ✅ Horní sekce se **nezobrazí**
- ✅ Pouze normální text zprávy
- ✅ Žádné Product Pills

### Test 3: Inline_product_links vypnutá

**Kroky:**
1. Jdi do Správa chatbotu → EO-Smesi
2. Vypni "Inline produktové linky"
3. Otevři chat a napiš: "bolí mě hlava"

**Očekávaný výsledek:**
- ✅ Horní sekce se **nezobrazí**
- ✅ Product Pills se **nezobrazí** ani inline
- ✅ Pouze čistý text bez markerů

### Test 4: Více produktů (3+)

**Kroky:**
1. Otevři EO-Smesi chat
2. Napiš dotaz, který vrátí 3+ produkty (např. "únava, bolest hlavy, špatný spánek")
3. Počkej na odpověď

**Očekávaný výsledek:**
- ✅ Horní sekce zobrazí všechny 3+ produkty vertikálně
- ✅ Každý produkt má svůj řádek
- ✅ Stejné produkty jsou také inline v textu
- ✅ Sekce má pěkný layout (ne přecpaná)

## Console logs

```javascript
// Při parsování zprávy:
console.log('🎨 renderTextWithProductButtons - začínám parsování');
console.log('✅ Nalezen product marker:', match[0]);
console.log('🔘 Vytvářím ProductPill:', { productCode, productName, productPinyin });
```

**Nové logy nepřidávány** - používáme existující logování z `renderTextWithProductButtons()`.

## Soubory změněné

- ✅ `src/components/SanaChat/SanaChat.tsx` - Přidána extrakce a horní sekce

## Soubory nedotčené

- ✅ `src/components/ProductPill.tsx` - Beze změny
- ✅ `src/services/inlineProductScreeningService.ts` - Beze změny
- ✅ Backend edge functions - Beze změny
- ✅ Databáze - Beze změny

## Rollback plán

Pokud by bylo třeba vrátit změny:

1. Odebrat funkci `extractAllProductMarkers()`
2. Odebrat horní sekci před zprávou
3. Vrátit původní structure `<div className="flex flex-col">`

**Odhadovaný čas rollback:** 5 minut

## Budoucí vylepšení (volitelné)

### 1. Collapsible sekce
Pokud je produktů hodně (5+), umožnit sbalit/rozbalit horní sekci.

### 2. Preview obrázků
Zobrazit malý thumbnail produktu vedle názvu v horní sekci.

### 3. Přidat cenu
Zobrazit cenu produktu přímo v horní sekci (ne jen v inline).

### 4. Sorting
Řadit produkty podle relevance nebo popularity.

---

**Status:** ✅ Implementováno a připraveno k testování
**Další krok:** Otestovat s EO-Smesi chatbotem
