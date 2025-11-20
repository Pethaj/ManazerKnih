# ⚡ Rychlý Průvodce Opravou Reset Hesla

## 🎯 3 Jednoduché Kroky

```
┌─────────────────────────────────────────────────────────────┐
│  KROK 1: Aktualizuj Email Template v Supabase Dashboard    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  KROK 2: Nastav URL Configuration                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  KROK 3: Testuj                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📧 KROK 1: Email Template

### Kde?
```
https://supabase.com/dashboard
    └── Projekt: modopafybeslbcqjxsve
        └── Authentication
            └── Email Templates
                └── Reset Password ← TU!
```

### Co změnit?

#### ❌ ŠPATNĚ (nefunguje):
```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

#### ✅ SPRÁVNĚ (funguje):
```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">
  Resetovat heslo
</a>
```

### Celý template:

```html
<h2>Reset hesla</h2>

<p>Obdrželi jsme požadavek na reset vašeho hesla.</p>

<p>Klikněte na tlačítko níže:</p>

<p>
  <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery"
     style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
    Resetovat heslo
  </a>
</p>

<p style="color: #6b7280; font-size: 14px;">
  Pokud jste o reset nežádali, ignorujte tento email.
</p>
```

---

## 🔗 KROK 2: URL Configuration

### Kde?
```
https://supabase.com/dashboard
    └── Projekt: modopafybeslbcqjxsve
        └── Authentication
            └── URL Configuration ← TU!
```

### Co nastavit?

#### Site URL:
```
Development:  http://localhost:5173
Production:   https://vase-domena.cz
```

#### Redirect URLs (přidat):
```
✓ http://localhost:5173/**
✓ http://localhost:5173/reset-password
```

---

## 🧪 KROK 3: Test

### Spusť aplikaci:
```bash
npm run dev
```

### Test Flow:
```
1. Otevři:  http://localhost:5173
2. Klikni:  "Zapomněli jste heslo?"
3. Zadej:   svůj email
4. Odešli
5. Zkontroluj email
6. Klikni na odkaz
7. Zadej nové heslo
8. Hotovo! ✅
```

---

## 🎨 Vizuální Průvodce

```
┌──────────────────────────────────────────────────────────────┐
│                    UŽIVATEL                                  │
│              "Zapomněl jsem heslo"                           │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌───────────────────────┴──────────────────────────────────────┐
│              APLIKACE (React)                                │
│    authService.resetPassword("user@email.cz")                │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌───────────────────────┴──────────────────────────────────────┐
│           SUPABASE AUTH API                                  │
│    Vytvoří token_hash a odešle email                         │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌───────────────────────┴──────────────────────────────────────┐
│                   EMAIL                                      │
│  "Klikněte zde: /reset-password?token_hash=xxx"              │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
                 UŽIVATEL KLIKNE
                        ↓
┌───────────────────────┴──────────────────────────────────────┐
│          APLIKACE (ResetPasswordPage)                        │
│    1. Ověří token_hash ✓                                     │
│    2. Zobrazí formulář                                       │
│    3. Uživatel zadá nové heslo                               │
│    4. updateUser({ password: "new" })                        │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌───────────────────────┴──────────────────────────────────────┐
│              SUPABASE AUTH                                   │
│         Heslo změněno ✅                                      │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌───────────────────────┴──────────────────────────────────────┐
│                 ÚSPĚCH!                                      │
│    Uživatel přihlášen s novým heslem                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 Kontrolní Seznam

Před testem zkontroluj:

```
[ ] ✓ Email template aktualizována
[ ] ✓ Site URL nastavena
[ ] ✓ Redirect URLs přidány
[ ] ✓ npm install proběhlo
[ ] ✓ npm run dev běží
```

---

## ❓ Časté Otázky

### Q: Stále vidím "Token expired"?
**A:** Zkontroluj email template - MUSÍ obsahovat `{{ .TokenHash }}`

### Q: Odkaz nefunguje?
**A:** Přidej `/reset-password` do Redirect URLs

### Q: Email nepřichází?
**A:** 
1. Zkontroluj Spam
2. Zkontroluj rate limit (4 emaily/hodina)
3. Zkontroluj Email Provider je zapnutý

### Q: Jak to funguje?
**A:** Místo přímého tokenu používáme token_hash (PKCE flow) - bezpečnější!

---

## 📚 Další Dokumentace

Pro detailní informace viz:

- **RESET_PASSWORD_SETUP.md** - Kompletní dokumentace
- **EMAIL_TEMPLATE_FIX.md** - Detailní návod na email template
- **TEST_RESET_PASSWORD.md** - Komplexní test checklist
- **RESET_PASSWORD_SUMMARY.md** - Technický přehled

---

## 🆘 Pomoc

Pokud máš problémy:

1. Přečti si `RESET_PASSWORD_SETUP.md`
2. Zkontroluj Browser Console (F12)
3. Zkontroluj Supabase Dashboard → Logs → Auth
4. Spusť SQL query z `check_auth_settings.sql`

---

## ✨ To je vše!

Po provedení těchto 3 kroků bude reset hesla **plně funkční**.

```
┌──────────────────────────────────────┐
│   ✅ Email template aktualizována    │
│   ✅ URLs nakonfigurovány            │
│   ✅ Aplikace testována              │
│   ✅ Reset hesla funguje!            │
└──────────────────────────────────────┘
```

**Vše hotovo! 🎉**


