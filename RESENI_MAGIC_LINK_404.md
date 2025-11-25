# 🔴 ŘEŠENÍ: Magic Link hlásí "nedostupnou stránku"

## Váš problém

```
Magic link z emailu:
https://modopafybeslbcqjxsve.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000

❌ Výsledek: "Nedostupná stránka" (404)
```

## ⚡ Rychlé řešení (3 minuty)

### Krok 1: Kód (✅ UŽ OPRAVENO)

Již jsem opravil soubor `src/services/authService.ts` - přidal jsem `emailRedirectTo: window.location.origin`

### Krok 2: Supabase Dashboard (⚠️ MUSÍTE UDĚLAT VY)

**1. Otevřete tento odkaz:**
```
https://supabase.com/dashboard/project/modopafybeslbcqjxsve/auth/url-configuration
```

**2. Najděte sekci "Redirect URLs"**

**3. Přidejte tyto URL (každou na nový řádek):**
```
http://localhost:3000
http://localhost:5173
```

**4. Klikněte na tlačítko "Save"**

**🎯 To je vše! Bez tohoto kroku to nebude fungovat.**

## 🧪 Test

### Postup testování:

1. **Spusťte aplikaci:**
   ```bash
   npm run dev
   ```

2. **Otevřete v prohlížeči:**
   ```
   http://localhost:3000
   ```

3. **Na přihlašovací stránce:**
   - Zadejte váš email
   - Klikněte na **"Zapomněli jste heslo? Pošleme vám magic link"**

4. **Zkontrolujte email**
   - Měl by přijít email s názvem "Magic Link" nebo "Confirm Your Signup"

5. **Klikněte na odkaz v emailu**
   - Měli byste být automaticky přesměrováni na `http://localhost:3000`
   - A automaticky přihlášeni

6. **✅ Hotovo!**

## ⚠️ DŮLEŽITÉ POZNÁMKY

### ❌ NEPOUŽÍVEJTE Magic Link z Supabase Dashboard

Pokud posíláte magic link přes Supabase Dashboard (Authentication → Users → Send magic link), tento link může být ve starém formátu a nemusí fungovat správně.

**Vždy používejte magic link odeslaný přes vaši aplikaci!**

### 🕐 Token je platný pouze 1 hodinu

Pokud kliknete na link po více než 1 hodině, dostanete chybu "Token expired". V tom případě požádejte o nový link.

## 🐛 Pokud to stále nefunguje

### Debug krok 1: Zkontrolujte, že jste přidali URL do dashboardu

1. Otevřete: https://supabase.com/dashboard/project/modopafybeslbcqjxsve/auth/url-configuration
2. V sekci "Redirect URLs" zkontrolujte, že tam je `http://localhost:3000`
3. Pokud tam není, přidejte ji a uložte

### Debug krok 2: Otevřete test stránku

Vytvořil jsem speciální test stránku:

1. Otevřete v prohlížeči soubor: `test-magic-link.html`
2. Zadejte email a klikněte "Odeslat Magic Link"
3. Zkontrolujte konzoli pro detailní logy
4. Po kliknutí na link v emailu zkontrolujte "Kontrola Session"

### Debug krok 3: Zkontrolujte konzoli v prohlížeči

1. Otevřete DevTools (F12)
2. Přejděte na záložku "Console"
3. Spusťte:
   ```javascript
   supabase.auth.getSession().then(console.log)
   ```
4. Pokud vidíte `session: null`, token nebyl správně zpracován

### Debug krok 4: Zkontrolujte URL po kliknutí na magic link

Po kliknutí na link v emailu by URL měla vypadat takto:
```
http://localhost:3000/#access_token=eyJhbGc...&refresh_token=v1.MwY...&expires_in=3600&token_type=bearer
```

Pokud nevidíte `#access_token=...` v URL, problém je pravděpodobně v redirect URL v dashboardu.

## 📊 Proč to dělá problém?

### Původní stav (bez `emailRedirectTo`):
```
1. Uživatel klikne na link v emailu
2. Link vede na: https://supabase.co/auth/v1/verify?token=...
3. Supabase ověří token
4. Supabase neví kam přesměrovat (chybí redirect URL)
5. ❌ Zobrazí se default stránka Supabase = 404 error
```

### Nový stav (s `emailRedirectTo`):
```
1. Uživatel klikne na link v emailu
2. Link vede na: https://supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000
3. Supabase ověří token
4. Supabase zkontroluje, že http://localhost:3000 je v whitelistu
5. Supabase přesměruje na: http://localhost:3000/#access_token=...
6. Aplikace automaticky zpracuje token (detectSessionInUrl: true)
7. ✅ Uživatel je přihlášen
```

## 🎯 Checklist

- [x] ✅ Kód opraven (`authService.ts` - přidán `emailRedirectTo`)
- [ ] ⚠️ **AKCE NUTNÁ:** Přidat URL do Supabase Dashboard
- [x] ✅ Supabase konfigurace (`detectSessionInUrl: true`)
- [ ] 🧪 Otestovat magic link z aplikace

## 📚 Další dokumentace

Pokud chcete více detailů:

- **RYCHLA_OPRAVA_MAGIC_LINK.md** - Rychlý průvodce
- **MAGIC_LINK_FIX.md** - Detailní technická dokumentace
- **MAGIC_LINK_DIAGRAM.md** - Vizuální diagram celého procesu
- **MAGIC_LINK_SUMMARY.md** - Kompletní shrnutí všeho
- **test-magic-link.html** - Interaktivní test nástroj
- **check_magic_link_config.sql** - SQL skripty pro diagnostiku

## 💡 TL;DR

1. ✅ Kód jsem už opravil
2. ⚠️ **VY musíte:** Přidat `http://localhost:3000` do Supabase Dashboard → Auth → URL Configuration
3. 🧪 Pak otestovat: Zadat email → Dostat magic link → Kliknout → Být přihlášen

**Čas potřebný: 2 minuty v dashboardu + 1 minuta test = celkem 3 minuty**

---

**Pokud máte další problémy, podívejte se do ostatních dokumentačních souborů nebo mi dejte vědět!**



