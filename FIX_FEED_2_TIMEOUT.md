# 🔧 Fix: Feed 2 Synchronizace - Timeout & CORS Error

## ❌ Problém

Při manuální synchronizaci Feed 2 se objevují chyby:
- **504 Gateway Timeout** - Edge funkce trvá příliš dlouho (40s čekání + stahování)
- **CORS Error** - Kvůli timeoutu se CORS headers nevrací správně

```
Access to fetch at 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-feed-2' 
from origin 'http://localhost:5173' has been blocked by CORS policy
POST https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-feed-2 net::ERR_FAILED 504
```

## ✅ Řešení: Asynchronní Zpracování

Edge funkce byla upravena, aby:
1. **Okamžitě vrátila odpověď** (< 1 sekunda)
2. **Spustila synchronizaci na pozadí**
3. **Frontend pravidelně kontroluje stav** v tabulce `sync_logs`

### Co bylo změněno

#### 1. Edge Function (`supabase/functions/sync-feed-2/index.ts`)

**PŘED:**
```typescript
Deno.serve(async (req) => {
  // Vytvoří sync log
  // ⏳ Čeká 40 sekund
  // Stáhne feed (5-10 sekund)
  // Zpracuje produkty (20-30 sekund)
  // Vrátí výsledek ← TIMEOUT zde!
});
```

**PO:**
```typescript
// Nová background funkce
async function performSyncInBackground(logId: number, supabase: any) {
  // ⏳ Čeká 40 sekund
  // Stáhne feed
  // Zpracuje produkty
  // Aktualizuje sync_logs
}

Deno.serve(async (req) => {
  // Vytvoří sync log
  const { data: log } = await supabase.from("sync_logs").insert({...});
  
  // Spustí background proces
  performSyncInBackground(log.id, supabase).catch(err => console.error(err));
  
  // Okamžitě vrátí odpověď ✅
  return new Response(JSON.stringify({
    ok: true,
    message: "Synchronizace spuštěna na pozadí",
    logId: log.id,
    status: "running"
  }));
});
```

#### 2. Frontend (`src/components/SanaChat/ProductSync.tsx`)

**Přidán polling mechanismus:**

```typescript
const handleManualSyncFeed2 = async () => {
  // Spustí synchronizaci
  const success = await syncProductsFeed2();
  
  if (success) {
    alert('Synchronizace byla spuštěna na pozadí');
    
    // Polling každých 5 sekund
    const pollInterval = setInterval(async () => {
      await loadSyncStatusFeed2();
      
      // Kontrola stavu
      const { data: latestLog } = await supabaseClient
        .from('sync_logs')
        .eq('sync_type', 'product_feed_2')
        .order('started_at', { ascending: false })
        .single();
      
      if (latestLog && latestLog.status !== 'running') {
        clearInterval(pollInterval);
        // Zobrazí výsledek
      }
    }, 5000);
  }
};
```

**UI zobrazuje:**
- ⏳ **Běží** - Žlutý box s "Status: ⏳ Běží"
- ✅ **Úspěch** - Zelený box se statistikami
- ❌ **Chyba** - Červený box s chybovou zprávou

## 🚀 Nasazení

### Varianta A: Přes Supabase CLI (doporučeno)

```bash
# 1. Přihlaste se do Supabase
npx supabase login

# 2. Deploy funkce
npx supabase functions deploy sync-feed-2 --project-ref modopafybeslbcqjxsve
```

### Varianta B: Přes Supabase Dashboard (jednodušší)

