# 🚀 Nasazení opravy HTML entit pro Feed 2

## 📋 Přehled

Tento návod popisuje kroky pro nasazení opravy HTML entit v Product Feed 2.

**Problém:** Produkt 2233 měl název `001 - Rozpt&#xFD;len&#xED; v&#x11B;tru` místo `001 - Rozptýlení větru`

**Řešení:** Oprava dekódování HTML entit v Edge Function `sync-feed-2`

---

## 🔧 Kroky nasazení

### 1. Deploy Edge Function

```bash
cd /Users/petrhajduk/Documents/Code/Bewit/Manazer\ Knih/app

# Deploy opravené Edge Function
npx supabase functions deploy sync-feed-2
```

**Očekávaný výstup:**
```
✓ Deployed function sync-feed-2 to project xxxxx
```

---

### 2. Vyčistit stará data

Spusťte SQL skript v Supabase SQL Editor:

```bash
# Otevřete soubor clean_feed_2_and_resync.sql
# Zkopírujte KROK 3 a KROK 4 a spusťte v Supabase
```

**Nebo přímo z terminálu (pokud máte Supabase CLI):**

```bash
# Vymazat embeddings
npx supabase db execute "DELETE FROM product_embeddings WHERE feed_source = 'feed_2';"

# Vymazat produkty
npx supabase db execute "DELETE FROM product_feed_2;"
```

---

### 3. Spustit synchronizaci

**Varianta A: Manuálně přes curl**

```bash
# Získejte anon key z Supabase Dashboard -> Settings -> API
# Získejte project URL z Supabase Dashboard

curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-feed-2" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Varianta B: Přes Supabase Dashboard**

1. Jděte do Supabase Dashboard
2. Database -> Functions -> `sync-feed-2`
3. Klikněte na "Invoke function"

**Varianta C: Počkejte na cron job**

Cron job běží automaticky každou hodinu (viz `setup_cron_feed_2.sql`)

---

### 4. Ověření úspěšnosti

#### A) Kontrola sync logů

```sql
SELECT 
  sync_type,
  status,
  records_processed,
  records_inserted,
  records_updated,
  started_at,
  finished_at
FROM sync_logs
WHERE sync_type = 'product_feed_2'
ORDER BY started_at DESC
LIMIT 1;
```

**Očekávaný výsledek:**
- `status`: `success`
- `records_processed`: > 0
- `records_inserted`: počet produktů

---

#### B) Kontrola produktu 2233

```sql
SELECT 
  product_code,
  product_name,
  description_short,
  category,
  price,
  url
FROM product_feed_2
WHERE product_code = '2233';
```

**Očekávaný výsledek:**
- `product_name`: `001 - Rozptýlení větru` ✅ (NE `001 - Rozpt&#xFD;len&#xED; v&#x11B;tru` ❌)

---

#### C) Kontrola HTML entit

```sql
-- Tento dotaz by měl vrátit 0 řádků
SELECT 
  product_code,
  product_name
FROM product_feed_2
WHERE 
  product_name LIKE '%&#x%' 
  OR product_name LIKE '%&#%'
  OR description_short LIKE '%&#x%'
  OR description_short LIKE '%&#%'
  OR description_long LIKE '%&#x%'
  OR description_long LIKE '%&#%';
```

**Očekávaný výsledek:** 0 řádků

---

#### D) Kontrola celkového stavu

```sql
SELECT 
  COUNT(*) as celkem_produktu,
  COUNT(*) FILTER (WHERE sync_status = 'success') as uspesne_synced,
  COUNT(*) FILTER (WHERE sync_status = 'error') as chyby,
  MIN(last_sync_at) as prvni_sync,
  MAX(last_sync_at) as posledni_sync
FROM product_feed_2;
```

---

#### E) Kontrola embeddings

```sql
-- Počkejte 5-10 minut po synchronizaci, než n8n vytvoří embeddings
SELECT 
  COUNT(*) as celkem_embeddings,
  COUNT(DISTINCT product_code) as unikatnich_produktu
FROM product_embeddings
WHERE feed_source = 'feed_2';
```

**Poznámka:** Embeddings se vytvářejí asynchronně přes n8n webhook, může to trvat několik minut.

---

## 🐛 Troubleshooting

### Problém: Edge Function selhává

**Řešení:**
```bash
# Zkontrolujte logs
npx supabase functions logs sync-feed-2

# Nebo v Dashboard: Edge Functions -> sync-feed-2 -> Logs
```

---

### Problém: Stále vidím HTML entity

**Možné příčiny:**
1. Edge Function nebyla nasazena (zkontrolujte deploy)
2. Stará data nebyla vymazána (spusťte clean_feed_2_and_resync.sql)
3. Synchronizace ještě neproběhla (spusťte manuálně)

**Řešení:**
```bash
# 1. Ověřte, že je nasazena nová verze
npx supabase functions list

# 2. Vymažte data
# (spusťte clean_feed_2_and_resync.sql v SQL Editoru)

# 3. Spusťte sync znovu
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-feed-2" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

### Problém: Embeddings se nevytvářejí

**Řešení:**
1. Zkontrolujte n8n workflow
2. Zkontrolujte Edge Function logs
3. Zkontrolujte, že n8n webhook běží

```bash
# Test n8n webhook
curl -X POST "https://n8n.srv980546.hstgr.cloud/webhook/3890ccdd-d09f-461b-b409-660d477023a3" \
  -H "Content-Type: application/json" \
  -d '{
    "product_code": "TEST-001",
    "product_name": "Test produkt",
    "description_short": "Krátký popis",
    "description_long": "Dlouhý popis",
    "feed_source": "feed_2"
  }'
```

---

## 📝 Změněné soubory

```
✅ supabase/functions/sync-feed-2/index.ts - Oprava dekódování HTML entit
📄 FEED_2_HTML_ENTITIES_FIX.md - Dokumentace opravy
📄 clean_feed_2_and_resync.sql - SQL skript pro vyčištění
📄 DEPLOY_FEED_2_FIX.md - Tento deployment guide
```

---

## ✅ Checklist

- [ ] Deploy Edge Function `sync-feed-2`
- [ ] Vymazat stará data (embeddings + produkty)
- [ ] Spustit synchronizaci
- [ ] Ověřit produkt 2233 má správné znaky
- [ ] Ověřit, že nejsou žádné HTML entity v databázi
- [ ] Počkat 5-10 minut a ověřit embeddings
- [ ] Otestovat vyhledávání v chatbotu

---

## 🎯 Výsledek

Po úspěšném nasazení:

✅ Všechny české znaky jsou správně
✅ Produkt 2233: `001 - Rozptýlení větru`
✅ Žádné HTML entity v databázi
✅ Embeddings vytvořeny pro všechny produkty
✅ Vyhledávání v chatbotu funguje správně

---

## 📞 Kontakt

Pokud máte problémy s nasazením, zkontrolujte:
1. Edge Function logs
2. Sync logs v tabulce `sync_logs`
3. N8N workflow logs
4. Tento deployment guide znovu

