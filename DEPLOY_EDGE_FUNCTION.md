# 🚀 Deploy Edge Funkce pro Update Chatbot Settings

## ✅ Co bylo změněno

Místo použití `service_role_key` na frontendu jsem vytvořil **edge funkci**, která běží na Supabase serveru a má bezpečný přístup k `SB_SERVICE_ROLE_KEY`.

## 📁 Nové soubory

1. **`supabase/functions/update-chatbot-settings/index.ts`** - Edge funkce pro UPDATE
2. **`supabase/functions/_shared/cors.ts`** - Sdílený CORS helper

## 🚀 Deployment (2 kroky)

### Krok 1: Deploy edge funkci

```bash
# V root složce projektu
cd /Users/petrhajduk/Documents/Code/Bewit/Manazer\ Knih/app

# Deploy funkce do Supabase
npx supabase functions deploy update-chatbot-settings
```

### Krok 2: Ověř environment proměnné

Edge funkce potřebuje tyto environment variables (měly by už být nastavené):

```bash
# Zkontroluj v Supabase Dashboard → Edge Functions → Secrets
SB_URL=https://modopafybeslbcqjxsve.supabase.co
SB_SERVICE_ROLE_KEY=tvůj_service_role_key
```

Pokud nejsou nastavené, nastav je:

```bash
npx supabase secrets set SB_URL=https://modopafybeslbcqjxsve.supabase.co
npx supabase secrets set SB_SERVICE_ROLE_KEY=tvůj_service_role_key
```

## ✅ Po deployi

1. Edge funkce běží na: `https://modopafybeslbcqjxsve.supabase.co/functions/v1/update-chatbot-settings`
2. Frontend volá tuto edge funkci místo přímého UPDATE
3. Edge funkce používá `SB_SERVICE_ROLE_KEY` pro obejití RLS
4. **Žádný service_role_key na frontendu!** ✅

## 🧪 Test

Zkus uložit nastavení chatbota. V console uvidíš:

```
🔍 Aktualizuji chatbota s ID: "sana_chat" přes edge funkci
✅ UPDATE proběhl úspěšně přes edge funkci
✅ Nastavení úspěšně uloženo
```

## 📊 Flow

```
Frontend (ChatbotManagement)
  ↓
ChatbotSettingsService.updateChatbotSettings()
  ↓ fetch()
Edge Function (update-chatbot-settings)
  ↓ používá SB_SERVICE_ROLE_KEY
Supabase Database (chatbot_settings)
  ↓
✅ UPDATE úspěšný (obchází RLS)
```

## 🔧 Co dělá edge funkce

1. Přijme request z frontendu s `chatbot_id` a `updates`
2. Ověří, že chatbot existuje
3. Provede UPDATE pomocí `service_role_key` (obchází RLS)
4. Vrátí aktualizovaná data

## 📝 Změny v kódu

### Před (❌ service_role_key na frontendu):
```typescript
// BAD: service_role_key v browseru
const supabaseAdmin = createClient(url, serviceRoleKey);
await supabaseAdmin.from('chatbot_settings').update(...);
```

### Po (✅ edge funkce):
```typescript
// GOOD: volání edge funkce
const response = await fetch(EDGE_FUNCTION_URL, {
  method: 'POST',
  body: JSON.stringify({ chatbot_id, updates })
});
```

## 🔐 Bezpečnost

✅ **service_role_key** je pouze na Supabase serveru (v Secrets)  
✅ Frontend volá edge funkci přes HTTPS  
✅ Edge funkce ověřuje existenci chatbota před UPDATE  
✅ Žádné citlivé klíče v browser kódu

## 🐛 Troubleshooting

### Edge funkce vrací 404
**Příčina:** Funkce nebyla deploynutá

**Řešení:**
```bash
npx supabase functions deploy update-chatbot-settings
```

### Edge funkce vrací 500
**Příčina:** Chybí `SB_SERVICE_ROLE_KEY` v Secrets

**Řešení:**
```bash
npx supabase secrets set SB_SERVICE_ROLE_KEY=tvůj_klíč
```

### CORS error
**Příčina:** Chybí CORS headers

**Řešení:** Edge funkce už má CORS headers, ale zkus hard refresh (Ctrl+Shift+R)

## 📚 Související soubory

- **Edge funkce:** `supabase/functions/update-chatbot-settings/index.ts`
- **Service:** `src/services/chatbotSettingsService.ts`
- **CORS helper:** `supabase/functions/_shared/cors.ts`

---

**Vytvořeno:** 2025-11-26  
**Status:** ✅ Ready to deploy

