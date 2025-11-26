# Feed 2 - Embedding Status (Jednoduché řešení na frontendu)

## Přehled

Tento dokument popisuje jednoduché řešení pro sledování stavu embeddingu u produktů z Feed 2. **Vše se řeší na frontendu, žádné edge funkce, žádné komplikované věci.**

## Jak to funguje

### 1. Databáze - nové sloupce v tabulce `product_feed_2`

Do tabulky `product_feed_2` byly přidány 2 nové sloupce:
- `embedding_status` - VARCHAR(50) - stav embeddingu (`none`, `pending`, `processing`, `completed`, `error`)
- `embedding_generated_at` - TIMESTAMPTZ - datum a čas vytvoření embeddingu

**Migrace:** `add_embedding_status_to_feed_2.sql`

### 2. Frontend - komponenta ProductEmbeddingManagerFeed2

Komponenta byla upravena tak, že:

#### Načítání produktů
- Načítá produkty přímo z tabulky `product_feed_2`
- Status embeddingu se načítá přímo z nového sloupce `embedding_status`
- Žádné JOINy s tabulkou `product_embeddings`
- Jednoduché a rychlé

```typescript
const { data: productsData } = await supabase
  .from('product_feed_2')
  .select('id, product_code, product_name, ..., embedding_status, embedding_generated_at')
  .order('product_name');
```

#### Aktualizace statusu po úspěšném embeddingu
Po úspěšném odeslání na n8n webhook se automaticky aktualizuje status v databázi:

```typescript
// Po úspěšném volání n8n
await supabase
  .from('product_feed_2')
  .update({ 
    embedding_status: 'completed',
    embedding_generated_at: new Date().toISOString()
  })
  .in('product_code', productCodes);

// Obnov seznam produktů, aby se zobrazil nový status
await loadProducts();
```

### 3. Workflow

1. **Uživatel vybere produkty** v komponentě `ProductEmbeddingManagerFeed2`
2. **Klikne na "Spustit N8N Embedding"**
3. **Frontend odešle produkty na n8n webhook**
4. **N8n vytvoří embeddings** (asynchronně)
5. **Frontend rovnou aktualizuje status** na `completed` v tabulce `product_feed_2`
6. **Seznam produktů se obnoví** a zobrazí aktuální status

## Výhody tohoto řešení

✅ **Jednoduché** - vše na frontendu, žádné edge funkce  
✅ **Rychlé** - status se zobrazí okamžitě po úspěšném volání n8n  
✅ **Bez JOINů** - všechna data v jedné tabulce  
✅ **Přehledné** - uživatel okamžitě vidí, které produkty mají embedding  
✅ **Žádné komplikované věci** - žádné webhooky zpět, žádné callback funkce  

## Filtry v UI

Uživatel může filtrovat produkty podle statusu:
- **Všechny** (`all`)
- **Bez embeddingu** (`no_embedding`)
- **S embeddingem** (`has_embedding`)
- **Hotovo** (`completed`)
- **Zpracovává se** (`processing`)
- **Čeká** (`pending`)
- **Chyba** (`error`)

## Spuštění

### 1. Aplikuj SQL migraci
```bash
# V Supabase SQL Editor spusť:
add_embedding_status_to_feed_2.sql
```

### 2. Frontend automaticky používá nové sloupce
```bash
# Žádná akce potřeba, komponenta je již upravená
```

### 3. Testování
1. Otevři komponentu "Spravovat Embeddings Feed 2"
2. Vyber produkty
3. Klikni na "Spustit N8N Embedding"
4. Po úspěšném volání se automaticky zobrazí status `completed` ✅

## Poznámky

- **N8n webhook** zůstává stejný, nic se tam nemusí měnit
- **Status se nastavuje optimisticky** - hned po úspěšném HTTP volání
- Pokud by bylo potřeba kontrolovat, zda n8n opravdu vytvořil embedding, bylo by nutné přidat callback webhook (ale to nechceme - máme to jednoduché!)

## Soubory

- `add_embedding_status_to_feed_2.sql` - SQL migrace pro přidání sloupců
- `src/components/ProductEmbeddingManagerFeed2.tsx` - upravená komponenta
- `FEED_2_EMBEDDING_STATUS.md` - tento soubor

---

**Autor:** Petr Hajduk  
**Datum:** 25. listopadu 2025  
**Verze:** 1.0 - Jednoduché řešení bez edge funkcí




