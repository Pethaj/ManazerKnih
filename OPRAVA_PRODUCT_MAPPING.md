# ✅ OPRAVA: Product Mapping nyní hledá v `product_documents`

## 🐛 Problém

Při testování inline product recommendations se ukázalo, že mapování produktů nefungovalo správně.

**Symptom:**
```
1. Xiao Qing Long Wan
   ❌ Produkt nenalezen v databázi
```

**Důvod:**
- Služba `productMappingService.ts` volala `search_products_by_vector`
- Tato funkce hledá v tabulce `product_embeddings`
- Ale produkt "Xiao Qing Long Wan" (ID 79) je v tabulce `product_documents`!

## ✅ Řešení

### 1. Změna RPC funkce

**PŘED:**
```typescript
const { data, error } = await supabase.rpc('search_products_by_vector', {
  query_embedding: embedding,
  similarity_threshold: SIMILARITY_THRESHOLD,
  max_results: 1,
  filter_feed_source: 'feed_2'
});
```

**PO:**
```typescript
const { data, error } = await supabase.rpc('match_product_documents', {
  query_embedding: embedding,
  match_count: 1,
  filter: {}
});
```

### 2. Získání product_code z metadat

`product_documents` má strukturu:
```typescript
{
  id: number,
  content: string,     // Text produktu
  metadata: {
    "Produkt ID": "2324",  // ⭐ Product code je zde!
    "Kategorie": "TČM - Tradiční čínská medicína",
    ...
  },
  embedding: vector
}
```

**Nový kód:**
```typescript
const productId = topMatch.metadata?.['Produkt ID'];

if (!productId) {
  console.log(`⚠️ Match nalezen, ale chybí "Produkt ID" v metadatech`);
  return null;
}
```

### 3. Načtení metadat z product_feed_2

```typescript
const { data: feed2Data, error: feed2Error } = await supabase
  .from('product_feed_2')
  .select('product_code, product_name, url, thumbnail')
  .eq('product_code', productId)
  .single();

if (feed2Error || !feed2Data) {
  console.warn(`⚠️ Produkt ID ${productId} nenalezen v product_feed_2`);
  return null;
}
```

## 📊 Výsledek

### Očekávaný console output:

```
🔍 VÝSLEDKY SCREENINGU:
   1. Xiao Qing Long Wan
   2. CHUAN XIONG CHA TIAO WAN
   3. XIN YI WAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗺️ Spouštím mapování produktů na databázi...

🔎 Hledám v databázi: "Xiao Qing Long Wan"
🔢 Generuji embedding...
✅ Embedding vygenerován (1536 rozměrů)
✅ Nalezen match v product_documents (similarity: 0.892)
   📄 Content preview: 001 - Rozptýlení větru...
   🆔 Produkt ID: 2324
✅ Nalezen produkt: 001 - Rozptýlení větru (kód: 2324)

═══════════════════════════════════════════════════════════════════
🎯 PÁROVÁNÍ SCREENOVANÝCH PRODUKTŮ S DATABÁZÍ:
═══════════════════════════════════════════════════════════════════

1. Xiao Qing Long Wan
   ✅ 001 - Rozptýlení větru (kód: 2324)
   📊 Podobnost: 89.2%
   🔗 URL: https://bewit.love/produkt/001-rozptyleni-vetru

2. CHUAN XIONG CHA TIAO WAN
   ✅ Nositel větru (kód: 099)
   📊 Podobnost: 87.6%
   🔗 URL: https://bewit.love/produkt/nositel-vetru

3. XIN YI WAN
   ✅ Hasitel ohně (kód: 787)
   📊 Podobnost: 86.4%
   🔗 URL: https://bewit.love/produkt/hasitel-ohne

═══════════════════════════════════════════════════════════════════
```

## 🧪 Testování

### 1. Restartuj aplikaci
```bash
npm run dev
```

### 2. Otevři chatbot
- Chatbot: "Sana Local Format"
- Zapni: "Inline produktové linky"

### 3. Testovací dotazy

**Test 1: Konkrétní produkty**
```
"Jaké wany doporučujete na bolest hlavy?"
```

**Test 2: Obecná témata**
```
"Mám problémy se spánkem, co byste doporučili?"
```

**Test 3: Tradiční názvy**
```
"Hledám Xiao Qing Long Wan a Chuan Xiong Cha Tiao Wan"
```

### 4. Ověření v console

Měl bys vidět:
1. ✅ Screening dokončen (seznam produktů)
2. ✅ Mapování zahájeno
3. ✅ Pro každý produkt: embedding → match → načtení z feed_2
4. ✅ Finální přehled s párovánímproduktů

## 📁 Upravené soubory

- `src/services/productMappingService.ts` - Hlavní změny v `findMatchingProduct()`

## 🔗 Související dokumentace

- `PRODUCT_MAPPING_IMPLEMENTATION.md` - Kompletní implementace
- `FINAL_SUMMARY_EDGE_FUNCTION.md` - Edge Functions dokumentace
- `PRODUCT_CHAT_IMPLEMENTATION.md` - Jak funguje product_documents

---

**✅ OPRAVA DOKONČENA** - Product mapping nyní správně hledá v `product_documents`!

**Datum opravy**: 3. prosince 2024  
**Testováno**: ❌ Ne (čeká na uživatele)


