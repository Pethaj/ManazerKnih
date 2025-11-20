# Nový Vlastní Autentizační Systém

## Přehled

Kompletně jsme odstranili Supabase Authentication a nahradili ji vlastním jednoduchým systémem autentizace.

## Změny

### ✅ Co bylo odstraněno

- ❌ Supabase Auth (`supabase.auth.*`)
- ❌ Magic links
- ❌ Potvrzovací emaily
- ❌ Reset password emaily
- ❌ Automatické funkce Supabase Auth

### ✅ Co bylo přidáno

- ✅ Vlastní tabulka `users` v Supabase
- ✅ Session management přes localStorage
- ✅ Bcrypt hashování hesel
- ✅ Jednoduché vytváření uživatelů
- ✅ Změna hesla přes UI

## Databázová struktura

### Tabulka `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'spravce')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabulka `user_sessions`

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Jak nastavit

### 1. Spustit SQL skript

Otevřete Supabase SQL Editor a spusťte soubor `database_setup.sql`.

Tento skript:
- Vytvoří tabulky `users` a `user_sessions`
- Nastaví RLS policies
- Vytvoří prvního admin uživatele:
  - Email: `admin@admin.cz`
  - Heslo: `admin123`

### 2. Nainstalovat závislosti

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

## Použití

### Přihlášení

```typescript
import { login } from './src/services/customAuthService';

const { user, error } = await login('email@example.com', 'heslo123');
if (error) {
  console.error('Chyba:', error);
} else {
  console.log('Přihlášen:', user);
}
```

### Odhlášení

```typescript
import { logout } from './src/services/customAuthService';

await logout();
```

### Získání aktuálního uživatele

```typescript
import { getCurrentUser } from './src/services/customAuthService';

const { user, error } = await getCurrentUser();
```

### Změna hesla

```typescript
import { changePassword } from './src/services/customAuthService';

const { success, error } = await changePassword(
  'současnéHeslo',
  'novéHeslo'
);
```

## Admin funkce

### Vytvoření uživatele

```typescript
import { adminCreateUser } from './src/services/customAdminService';

const { success, error, password, user } = await adminCreateUser(
  'email@example.com',
  'Jan',
  'Novák',
  'admin',
  undefined // Vygeneruje výchozí heslo "heslo123"
);
```

### Seznam uživatelů

```typescript
import { adminListUsers } from './src/services/customAdminService';

const { users, error } = await adminListUsers();
```

### Smazání uživatele

```typescript
import { adminDeleteUser } from './src/services/customAdminService';

const { success, error } = await adminDeleteUser('userId');
```

### Změna role

```typescript
import { adminUpdateUserRole } from './src/services/customAdminService';

const { success, error } = await adminUpdateUserRole('userId', 'spravce');
```

### Reset hesla uživatele

```typescript
import { adminResetUserPassword } from './src/services/customAdminService';

const { success, error, newPassword } = await adminResetUserPassword('userId');
// newPassword = "heslo123" (výchozí heslo)
```

## Komponenty

### AuthGuard

Chrání aplikaci před nepřihlášenými uživateli.

```typescript
<AuthGuard>
  {(user) => <App currentUser={user} />}
</AuthGuard>
```

### LoginForm

Přihlašovací formulář.

```typescript
<LoginForm onLoginSuccess={() => window.location.reload()} />
```

### UserManagement

Admin panel pro správu uživatelů.

```typescript
<UserManagement 
  currentUserId={user.id}
  onClose={() => setShowUserManagement(false)}
/>
```

### ChangePassword

Formulář pro změnu hesla.

```typescript
<ChangePassword onClose={() => setShowChangePassword(false)} />
```

## Bezpečnost

### Hashování hesel

- Používáme **bcrypt** s cost faktorem **10**
- Hesla nikdy neukládáme v plain textu
- Při změně hesla ověřujeme současné heslo

### Session management

- Session token je uložen v **localStorage**
- Token je unikátní UUID
- Session má expiraci **7 dní**
- Při odhlášení se session smaže z DB i localStorage

### RLS Policies

Pro jednoduchost jsou RLS policies nastaveny na `true`. 
V produkci můžete upravit podle potřeby:

```sql
-- Příklad: Pouze přihlášení uživatelé mohou číst
CREATE POLICY "Only authenticated users can read" 
    ON users 
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);
```

## Výchozí heslo

Při vytváření nového uživatele se používá výchozí heslo: **`heslo123`**

Admin může heslo sdělit uživateli, který si ho pak může změnit v nastavení profilu.

## Výhody tohoto systému

✅ **Jednoduchý** - žádné složité nastavení emailů
✅ **Rychlý** - okamžité vytvoření uživatele
✅ **Transparentní** - plná kontrola nad procesem
✅ **Flexibilní** - snadné úpravy dle potřeby
✅ **Bez emailů** - není potřeba SMTP server

## Soubory

### Nové soubory

- `/src/services/customAuthService.ts` - Autentizační služby
- `/src/services/customAdminService.ts` - Admin služby pro správu uživatelů
- `/database_setup.sql` - SQL skript pro nastavení databáze
- `NOVY_AUTH_SYSTEM_README.md` - Tato dokumentace

### Upravené soubory

- `/src/components/Auth/LoginForm.tsx` - Odstraněn magic link
- `/src/components/Auth/AuthGuard.tsx` - Použití nového auth systému
- `/src/components/UserManagement/UserManagement.tsx` - Použití nového admin systému
- `/src/components/UserManagement/AddUserModal.tsx` - Zjednodušeno vytváření uživatelů
- `/src/components/ProfileSettings/ChangePassword.tsx` - Použití nového API
- `/src/components/ProfileSettings/ProfileSettings.tsx` - Použití nového API
- `/index.tsx` - Import nových služeb

### Staré soubory (deprecated)

- `/src/services/authService.ts` - ⚠️ NEPOUŽÍVAT (Supabase Auth)
- `/src/services/adminAuthService.ts` - ⚠️ NEPOUŽÍVAT (Supabase Auth)
- `/src/lib/supabaseAdmin.ts` - ⚠️ NEPOUŽÍVAT (Service role key)

## Migrace dat

Pokud máte existující uživatele v `auth.users`, musíte je přemigrovat do nové tabulky `users`:

```sql
-- Příklad migrace (upravte podle potřeby)
INSERT INTO users (email, password_hash, first_name, last_name, role)
SELECT 
    email,
    '$2a$10$rVxQ8vXl5PjOcjKFWxL3.eVjGJH0OoqYKGJQXxZQH6mJm5vQxH7mu', -- heslo123
    'Jméno',
    'Příjmení',
    'admin'
FROM auth.users
WHERE email NOT IN (SELECT email FROM users);
```

## Řešení problémů

### Nemohu se přihlásit

1. Zkontrolujte, zda existuje uživatel v tabulce `users`
2. Zkontrolujte heslo (výchozí: `heslo123` pro nové uživatele, `admin123` pro prvního admina)
3. Otevřete konzoli prohlížeče a zkontrolujte chyby

### Session expirovala

- Session je platná 7 dní
- Po expiraci se uživatel musí přihlásit znovu
- Session se automaticky smaže z localStorage

### Zapomenuté heslo

- Admin musí resetovat heslo pomocí `adminResetUserPassword`
- Nové heslo bude `heslo123`
- Uživatel si ho může pak změnit v nastavení

## Kontakt

Pro otázky a pomoc kontaktujte vývojářský tým.

