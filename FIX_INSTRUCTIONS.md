# Instrukce pro dokončení oprav

## 🔧 Problémy opraveny v kódu:

### 1. ✅ Oprava ztráty focus při editaci
- Přepsal jsem `renderEditableField` funkci na `EditableField` komponentu s `React.memo()`
- Přidal jsem `useCallback` pro event handlery
- Editace polí by nyní měla fungovat bez ztráty focus

### 2. ✅ Dočasná oprava pro chybějící vector_status sloupec
- Zakomentoval jsem `vector_status` v `updateBook`, `createBook` a `mapSupabaseToBook`
- Všechny knihy mají dočasně `vectorStatus: 'pending'`

## 🎯 Co musíte udělat:

### KROK 1: Přidat sloupec do databáze
1. Otevřete **Supabase Dashboard**
2. Jděte na **SQL Editor**  
3. Spusťte tento SQL příkaz:

```sql
-- Přidání sloupce vector_status do tabulky books
ALTER TABLE public.books 
ADD COLUMN vector_status TEXT DEFAULT 'pending' CHECK (vector_status IN ('pending', 'success', 'error'));

-- Aktualizace existujících záznamů na 'pending'
UPDATE public.books 
SET vector_status = 'pending' 
WHERE vector_status IS NULL;

-- Komentář k sloupci
COMMENT ON COLUMN public.books.vector_status IS 'Stav nahrání knihy do vektorové databáze: pending (čeká), success (úspěšně nahráno), error (chyba)';
```

### KROK 2: Odkomentovat kód
Po úspěšném přidání sloupce do databáze odkomentujte tyto řádky:

**V `updateBook` funkci (řádek ~287):**
```typescript
vector_status: book.vectorStatus, // Odkomentovat po přidání sloupce
```

**V `createBook` funkci (řádek ~435):**
```typescript
vector_status: bookData.vectorStatus || 'pending', // Odkomentovat po přidání sloupce
```

**V `mapSupabaseToBook` funkci (řádek ~269):**
```typescript
vectorStatus: (data.vector_status as 'pending' | 'success' | 'error') || 'pending', // Odkomentovat po přidání sloupce
```

### KROK 3: Testování
Po dokončení kroků 1 a 2:
1. **Testujte editaci metadat** - měla by fungovat bez ztráty focus
2. **Testujte ukládání změn** - neměla by se objevit chyba o chybějícím sloupci
3. **Testujte VDB funkce** - ikony databáze by měly mít správné barvy

## 🚨 Důležité:
- **NEJDŘÍVE** spusťte SQL v Supabase
- **POTOM** teprve odkomentujte kód
- Pokud zapomenete na SQL, aplikace se bude chybovat při ukládání

## 📝 Soubory k úpravě:
- `index.tsx` - odkomentovat 3 řádky zmíněné výše
- SQL spustit v Supabase Dashboard

Po dokončení budou obě funkce plně funkční! 🚀

