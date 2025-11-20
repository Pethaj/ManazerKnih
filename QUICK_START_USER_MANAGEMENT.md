# Quick Start - Nová správa uživatelů

## 🚀 Rychlý start (5 minut)

### 1. Nastavení Supabase Email Templates

**Přejděte do Supabase Dashboard:**
```
https://app.supabase.com → Books projekt → Authentication → Email Templates
```

**Nastavte 2 templates:**

1. **Confirm signup** template:
   - Subject: `Potvrďte svůj email - MedBase`
   - Použijte template z `/EMAIL_TEMPLATES_SETUP.md`

2. **Magic Link** template:
   - Subject: `Váš magic link pro přihlášení - MedBase`
   - Použijte template z `/EMAIL_TEMPLATES_SETUP.md`

**URL Configuration:**
```
Authentication → URL Configuration
- Site URL: http://localhost:5173
- Redirect URLs: http://localhost:5173/auth/callback
```

### 2. Vytvoření prvního uživatele jako admin

**Option A: Pokud už máte účet správce**
1. Přihlaste se do aplikace
2. Přejděte do "Správa uživatelů"
3. Klikněte "Přidat uživatele"
4. Vyplňte formulář a vytvořte nového uživatele

**Option B: Pokud nemáte žádný účet**
1. Přejděte do Supabase Dashboard
2. Authentication → Users → Add User
3. Vytvořte prvního správce manuálně
4. Pak v SQL editoru spusťte:

```sql
-- Přidání profilu pro prvního správce
INSERT INTO user_profiles (id, email, role, first_name, surname)
VALUES (
    'USER_ID_Z_AUTH_USERS',  -- ID z auth.users
    'vas.email@example.com', 
    'spravce',
    'Vaše',
    'Jméno'
);
```

### 3. Test systému

**Test 1: Vytvoření uživatele (2 min)**
```
1. Přihlaste se jako správce
2. Správa uživatelů → Přidat uživatele
3. Vyplňte: Pavel, Neckář, test@example.com, admin
4. Heslo se vygeneruje automaticky (např. neck4829)
5. Zkopírujte heslo pro testovacího uživatele
```

**Test 2: Confirmation email (1 min)**
```
1. Zkontrolujte email test@example.com
2. Najděte "Potvrďte svůj email" email
3. Klikněte na potvrzovací odkaz
4. Email je potvrzen ✅
```

**Test 3: První přihlášení (1 min)**
```
1. Odhlaste se z admin účtu
2. Přihlaste se jako test@example.com
3. Použijte vygenerované heslo (např. neck4829)
4. Úspěšné přihlášení ✅
```

**Test 4: Magic link (1 min)**
```
1. Odhlaste se
2. Na login stránce zadejte email
3. Klikněte "Zapomněli jste heslo? Pošleme vám magic link"
4. Zkontrolujte email
5. Klikněte na magic link → automatické přihlášení ✅
```

**Test 5: Změna hesla (1 min)**
```
1. V aplikaci otevřete nastavení profilu
2. Klikněte "Změnit heslo"
3. Zadejte současné heslo a nové heslo
4. Heslo změněno ✅
```

## 📋 Checklist pro produkci

Před nasazením do produkce:

- [ ] ✅ Email templates nastaveny v Supabase
- [ ] ✅ Auth Settings správně nakonfigurovány
- [ ] ✅ Site URL a Redirect URLs nastaveny
- [ ] ⚠️ Service role key přesunut do ENV variables
- [ ] ⚠️ Custom SMTP server nastaven (doporučeno)
- [ ] ⚠️ Produkční Site URL nakonfigurována

## 🔧 Troubleshooting

### Email se neposílá
```bash
1. Zkontrolujte spam
2. Ověřte Auth Settings → Enable Email Provider: ON
3. Zkontrolujte email template v Dashboard
```

### Uživatel se nemůže přihlásit
```bash
1. Ověřte, že email byl potvrzen
2. Zkontrolujte heslo (pozor na copy-paste mezery)
3. Zkuste použít magic link
```

### Magic link nefunguje
```bash
1. Zkontrolujte Redirect URLs v Dashboard
2. Ověřte, že link ještě nevypršel (1h platnost)
3. Magic link lze použít pouze jednou
```

## 📚 Další dokumentace

- **Kompletní dokumentace:** `/NOVA_SPRAVA_UZIVATELU.md`
- **Email templates:** `/EMAIL_TEMPLATES_SETUP.md`

## 🎯 Shrnutí nového systému

### Admin vytvoří uživatele:
- Jméno: Pavel
- Příjmení: Neckář
- Email: uzivatel@example.com
- Role: admin

### Systém automaticky:
- ✅ Vygeneruje heslo: `neck4829` (příjmení + 4 číslice)
- ✅ Vytvoří uživatele v auth.users
- ✅ Vytvoří profil v user_profiles
- ✅ Pošle confirmation email

### Uživatel:
- ✅ Potvrdí email kliknutím na odkaz
- ✅ Přihlásí se s heslem `neck4829`
- ✅ (Volitelně) Změní si heslo v nastavení

### Zapomenuté heslo:
- ✅ Klikne "Zapomněli jste heslo?"
- ✅ Dostane magic link na email
- ✅ Klikne na link → automatické přihlášení
- ✅ Změní si heslo v nastavení

## 🚨 Důležité poznámky

⚠️ **Service Role Key**
- Je v `supabaseAdmin.ts` zahrnutý přímo v kódu
- V produkci MUSÍ být v environment variables
- NIKDY nesdílet s klientem!

⚠️ **Email Confirmations**
- Povinné - uživatel musí potvrdit email
- Automaticky zapnuté při vytvoření uživatele
- Bez potvrzení se nelze přihlásit

⚠️ **Magic Link**
- Platnost: 1 hodina
- Jednosměrný (použitelný pouze jednou)
- Bezpečnější než reset password

---

**Vše hotovo! Nyní můžete začít používat nový systém správy uživatelů. 🎉**