1. Otevřete [Supabase Dashboard](https://supabase.com/dashboard/project/modopafybeslbcqjxsve)
2. Jděte na **Edge Functions**
3. Klikněte na **sync-feed-2** (pokud existuje) nebo **New Function**
4. Zkopírujte obsah souboru `supabase/functions/sync-feed-2/index.ts`
5. Vložte do editoru
6. Klikněte **Deploy**

### Varianta C: Použití existující funkce

Pokud funkce už je nasazená, **není třeba nic dělat**. Změny se projeví při příštím deployi.

## 📊 Testování

### 1. Test Edge Funkce

```bash
# Direct test (vrátí okamžitě)
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-feed-2 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Očekávaný výstup (< 1 sekunda):
{
  "ok": true,
  "message": "Synchronizace Feed 2 byla spuštěna na pozadí",
  "logId": 123,
  "status": "running"
}
```

### 2. Kontrola Průběhu Synchronizace

```sql
-- Kontrola stavu v databázi
SELECT 
  id,
  sync_type,
  status,
  started_at,
  finished_at,
  records_processed,
  records_inserted,
  records_updated,
  error_message
FROM sync_logs 
WHERE sync_type = 'product_feed_2'
ORDER BY started_at DESC 
LIMIT 5;
```

**Stavy:**
- `running` - Synchronizace právě běží
- `success` - Synchronizace dokončena úspěšně
- `error` - Synchronizace selhala

### 3. Test v UI

1. Přihlaste se jako admin
2. Jděte na **Správa chatbotů** > **Produktový feed**
3. Vyberte tab **Feed 2 - Product Feed 2**
4. Klikněte **🔄 Synchronizovat Feed 2 nyní**

**Očekávané chování:**
1. Okamžitě se zobrazí alert: "Synchronizace byla spuštěna na pozadí"
2. Status box se změní na žlutý s "⏳ Běží"
3. Každých 5 sekund se aktualizuje status
4. Po ~60-90 sekundách se zobrazí:
   - ✅ Zelený box s "Status: ✅ Úspěch"
   - Statistiky: Zpracováno, Vloženo, Aktualizováno

## 🔍 Monitoring Edge Function

### Sledování Logů v Reálném Čase

1. **Supabase Dashboard** > **Edge Functions** > **sync-feed-2** > **Logs**
2. Hledejte tyto zprávy:

```
⏳ Čekám 40 sekund, než začnu stahovat feed...
🔄 Začínám stahovat feed z: https://bewit.love/feed/bewit
⏱️ Stahování feedu trvalo: 5.23s
✅ Feed stažen, velikost: 1234567 znaků
📊 XML parsováno, hledám ITEM elementy...
📦 Nalezeno 1490 produktů
🔄 Zpracovávám dávku 1/30 (50 produktů)
✅ Dávka uložena: 50 produktů
...
✅ Synchronizace Product Feed 2 dokončena!
📊 Zpracováno: 1490
```

### Edge Function Performance

- **Okamžitá odpověď:** < 1 sekunda
- **Celková synchronizace:** 60-90 sekund (na pozadí)
- **Breakdown:**
  - ⏳ Čekání na feed: 40s
  - 📥 Stahování: 5-10s
  - 📊 Parsování: 2-3s
  - 💾 Uložení: 20-30s

## 🐛 Troubleshooting

### Edge Funkce Neodpovídá

**Symptom:** Timeout i po změnách

**Řešení:**
1. Zkontrolujte, že funkce byla nasazena: Dashboard > Edge Functions > sync-feed-2 > Deployments
2. Podívejte se na logy: Edge Functions > sync-feed-2 > Logs
3. Zkontrolujte ENV variables:
   - `SB_URL` - ✅ Automaticky nastaveno
   - `SB_SERVICE_ROLE_KEY` - ✅ Automaticky nastaveno

### Frontend Zobrazuje "Běží" Navždy

**Symptom:** Status zůstává "⏳ Běží" i po 5 minutách

**Řešení:**
1. Zkontrolujte sync_logs v databázi:
   ```sql
   SELECT * FROM sync_logs WHERE sync_type = 'product_feed_2' ORDER BY started_at DESC LIMIT 1;
   ```
2. Pokud je status `running` dlouho, Edge funkce crashla:
   - Podívejte se do Edge Function Logs
   - Hledejte error messages
3. Pokud je status `error`, zkontrolujte `error_message` sloupec

### Synchronizace Selhává

**Symptom:** Status = `error` s chybovou zprávou

**Možné příčiny:**
1. **Feed nedostupný** - `HTTP 503` při stahování
   - Zkontrolujte: `https://bewit.love/feed/bewit?auth=xr32PRbrs554K`
   
2. **XML parsing error** - "Žádné ITEM elementy"
   - Feed se možná nevygeneroval včas
   - Zkuste zvýšit čekací dobu v edge funkci (řádek 140)

3. **Database error** - RPC funkce chybí
   - Zkontrolujte, že existuje: `upsert_product_feed_2_preserve_embedding`
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'upsert_product_feed_2_preserve_embedding';
   ```

### Polling Nefunguje

**Symptom:** UI se neaktualizuje automaticky

**Řešení:**
1. Refresh stránku (F5)
2. Zkontrolujte Browser Console pro JavaScript errors
3. Ověřte, že máte nejnovější verzi `ProductSync.tsx`

## 📝 Závěr

Tento fix řeší fundamentální problém s timeoutem dlouho běžících Edge funkcí tím, že:
1. ✅ Edge funkce vrací okamžitou odpověď
2. ✅ Dlouhá synchronizace běží na pozadí
3. ✅ Frontend aktivně kontroluje stav
4. ✅ Uživatel vidí real-time progress

**Žádné CORS errory**, **žádné timeouty**, **smooth UX**!

---

**Vytvořeno:** 13. ledna 2026  
**Status:** ✅ Ready to Deploy  
**Autor:** AI Assistant
