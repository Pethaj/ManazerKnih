# 🔐 Nastavení Reset Hesla - Kompletní Průvodce

## 📋 Přehled problému

Pokud se vám zobrazuje chyba **"Token has expired or is invalid"** při kliknutí na reset hesla odkaz, problém je v konfiguraci email šablony v Supabase.

## ✅ Řešení implementované v kódu

### 1. Vytvořena stránka pro reset hesla
- **Soubor:** `src/pages/ResetPasswordPage.tsx`
- **Route:** `/reset-password`
- Automaticky zpracovává token z URL
- Umožňuje uživateli zadat nové heslo

### 2. Přidán routing
- **Soubor:** `src/AppRouter.tsx`
- Přidána react-router-dom pro podporu více stránek
- Route `/reset-password` je přístupná i nepřihlášeným uživatelům

### 3. Aktualizován Supabase klient
- **Soubor:** `src/lib/supabase.ts`
- Nastaven `flowType: 'pkce'` pro lepší bezpečnost
- Zapnuto `detectSessionInUrl: true` pro automatické zpracování tokenů

### 4. Aktualizována authService
- **Soubor:** `src/services/authService.ts`
- `resetPassword()` funkce správně nastavuje `redirectTo` URL

## 🚨 KRITICKÉ: Musíte upravit Email Template v Supabase

### Krok 1: Přejděte do Supabase Dashboard

1. Otevřete: https://supabase.com/dashboard
2. Vyberte váš projekt: **modopafybeslbcqjxsve**
3. Navigujte na: **Authentication** → **Email Templates**
4. Vyberte šablonu: **"Reset Password"**

### Krok 2: Aktualizujte Email Template

Nahraďte současnou šablonu tímto kódem:

```html
<h2>Reset hesla</h2>

<p>Obdrželi jsme požadavek na reset vašeho hesla.</p>

<p>Klikněte na tlačítko níže pro nastavení nového hesla:</p>

<p>
  <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery"
     style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
    Resetovat heslo
  </a>
</p>

<p style="color: #6b7280; font-size: 14px;">
  Pokud jste o reset hesla nežádali, ignorujte tento email.
</p>

<p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
  Odkaz je platný 1 hodinu.
</p>
```

### Krok 3: Nastavte Site URL

V **Authentication** → **URL Configuration** nastavte:

**Site URL:** `http://localhost:5173` (pro development)  
**Site URL:** `https://vase-produkce-domena.cz` (pro production)

**Redirect URLs (povolit tyto URL):**
- `http://localhost:5173/reset-password`
- `http://localhost:5173/**`
- `https://vase-produkce-domena.cz/reset-password`
- `https://vase-produkce-domena.cz/**`

### Krok 4: Nastavte expiraci tokenu (volitelné)

V **Authentication** → **Providers** → **Email**:

- **Password Recovery Expiry:** Doporučeno `3600` sekund (1 hodina)
- Minimálně: `1800` sekund (30 minut)
- Maximálně: `86400` sekund (24 hodin)

## 🔍 Důležité rozdíly mezi flow typy

### Implicit Flow (starý způsob - NEPOUŽÍVAT)
```html
<!-- ❌ TOTO NEFUNGUJE S PKCE -->
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```
- Token je přímo v URL
- Méně bezpečné
- Často selhává s email security systémy

### PKCE Flow (nový způsob - POUŽÍVÁME)
```html
<!-- ✅ TOTO FUNGUJE -->
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">
  Reset Password
</a>
```
- Používá hash místo přímého tokenu
- Bezpečnější
- Odolnější vůči email security scannerům

## 🧪 Testování

### 1. Lokální testování

```bash
# Spusťte dev server
npm run dev

# Otevřete v prohlížeči
http://localhost:5173
```

### 2. Test reset hesla flow

1. Na přihlašovací stránce klikněte "Zapomněli jste heslo?"
2. Zadejte email a odešlete
3. Zkontrolujte emailovou schránku
4. Klikněte na odkaz v emailu
5. Měli byste být přesměrováni na `http://localhost:5173/reset-password`
6. Zadejte nové heslo
7. Měli byste být úspěšně přihlášeni

### 3. Debugging

Pokud to stále nefunguje, otevřete Console (F12) a hledejte:

```
✅ Token validován, uživatel může nastavit nové heslo
```

Pokud vidíte chybu, zkontrolujte:
- Je URL správně nastavena v Supabase?
- Je email template správně aktualizovaná?
- Je redirect URL povolena v Supabase?

## 🔐 Bezpečnostní poznámky

### Rate Limiting
Supabase automaticky limituje:
- **Email requests:** Max 4 za hodinu na email
- **Token validity:** 1 hodina (konfigurovatelné)

### Best Practices
1. ✅ Používejte PKCE flow (implementováno)
2. ✅ Nastavte krátkou expiraci tokenu (1 hodina)
3. ✅ Používejte HTTPS v produkci
4. ✅ Logujte neúspěšné pokusy o reset
5. ✅ Informujte uživatele o úspěšném resetu

## 🐛 Časté problémy a řešení

### Problém 1: "Token has expired or is invalid"
**Řešení:**
- Aktualizujte email template (viz výše)
- Zkontrolujte, že používáte `{{ .TokenHash }}` místo `{{ .Token }}`
- Zkontrolujte Site URL v Supabase

### Problém 2: Odkaz nefunguje po kliknutí
**Řešení:**
- Přidejte redirect URL do whitelistu v Supabase
- Zkontrolujte, že je routing správně nastaven
- Zkontrolujte Console pro chyby

### Problém 3: Email scanner "spotřebuje" odkaz
**Řešení:**
- PKCE flow řeší tento problém (implementováno)
- Token hash je bezpečnější než přímý token
- Email scannery nemohou "spotřebovat" hash

### Problém 4: Přesměrování po resetu nefunguje
**Řešení:**
- Zkontrolujte, že `redirectTo` v `authService.ts` je správně nastaveno
- Zkontrolujte, že redirect URL je v whitelistu

## 📝 Poznámky pro produkci

Před nasazením do produkce:

1. ✅ Změňte Site URL na produkční doménu
2. ✅ Aktualizujte všechny redirect URLs
3. ✅ Nastavte vlastní SMTP server (volitelné, ale doporučené)
4. ✅ Otestujte celý flow na produkční doméně
5. ✅ Nastavte monitoring pro failed reset attempts

## 🆘 Potřebujete pomoc?

Pokud problém přetrvává:

1. Zkontrolujte Supabase logs: **Logs** → **Auth** v dashboardu
2. Zkontrolujte Browser Console (F12) pro JavaScript chyby
3. Zkontrolujte Network tab pro API volání
4. Ověřte, že všechny kroky výše byly provedeny správně

## ✨ Shrnutí změn

Implementovali jsme kompletní řešení pro reset hesla:

✅ ResetPasswordPage komponenta  
✅ React Router pro multi-page support  
✅ PKCE flow pro bezpečnost  
✅ Automatické zpracování tokenů z URL  
✅ User-friendly error handling  
✅ Správné redirecty po úspěšném resetu  

**Jediné co musíte udělat je aktualizovat Email Template v Supabase Dashboard!**


