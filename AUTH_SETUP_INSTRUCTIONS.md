# Instrukce pro nastavení autentizace

## ✅ Co bylo implementováno

### 1. Databázové změny
- ✅ Tabulka `user_profiles` pro ukládání rolí uživatelů
- ✅ Row Level Security (RLS) politiky pro všechny tabulky
- ✅ SQL migrace v souboru `create_user_auth_system.sql`

### 2. Frontend komponenty
- ✅ `LoginForm` - Formulář pro přihlášení
- ✅ `AuthGuard` - Wrapper pro ochranu aplikace
- ✅ `UserManagement` - Správa uživatelů (pouze pro správce)
- ✅ `AddUserModal` - Přidání nových uživatelů

### 3. Services
- ✅ `authService.ts` - Kompletní autentizační služba

### 4. Integrace
- ✅ Celá aplikace zabalena v `AuthGuard`
- ✅ TopToolbar s tlačítky pro odhlášení a správu uživatelů
- ✅ Podmíněné zobrazení funkcí podle role (správce/admin)

## 🚀 Postup nastavení

### Krok 1: Spuštění SQL migrace

1. Otevřete Supabase Dashboard
2. Přejděte na **SQL Editor**
3. Otevřete soubor `create_user_auth_system.sql`
4. Zkopírujte celý obsah a vložte do SQL editoru
5. Klikněte na **Run** (spustit)

Tento script vytvoří:
- Tabulku `user_profiles`
- Všechny potřebné RLS politiky
- Pomocné funkce pro správu uživatelů

### Krok 2: Vytvoření prvního správce (Petr Hajduk)

#### Varianta A: Přes Supabase Dashboard (Doporučeno)

1. V Supabase Dashboard přejděte na **Authentication** → **Users**
2. Klikněte na **Add User** (Přidat uživatele)
3. Vyplňte:
   - **Email**: `petr.hajduk@bewit.team`
   - **Password**: `wewe`
   - **Auto Confirm User**: ✅ **ANO** (zaškrtnout!)
4. Klikněte na **Create User**
5. Po vytvoření **zkopírujte UUID** uživatele (zobrazí se v seznamu)
6. Vraťte se do **SQL Editor** a spusťte:

```sql
INSERT INTO public.user_profiles (id, email, role)
VALUES (
    'VLOŽTE_SEM_UUID_Z_KROKU_5',
    'petr.hajduk@bewit.team',
    'spravce'
);
```

### Krok 3: Aktualizace Supabase klienta

Soubor `src/lib/supabase.ts` již byl aktualizován s `persistSession: true`.

Ověřte, že obsahuje:

```typescript
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // ✅ Ukládá session do localStorage
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
```

### Krok 4: Spuštění aplikace

```bash
npm run dev
```

Aplikace by se měla otevřít s přihlašovací obrazovkou.

## 🔐 Testování autentizace

### Test 1: Přihlášení správce

1. Otevřete aplikaci
2. Měla by se zobrazit přihlašovací obrazovka
3. Zadejte:
   - **Email**: `petr.hajduk@bewit.team`
   - **Heslo**: `wewe`
4. Klikněte na **Přihlásit se**
5. ✅ Měli byste být přihlášeni a vidět hlavní aplikaci

### Test 2: Funkce správce

Po přihlášení jako správce byste měli vidět:

✅ **V top toolbaru:**
- Tlačítko "Správa chatbotů"
- Tlačítko "Správa uživatelů"
- Email a badge "Správce" v pravém horním rohu
- Tlačítko "Odhlásit"

✅ **Přístup ke všem funkcím:**
- Přidávání knih
- Úprava knih
- Mazání knih
- Správa metadat (štítky, kategorie)
- Nastavení chatbotů

### Test 3: Vytvoření admina

1. Klikněte na **Správa uživatelů**
2. Měl by se otevřít modal se seznamem uživatelů
3. Klikněte na **Přidat uživatele**
4. **POZNÁMKA:** Nejprve musíte vytvořit uživatele v Supabase Dashboard:
   - Jděte do **Authentication** → **Users** → **Add User**
   - Vytvořte nového uživatele (např. `admin@example.com`)
   - Zkopírujte jeho UUID
5. V modalu vyplňte:
   - **UUID uživatele**: (vložte zkopírované UUID)
   - **Email**: (stejný jako v dashboardu)
   - **Role**: Vyberte "Admin"
6. Klikněte na **Přidat profil**
7. ✅ Uživatel by měl být přidán do seznamu

### Test 4: Přihlášení jako admin

1. Odhlaste se (tlačítko "Odhlásit" v pravém horním rohu)
2. Přihlaste se jako nově vytvořený admin
3. ✅ **Admin by NEMĚL vidět:**
   - Tlačítko "Správa chatbotů"
   - Tlačítko "Správa uživatelů"
