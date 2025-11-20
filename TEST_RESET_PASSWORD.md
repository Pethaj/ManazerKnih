# 🧪 Test Checklist - Reset Hesla

## Před testováním

### ✅ Checklist přípravy

- [ ] Email template aktualizována v Supabase Dashboard
- [ ] Site URL nastavena na `http://localhost:5173`
- [ ] Redirect URLs obsahují `/reset-password`
- [ ] `npm install` proběhlo úspěšně (nainstalován react-router-dom)
- [ ] Dev server běží (`npm run dev`)

## 📋 Test Scénář 1: Základní Flow

### Krok 1: Spuštění aplikace
```bash
cd "/Users/petrhajduk/Documents/Code/Bewit/Manazer Knih/app"
npm run dev
```

### Krok 2: Požadavek na reset hesla

1. Otevřete: `http://localhost:5173`
2. Klikněte na "Zapomněli jste heslo?" (pokud existuje)
3. Nebo použijte přímo authService:
   ```javascript
   // V Browser Console:
   import { resetPassword } from './src/services/authService';
   await resetPassword('vase@email.cz');
   ```

### Krok 3: Kontrola emailu

4. Otevřete emailovou schránku
5. Zkontrolujte, že přišel email s předmětem "Reset hesla"
6. Email by měl obsahovat tlačítko "Resetovat heslo"

### Krok 4: Kliknutí na odkaz

7. Klikněte na tlačítko v emailu
8. **Očekávaný výsledek:** Otevře se `http://localhost:5173/reset-password`
9. **Očekávaný výsledek:** Vidíte formulář "Nastavení nového hesla"

### Krok 5: Zadání nového hesla

10. Zadejte nové heslo (min. 6 znaků)
11. Potvrďte heslo
12. Klikněte "Změnit heslo"
13. **Očekávaný výsledek:** Zelená zpráva "Heslo bylo změněno"
14. **Očekávaný výsledek:** Po 2 sekundách přesměrování na hlavní stránku

### Krok 6: Ověření

15. Zkuste se přihlásit s novým heslem
16. **Očekávaný výsledek:** Přihlášení úspěšné

## 📋 Test Scénář 2: Chybové stavy

### Test A: Vypršelý token

1. Požádejte o reset hesla
2. **Počkejte více než 1 hodinu**
3. Klikněte na odkaz z emailu
4. **Očekávaný výsledek:** Červená chyba "Odkaz je neplatný nebo vypršel"

### Test B: Neplatný token

1. Otevřete: `http://localhost:5173/reset-password?token_hash=invalid&type=recovery`
2. **Očekávaný výsledek:** Červená chyba "Odkaz je neplatný nebo vypršel"

### Test C: Neshodující se hesla

1. Požádejte o reset hesla
2. Klikněte na odkaz
3. Zadejte různá hesla do obou polí
4. Klikněte "Změnit heslo"
5. **Očekávaný výsledek:** Chyba "Hesla se neshodují"

### Test D: Příliš krátké heslo

1. Požádejte o reset hesla
2. Klikněte na odkaz
3. Zadejte heslo kratší než 6 znaků
4. **Očekávaný výsledek:** Chyba "Heslo musí mít alespoň 6 znaků"

## 📋 Test Scénář 3: Browser Console Check

### Chrome DevTools kontrola

1. Otevřete DevTools (F12)
2. Přejděte na tab **Console**
3. Klikněte na reset odkaz z emailu

**Očekávané logy:**
```
🔧 Inicializuji Supabase client...
✅ Token validován, uživatel může nastavit nové heslo
```

### Network tab kontrola

1. Otevřete DevTools (F12)
2. Přejděte na tab **Network**
3. Klikněte "Změnit heslo"

**Očekávané requesty:**
- `POST /auth/v1/user` - Status 200
- Payload obsahuje `password: "nové-heslo"`

## 📋 Test Scénář 4: Email Security Scanner

### Simulace email scanneru

1. Požádejte o reset hesla
2. Zkopírujte odkaz z emailu
3. Otevřete odkaz v novém okně
4. Zavřete okno
5. Otevřete odkaz znovu (simulace kliknutí uživatelem)
6. **Očekávaný výsledek:** Stále funguje (PKCE flow je odolný)

## 🐛 Debugging

### Pokud vidíte: "Odkaz je neplatný nebo vypršel"

**Kontrola 1: Email Template**
```
- Jděte na Supabase Dashboard
- Authentication → Email Templates → Reset Password
- MUSÍ obsahovat: {{ .TokenHash }} a {{ .SiteURL }}
- NESMÍ obsahovat: {{ .ConfirmationURL }}
```

**Kontrola 2: URL Configuration**
```
- Authentication → URL Configuration
- Site URL: http://localhost:5173
- Redirect URLs musí obsahovat: http://localhost:5173/reset-password
```

**Kontrola 3: Console Errors**
```
- Otevřete F12 → Console
- Hledejte červené chyby
- Zkontrolujte Network tab pro failed requests
```

### Pokud vidíte: Routing error

**Kontrola:**
```bash
# Zkontrolujte, že react-router-dom je nainstalován
npm list react-router-dom

# Pokud ne, nainstalujte:
npm install react-router-dom
```

### Pokud email nepřichází

**Kontrola:**
```
1. Supabase Dashboard → Authentication → Providers → Email
2. Zkontrolujte "Enable email provider" je zapnuté
3. Zkontrolujte Spam folder
4. Zkontrolujte rate limiting (max 4 emaily za hodinu)
```

## ✅ Acceptance Criteria

Test je úspěšný, pokud:

- [x] Email přichází do 1 minuty
- [x] Odkaz v emailu funguje
- [x] Stránka `/reset-password` se načte
- [x] Formulář je použitelný
- [x] Nové heslo lze nastavit
- [x] Přesměrování po úspěchu funguje
- [x] Nové heslo funguje při přihlášení
- [x] Chybové stavy zobrazují správné zprávy
- [x] Console neobsahuje chyby
- [x] Token nefunguje po expiraci
- [x] Token lze použít pouze jednou

## 📊 Metrics

Po úspěšném testu byste měli vidět v Supabase:

**Supabase Dashboard → Logs → Auth:**
```
- user_recovery_requested
- user_recovery_verified
- user_updated
```

**SQL check:**
```sql
SELECT * FROM auth.audit_log_entries 
WHERE payload->>'action' IN ('user_recovery_requested', 'user_recovery_verified')
ORDER BY created_at DESC 
LIMIT 5;
```

## 🎉 Úspěch!

Pokud všechny testy prošly, gratulujeme! Reset hesla je plně funkční.

---

**Pro další informace viz:**
- `RESET_PASSWORD_SETUP.md` - Kompletní dokumentace
- `EMAIL_TEMPLATE_FIX.md` - Průvodce opravou template


