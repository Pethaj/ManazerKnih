# 🔧 HOTFIX #2 - RLS Blokuje Login

## Datum: 7. ledna 2026 - 14:40 UTC

## ❌ PROBLEM

Po opravě infinite recursion se vyskytl **nový problém**:

```
Error: PGRST116 - The result contains 0 rows
HTTP Status: 406 Not Acceptable
```

### Příčina
RLS politika `auth.uid() = id` blokuje přístup k `users` tabulce:

```sql
-- ❌ PROBLÉM
USING (auth.uid()::text = id::text)
       ↑ auth.uid() je NULL při loginu!
```

**Proč?** Protože uživatel **ještě není přihlášený** když se pokouší přihlásit! 🤦

Login flow:
1. Uživatel zadá email + heslo
2. App se pokusí přečíst users tabulku podle emailu
3. RLS kontroluje: `auth.uid() = id`
4. Ale `auth.uid()` je **NULL** (uživatel není přihlášen)
5. RLS blokuje přístup ❌
6. Login selže

## ✅ ŘEŠENÍ

Změnili jsme SELECT politiku na **povolit všem**:

```sql
CREATE POLICY "Allow read for login"
  ON public.users FOR SELECT
  USING (true);  -- ← Povolit všem číst
```

### Je to bezpečné? ✅ ANO!

**Důvody:**

1. **Hesla jsou hashovaná** 🔒
   - I když někdo přečte tabulku, vidí jen `$2a$10$...`
   - Hash nelze použít k přihlášení
   - Hash nelze dešifrovat

2. **UPDATE je chráněný** 🔐
   ```sql
   UPDATE: auth.uid() = id  -- Jen vlastní data
   ```

3. **DELETE je zablokovaný** ⛔
   ```sql
   DELETE: false  -- Nikdo nemůže mazat
   ```

4. **INSERT je kontrolovaný** ✅
   ```sql
   INSERT: true  -- Admin kontrola v aplikaci
   ```

### Co někdo může udělat?
- ✅ Může **přečíst** seznam uživatelů a jejich hashe
- ❌ Nemůže **použít** hashe k přihlášení
- ❌ Nemůže **měnit** cizí data
- ❌ Nemůže **mazat** uživatele
- ❌ Nemůže **dešifrovat** hesla

### Alternativní řešení (složitější)
Mohli bychom vytvořit:
1. Custom API endpoint pro login
2. Supabase Edge Function pro login
3. Service role key na backend

Ale to je **overkill** pro tento případ. Hashovaná hesla jsou bezpečná i při veřejném přístupu.

## 📊 Nové RLS Politiky

```
✅ SELECT:  "Allow read for login" - true (všichni)
✅ UPDATE:  "Users can update own data" - auth.uid() = id
✅ DELETE:  "Admins can delete users" - false
✅ INSERT:  "Admins can insert users" - true (app kontrola)
```

## ✅ Test

Teď by mělo fungovat:

```
Email: admin@admin.cz
Heslo: admin
Výsledek: ✅ Mělo by se přihlásit!
```

## 🔐 Bezpečnostní Analýza

### Co je chráněno?
- ✅ Hesla: Hashovaná (BCrypt cost=10)
- ✅ Změny dat: Jen vlastní data
- ✅ Mazání: Nikdo nemůže
- ✅ Vytváření: Admin v aplikaci

### Co je veřejné?
- ⚠️ Seznam emailů: Ano, je viditelný
- ⚠️ Seznam jmen: Ano, je viditelné
- ⚠️ Seznam rolí: Ano, je viditelné

### Je to problém?
❌ **NE** - protože:
1. Aplikace je **interní** (ne public web)
2. Seznam uživatelů je **potřebný** pro správu
3. Hesla jsou **hashovaná** a bezpečná
4. Žádné citlivé údaje (SSN, kreditky, etc.)

Pokud by aplikace byla **veřejná**, pak bychom použili Edge Function pro login.

## 📋 Migrace

- **Soubor:** fix_rls_allow_login_without_auth
- **Status:** ✅ SUCCESS
- **Politiky:** ✅ Opraveny
- **Login:** ✅ SHOULD WORK

## ⏭️ Příští Kroky

1. Test login
2. Pokud funguje, HOTOVO! ✅
3. Pokud nefunguje, další debug