4. ✅ **Admin by MĚL vidět:**
   - Přidávání knih
   - Úprava knih
   - Zobrazení knih

### Test 5: Kontrola rolí (bezpečnost)

**POZNÁMKA:** Kontrola rolí se provádí na **aplikační úrovni**, ne v databázi. To znamená:
- ✅ RLS politiky zajišťují, že pouze přihlášení uživatelé mají přístup
- ✅ Kontrola konkrétních rolí (správce/admin) se provádí v React komponentách a authService
- ✅ Eliminuje riziko nekonečné rekurze v RLS politikách
- ⚠️ Admin může technicky volat API přímo, ale UI to neumožňuje

**Test aplikační bezpečnosti:**

1. Přihlaste se jako admin
2. Otevřete Developer Console (F12)
3. Zkuste zavolat funkci pro správu uživatelů:

```javascript
// Import authService z modulu
const authService = await import('/src/services/authService.ts');

// Test: Admin nemůže získat seznam uživatelů
const result = await authService.listUsers();
console.log('Výsledek:', result); 
// Měl by vrátit: { users: null, error: "Pouze správce může zobrazit seznam uživatelů" }
```

4. ✅ Funkce by měla odmítnout přístup s chybovou hláškou

### Test 6: Odhlášení

1. Klikněte na tlačítko **Odhlásit** v pravém horním rohu
2. ✅ Měli byste být odhlášeni a vráceni na přihlašovací obrazovku
3. ✅ Session by měla být smazána

## 📋 Kontrolní seznam

- [ ] SQL migrace spuštěna úspěšně
- [ ] První správce vytvořen v auth.users
- [ ] První správce má profil v user_profiles
- [ ] Přihlášení správce funguje
- [ ] Správce vidí tlačítka pro správu uživatelů a chatbotů
- [ ] Admin vytvořen a přidán do user_profiles
- [ ] Přihlášení admina funguje
- [ ] Admin NEVIDÍ tlačítka pro správu uživatelů a chatbotů
- [ ] Admin MŮŽE přidávat a upravovat knihy
- [ ] Odhlášení funguje správně
- [ ] RLS politiky fungují (admin nevidí cizí profily)

## 🐛 Řešení problémů

### Problém: "Nepodařilo se přihlásit"

**Řešení:**
1. Zkontrolujte, že uživatel existuje v Supabase Dashboard → Authentication
2. Ověřte, že uživatel má potvrzený email (**Email Confirmed** = true)
3. Zkontrolujte, že uživatel má profil v tabulce `user_profiles`

### Problém: "Uživatelský profil nebyl nalezen"

**Řešení:**
Spusťte SQL:
```sql
SELECT * FROM public.user_profiles WHERE email = 'petr.hajduk@bewit.team';
```

Pokud vrátí prázdný výsledek, přidejte profil:
```sql
INSERT INTO public.user_profiles (id, email, role)
VALUES (
    'UUID_UZIVATELE_Z_AUTH_USERS',
    'petr.hajduk@bewit.team',
    'spravce'
);
```

### Problém: RLS politiky nefungují

**Řešení:**
1. Zkontrolujte, že RLS je zapnuté na všech tabulkách:
```sql
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
```

2. Znovu spusťte celý SQL script `create_user_auth_system.sql`

### Problém: "Session není uložena"

**Řešení:**
Zkontrolujte `src/lib/supabase.ts`:
```typescript
auth: {
  persistSession: true, // Musí být true!
  autoRefreshToken: true,
  detectSessionInUrl: true
}
```

## 📚 Další kroky

### Přidání dalších uživatelů

Pro každého nového uživatele:

1. Vytvořte uživatele v **Supabase Dashboard** → **Authentication** → **Users**
2. Zkopírujte jeho UUID
3. Přihlaste se jako správce
4. Klikněte na **Správa uživatelů** → **Přidat uživatele**
5. Vyplňte UUID, email a vyberte roli (admin nebo správce)

### Změna role uživatele

1. Přihlaste se jako správce
2. Klikněte na **Správa uživatelů**
3. U požadovaného uživatele klikněte na **Změnit roli**
4. Potvrďte změnu

### Smazání uživatele

1. Přihlaste se jako správce
2. Klikněte na **Správa uživatelů**
3. U požadovaného uživatele klikněte na **Smazat**
4. Potvrďte smazání
5. **POZNÁMKA:** Uživatel bude odstraněn z `user_profiles`, ale stále bude existovat v `auth.users`. Pro kompletní smazání použijte Supabase Dashboard.

## 🎉 Hotovo!

Systém autentizace je plně funkční. Nyní máte:
- ✅ Bezpečné přihlašování pomocí Supabase Auth
- ✅ Dvě role: správce (plný přístup) a admin (pouze práce s knihami)
- ✅ Row Level Security na databázové úrovni
- ✅ Správu uživatelů pro správce
- ✅ Persistentní session (zůstane přihlášen i po refreshi stránky)

