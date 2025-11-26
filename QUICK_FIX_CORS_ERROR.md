# ⚡ QUICK FIX: CORS Error - Edge Function

## ❌ Chyba

```
Access to fetch at 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/update-chatbot-settings' 
from origin 'http://localhost:5176' has been blocked by CORS policy
```

## ✅ Řešení (Vyber jedno)

### Varianta A: Deploy Edge Function (doporučeno pro produkci)

```bash
# V root složce projektu
npx supabase functions deploy update-chatbot-settings --project-ref modopafybeslbcqjxsve
```

**Nebo použij připravený script:**
```bash
chmod +x deploy-edge-function.sh
./deploy-edge-function.sh
```

### Varianta B: Použij RLS Fallback (rychlé řešení pro development)

Edge funkce není dostupná, ale kód už má **fallback** který používá běžný Supabase klient.

**Krok 1:** Spusť SQL v Supabase pro opravu RLS politik:

```sql
-- Odstraň staré politiky
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow insert access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow update access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow delete access to chatbot_settings" ON public.chatbot_settings;

-- Vytvoř nové politiky s plným přístupem
CREATE POLICY "chatbot_settings_select_all" ON public.chatbot_settings FOR SELECT USING (true);
CREATE POLICY "chatbot_settings_insert_all" ON public.chatbot_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "chatbot_settings_update_all" ON public.chatbot_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chatbot_settings_delete_all" ON public.chatbot_settings FOR DELETE USING (true);
```

**Krok 2:** Refresh aplikaci (F5)

**Krok 3:** Zkus znovu uložit nastavení

## 🔍 Co se stane

### S Edge Function (Varianta A):
```
Frontend → Edge Function (SB_SERVICE_ROLE_KEY) → Database
```

### S RLS Fallback (Varianta B):
```
Frontend → Supabase Client (anon key + RLS) → Database
```

## 📊 Console Log

### Když edge funkce funguje:
```
📡 Zkouším edge funkci...
✅ UPDATE proběhl úspěšně přes edge funkci
```

### Když použije fallback:
```
📡 Zkouším edge funkci...
⚠️ Edge funkce není dostupná, zkouším fallback...
🔄 Fallback: Používám běžný Supabase klient s RLS...
✅ UPDATE proběhl úspěšně přes fallback (RLS)
```

## 🎯 Doporučení

- **Development:** Použij Variantu B (RLS fallback) - rychlé, bez edge funkce
- **Production:** Použij Variantu A (Edge function) - bezpečnější, service_role_key na serveru

## 🐛 Troubleshooting

### Edge function deployment selhal

**Příčina:** Nejsi přihlášený do Supabase CLI

**Řešení:**
```bash
npx supabase login
npx supabase functions deploy update-chatbot-settings --project-ref modopafybeslbcqjxsve
```

### RLS fallback taky nefunguje

**Příčina:** RLS politiky nepovolují UPDATE

**Řešení:** Spusť `QUICK_FIX_RLS.sql` v Supabase SQL Editoru

### Stále CORS error

**Příčina:** Browser cache

**Řešení:**
1. Hard refresh (Ctrl+Shift+R)
2. Vyčisti cache
3. Restart dev serveru

## 📁 Soubory

- **Edge funkce:** `supabase/functions/update-chatbot-settings/index.ts`
- **Deploy script:** `deploy-edge-function.sh`
- **Service s fallback:** `src/services/chatbotSettingsService.ts`
- **RLS fix:** `QUICK_FIX_RLS.sql`

---

**Vytvořeno:** 2025-11-26  
**Status:** ✅ Fallback už funguje, edge funkce je optional

