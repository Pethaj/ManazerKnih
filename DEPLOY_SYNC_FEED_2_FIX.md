# 🚀 Nasazení Opravy sync-feed-2

## ⚡ Rychlý Postup (Supabase Dashboard)

### Krok 1: Zkopírujte Kód Edge Funkce

Otevřete soubor: `supabase/functions/sync-feed-2/index.ts`

Nebo použijte tento příkaz:
```bash
cat "supabase/functions/sync-feed-2/index.ts" | pbcopy
```

### Krok 2: Nasaďte přes Dashboard

1. Otevřete: https://supabase.com/dashboard/project/modopafybeslbcqjxsve/functions
2. Najděte funkci **sync-feed-2** v seznamu
3. Klikněte na funkci
4. Klikněte **Edit**
5. **Vymažte starý kód** a vložte nový
6. Klikněte **Deploy**

### Krok 3: Ověřte Nasazení

1. Na stránce funkce přejděte na **Deployments**
2. Měli byste vidět nový deployment s časem teď
3. Status: **Active**

### Krok 4: Test

```bash
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-feed-2 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwOTI5NDksImV4cCI6MjA0NzY2ODk0OX0.PHF0T5t9eBEDbXNWcS8cpKz2nAhFRnIVmJl3NrUJv3M" \
  -H "Content-Type: application/json"
```

**Očekávaný výstup:**
```json
{
  "ok": true,
  "message": "Synchronizace Feed 2 byla spuštěna na pozadí",
  "logId": 123,
  "status": "running"
}
```

## 📊 Sledování Synchronizace

### V Supabase Dashboard

1. Jděte na **Table Editor**
2. Otevřete tabulku **sync_logs**
3. Filtrujte: `sync_type = 'product_feed_2'`
4. Seřaďte podle: `started_at DESC`
5. Sledujte sloupec **status**:
   - `running` = Právě běží
   - `success` = Dokončeno
   - `error` = Chyba

### Časy

- **Okamžitá odpověď:** < 1s
- **Celková synchronizace:** 60-90s

## 🎯 Co Se Změnilo

### PŘED (problém)
```
Frontend → Edge Function → (čeká 40s + stahuje + zpracovává) → TIMEOUT! 504 ❌
```

### PO (opraveno)
```
Frontend → Edge Function → Okamžitě odpověď ✅
                        ↓
                   Background process (40s + stahování + zpracování)
                        ↓
                   Aktualizace sync_logs
                        ↑
Frontend ← Poll každých 5s ← Kontrola stavu
```

## ✅ Hotovo!

Po nasazení můžete:
1. Jít do UI aplikace
2. **Správa chatbotů** > **Produktový feed** > **Feed 2**
3. Kliknout **🔄 Synchronizovat Feed 2 nyní**
4. Sledovat progress bar

Synchronizace už nebude timeoutovat! 🎉

---

**Pro pokročilé uživatele:**

```bash
# Přes CLI (vyžaduje přihlášení)
npx supabase login
npx supabase functions deploy sync-feed-2 --project-ref modopafybeslbcqjxsve
```
