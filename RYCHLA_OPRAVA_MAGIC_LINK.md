# ⚡ Rychlá oprava Magic Link - "Nedostupná stránka"

## 🔴 Problém

Magic link vede na Supabase backend místo na vaši aplikaci → Error 404

## ✅ Řešení (5 minut)

### 1. Nastavte Redirect URLs v Supabase (2 min)

1. **Otevřete:** https://supabase.com/dashboard/project/modopafybeslbcqjxsve/auth/url-configuration

2. **V sekci "Redirect URLs" přidejte:**
   ```
   http://localhost:3000
   http://localhost:5173
   ```

3. **Klikněte "Save"**

### 2. Kód již opraven ✅

Soubor `src/services/authService.ts` byl automaticky aktualizován.

## 🧪 Test

### Z aplikace (DOPORUČENO):

1. Spusťte aplikaci: `npm run dev`
2. Otevřete: http://localhost:3000
3. Zadejte email
4. Klikněte: **"Zapomněli jste heslo? Pošleme vám magic link"**
5. Zkontrolujte email a klikněte na odkaz
6. ✅ Měli byste být přihlášeni

### Z Supabase Dashboard (NEDOPORUČENO):

⚠️ **POZOR:** Magic link poslaný z Supabase dashboardu může stále používat starý formát a nemusí fungovat správně.

**Důvod:** Dashboard používá jiný email template a může posílat linky v jiném formátu než vaše aplikace.

## 📝 Co se změnilo

**Před:**
```typescript
await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
        shouldCreateUser: false
    }
});
```

**Po:**
```typescript
await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin // ← Přidáno!
    }
});
```

## 🎯 Jak to funguje

1. Uživatel zadá email v aplikaci
2. Aplikace pošle request s `emailRedirectTo: "http://localhost:3000"`
3. Supabase pošle email s linkem:
   ```
   https://supabase.co/auth/v1/verify?token_hash=xxx&redirect_to=http://localhost:3000
   ```
4. Po kliknutí → Supabase ověří token a přesměruje na vaši aplikaci
5. Aplikace automaticky zpracuje token z URL hash (`detectSessionInUrl: true`)
6. ✅ Uživatel je přihlášen

## 🚨 Pokud to stále nefunguje

### Debug krok 1: Zkontrolujte konzoli

Otevřete DevTools (F12) a spusťte:
```javascript
supabase.auth.getSession().then(console.log)
```

**Očekávaný výstup:**
```json
{
  "data": {
    "session": {
      "access_token": "xxx...",
      "user": { "email": "..." }
    }
  }
}
```

### Debug krok 2: Zkontrolujte URL po přesměrování

Po kliknutí na magic link by URL měla vypadat takto:
```
http://localhost:3000/#access_token=xxx&expires_in=3600&refresh_token=yyy&token_type=bearer&type=magiclink
```

Pokud nevidíte `#access_token=...`, token nebyl správně zpracován.

### Debug krok 3: Zkontrolujte Supabase nastavení

```typescript
// src/lib/supabase.ts - ověřte že máte:
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true, // ← Musí být true!
    flowType: 'pkce'
  }
});
```

## 🏭 Produkce

Před nasazením přidejte produkční URL do Supabase:

1. Přejděte na: Auth → URL Configuration
2. Přidejte: `https://vase-domena.cz`
3. Save

## 📚 Další dokumentace

- **MAGIC_LINK_FIX.md** - Detailní technická dokumentace
- **EMAIL_TEMPLATES_SETUP.md** - Nastavení email šablon
- **NOVA_SPRAVA_UZIVATELU.md** - Celý systém správy uživatelů

---

**Shrnutí:** Problém byl v chybějící redirect URL konfiguraci. Nyní je kód opraven a stačí pouze přidat URL do Supabase dashboardu.



