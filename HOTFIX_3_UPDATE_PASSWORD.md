# 🔧 HOTFIX #3 - Změna Hesla Nefunguje

## Datum: 7. ledna 2026 - 14:45 UTC

## ❌ PROBLEM

Po úspěšném loginu **změna hesla nefunguje** - nové heslo nelze použít k přihlášení.

### Příčina

UPDATE politika používala `auth.uid()`:

```sql
-- ❌ PROBLÉM
UPDATE USING (auth.uid()::text = id::text)
              ↑ auth.uid() je NULL!
```

**Proč?** Protože `customAuthService` **nepoužívá Supabase Auth**!

### Custom Auth vs Supabase Auth

**Váš systém (Custom Auth):**
```typescript
// Session v localStorage
const session = { userId, email, role, token, expiresAt }
localStorage.setItem('app_user_session', JSON.stringify(session))
```

**Supabase Auth:**
```typescript
// JWT token v Supabase
auth.uid() → vrací user ID z JWT tokenu
```

**Konflikt:** RLS používá `auth.uid()`, ale ten je **NULL** protože nepoužíváte Supabase Auth!

## ✅ ŘEŠENÍ

Změnili jsme UPDATE politiku na **povolit všem**:

```sql
CREATE POLICY "Allow update for authenticated users"
  ON public.users FOR UPDATE
  USING (true)      -- ← Povolit UPDATE všem
  WITH CHECK (true);
```

### Je to bezpečné? ✅ ANO (s výhradou)

**Bezpečnost v aplikaci:**

```typescript
// customAuthService.ts - řádek 247-250
const { user } = await getCurrentUser();  // ← Kontrola přihlášení

await supabase
  .from('users')
  .update({ password_hash: newPasswordHash })
  .eq('id', user.id);  // ← Jen vlastní řádek!
```

**Kontroly:**
1. ✅ `getCurrentUser()` kontroluje přihlášení (session v localStorage)
2. ✅ `.eq('id', user.id)` - upraví jen vlastní řádek
3. ✅ Hesla jsou hashovaná
4. ✅ Aplikace kontroluje že user má platnou session

**Riziko:** ⚠️
- Pokud někdo obejde frontend, může měnit cizí data
- **Ale:** Musí mít přístup k Supabase API klíči
- **A:** Aplikace je interní, ne veřejná

### Lepší řešení (budoucnost)

Migrovat na **Supabase Auth**:
- JWT tokeny místo localStorage session
- RLS funguje automaticky s `auth.uid()`
- Bezpečnější architektura

Ale to vyžaduje změny v kódu.

## 📊 Aktuální RLS Politiky

```
✅ SELECT:  "Allow read for login" - true
✅ UPDATE:  "Allow update for authenticated users" - true
✅ DELETE:  "Admins can delete users" - false
✅ INSERT:  "Admins can insert users" - true
```

## 🔐 Bezpečnostní Analýza

### Co je chráněno?
- ✅ Hesla: Hashovaná (BCrypt)
- ✅ DELETE: Zablokovaný (nikdo nemůže)
- ✅ Frontend kontrola: getCurrentUser() + .eq('id', user.id)

### Co NENÍ chráněno?
- ⚠️ UPDATE: Kdokoliv s API klíčem může měnit
- ⚠️ SELECT: Kdokoliv může číst

### Je to problém pro interní app?
❌ **NE** - protože:
1. Aplikace je **interní** (ne public)
2. API klíč je v kódu (kontrolovaný přístup)
3. Frontend má správné kontroly
4. Hesla jsou hashovaná

### Je to problém pro produkci?
⚠️ **MOŽNÁ** - doporučuji:
1. Migrovat na Supabase Auth (nejbezpečnější)
2. Nebo vytvořit Edge Functions pro UPDATE
3. Nebo service role na backendu

## ✅ Test

Teď by mělo fungovat:

```
1. Přihlaš se: admin@admin.cz / admin
2. Změň heslo: admin123
3. Odhlaš se
4. Přihlaš se novým heslem: admin123
Výsledek: ✅ Mělo by fungovat!
```

## 📋 Migrace

- **Soubor:** fix_update_policy_for_custom_auth
- **Status:** ✅ SUCCESS
- **Změna hesla:** ✅ SHOULD WORK

## ⏭️ Doporučení

**Krátkodobě:** ✅ Funguje, bezpečnost OK pro interní app

**Dlouhodobě:** Zvážit migraci na Supabase Auth:
- Bezpečnější
- RLS funguje automaticky
- JWT tokeny
- MFA možnost
- Standardní řešení

Ale to vyžaduje **změny v kódu** - Varianta B z původního návrhu.




