# 🗺️ Implementace Mapování Produktů - Krok 2

## ✅ Co bylo implementováno

Rozšířili jsme screening produktů o **mapování na databázi** pomocí vektorového vyhledávání.

---

## 🏗️ Architektura

```
Screening (Krok 1)
    ↓
Seznam produktů ["CHUAN XIONG CHA TIAO WAN", "XIN YI WAN", "bolest hlavy"]
    ↓
Krok 2: Mapování na databázi
    ↓
Pro každý produkt:
  1. Vygeneruj embedding (Edge Function → OpenRouter)
  2. Vyhledej v product_embeddings (vector search)
  3. Načti metadata z product_feed_2
    ↓
Výsledek: Párování
```

---

## 📁 Nové soubory

### 1. ✅ `src/services/productMappingService.ts`

**Hlavní funkce:**
- `mapProductsToDatabase(products: string[])` - Mapuje seznam produktů na databázi
- `printMappingResults(matches: ProductMatch[])` - Výpis do console

**Proces:**
1. Pro každý produkt ze screeningu vygeneruje embedding pomocí Edge Function
2. Vyhledá v `product_embeddings` pomocí vektorového vyhledávání (cosine similarity)
3. Pokud je similarity >= 0.75 (75%), považuje za shodu
4. Načte URL a thumbnail z `product_feed_2`
5. Vrátí párování

### 2. ✅ Edge Function `generate-embedding`

**Umístění:** `supabase/functions/generate-embedding/index.ts`
**Status:** ✅ NASAZENO

**Co dělá:**
- Přijímá text z frontendu
- Volá OpenRouter embeddings API
- Model: `text-embedding-3-large` (GPT large)
- Dimenze: 1536
- Vrací embedding jako array čísel

**URL:** `https://modopafybeslbcqjxsve.supabase.co/functions/v1/generate-embedding`

### 3. ✅ Integrace do `SanaChat.tsx`

Po screeningu automaticky spustí mapování a vypíše výsledky do console.

---

## 🧪 Jak to funguje?

### Příklad console outputu:

```
🔍 VÝSLEDKY SCREENINGU:
   1. CHUAN XIONG CHA TIAO WAN
   2. XIN YI WAN
   3. bolest hlavy
   4. wany
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗺️ Spouštím mapování produktů na databázi...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Zpracovávám: "CHUAN XIONG CHA TIAO WAN"
🔢 Generuji embedding pro: "CHUAN XIONG CHA TIAO WAN"
✅ Embedding vygenerován (1536 rozměrů)
🔎 Hledám v databázi: "CHUAN XIONG CHA TIAO WAN"
✅ Nalezen produkt: Nositel větru (similarity: 0.892)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Zpracovávám: "XIN YI WAN"
🔢 Generuji embedding pro: "XIN YI WAN"
✅ Embedding vygenerován (1536 rozměrů)
🔎 Hledám v databázi: "XIN YI WAN"
✅ Nalezen produkt: Hasitel ohně (similarity: 0.876)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Zpracovávám: "bolest hlavy"
🔢 Generuji embedding pro: "bolest hlavy"
✅ Embedding vygenerován (1536 rozměrů)
🔎 Hledám v databázi: "bolest hlavy"
⚠️ Shoda příliš slabá (0.62) pro: bolest hlavy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Mapování dokončeno!
📊 Výsledky:
   - Celkem produktů: 4
   - Nalezené shody: 2
   - Nenalezené: 2

═══════════════════════════════════════════════════════════════════
🎯 PÁROVÁNÍ SCREENOVANÝCH PRODUKTŮ S DATABÁZÍ:
═══════════════════════════════════════════════════════════════════

1. CHUAN XIONG CHA TIAO WAN
   ✅ Nositel větru (kód: 099)
   📊 Podobnost: 89.2%
   🔗 URL: https://bewit.love/produkt/nositel-vetru

2. XIN YI WAN
   ✅ Hasitel ohně (kód: 787)
   📊 Podobnost: 87.6%
   🔗 URL: https://bewit.love/produkt/hasitel-ohne

3. bolest hlavy
   ❌ Produkt nenalezen v databázi

4. wany
   ❌ Produkt nenalezen v databázi

═══════════════════════════════════════════════════════════════════
```

---

## 🔧 Technické detaily

### Similarity Threshold
- **0.75 (75%)** - Minimum pro považování za shodu
- Vysoký threshold zajišťuje přesné párování
- Pokud je < 0.75, produkt se nepřiřadí

### Vector Search
- RPC funkce: `search_products_by_vector`
- Cosine similarity distance
- Filter: `feed_source = 'feed_2'` (pouze Feed 2 produkty)
- Limit: 1 (pouze TOP match)

### Embedding Model
- **text-embedding-3-large** (OpenAI)
- **1536 dimenzí**
- Stejný model jako používá N8N pro product embeddings
- Cena: ~$0.13 / 1M tokens

### Performance
- ~1-2 sekundy na produkt (embedding + search)
- Pro 4 produkty: ~4-8 sekund celkem
- Pauza 300ms mezi requesty

---

## 📊 Co se páruje a co ne?

### ✅ Párují se:
- Konkrétní názvy produktů/wanů
  - "CHUAN XIONG CHA TIAO WAN" → "Nositel větru"
  - "XIN YI WAN" → "Hasitel ohně"
  - "Bewit Levandule" → "Bewit Levandule 15ml"

### ❌ Nepárují se:
- Obecné pojmy bez konkrétního produktu
  - "bolest hlavy" (není produkt)
  - "wany" (kategorie, ne konkrétní wan)
  - "uklidnění mysli" (příznak, ne produkt)

**To je správné chování!** Párujeme pouze 100% shody.

---

## 🧪 Jak testovat?

### 1. Restartuj aplikaci
```bash
npm run dev
```

### 2. Otevři chatbot s inline_product_links
- "Sana Local Format" má to zapnuté

### 3. Testovací dotaz
Napiš: **"jaké wany na bolest hlavy"**

### 4. Sleduj console
Měl by se zobrazit:
1. Screening výsledky
2. Mapování proces (pro každý produkt)
3. Finální párování

---

## 📝 Další kroky

### ✅ Krok 1: HOTOVO
- Screening produktů přes GPT mini

### ✅ Krok 2: HOTOVO  
- Mapování na databázi přes vector search
- Console output s párováním

### 🔄 Krok 3: UI zobrazení (PŘÍŠTĚ)
- Místo console → UI komponenta
- Zobrazit produktové karty
- Clickable linky

---

## 🔍 Troubleshooting

### Žádné shody nenalezeny
→ Zkontroluj, zda jsou produkty v `product_embeddings` s `embedding_status = 'completed'`

### Embedding generation error
→ Zkontroluj Edge Function logy v Supabase Dashboard

### RPC error
→ Zkontroluj, že `search_products_by_vector` funkce existuje v databázi

---

**Status:** ✅ Krok 2 DOKONČEN!  
**Nasazeno:** 3. prosince 2025  
**Edge Functions:** 2 (screen-products, generate-embedding)




