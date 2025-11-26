# Test "core it" Workflow

## Účel tohoto dokumentu

Tento dokument slouží jako **demonstrace a test** "core it" workflow. Ukazuje, jak by měla probíhat analýza dopadu změn proti CORE dokumentaci.

---

## Testovací scénář: Přidání pole "rating" do product_feed_2

### Uživatelský požadavek
```
Chci přidat nové pole "rating" (hodnocení produktu 1-5 hvězdiček) 
do tabulky product_feed_2 a zobrazit ho v ProductCarousel.
```

---

# 🔍 CORE ANALÝZA

## 📋 Požadovaná změna

**Co:** Přidání nového pole `rating` typu INTEGER do tabulky `product_feed_2`

**Proč:** Zobrazení hodnocení produktů uživatelům v ProductCarousel

**Rozsah změn:**
- Databázové schéma: ALTER TABLE product_feed_2
- Edge Function: Přidání parsování rating z XML
- TypeScript typy: Aktualizace rozhraní
- UI komponenta: ProductCarousel - zobrazení hvězdiček

---

## 📚 Načtené CORE funkce

✅ **Funkce 1: Synchronizace Product Feed 2** (FUNC-001)
- Stav: Aktivní a schváleno
- Poslední aktualizace: 2024-11-26

---

## ⚠️ Identifikované dopady

### Funkce: Synchronizace Product Feed 2 (FUNC-001)

**Úroveň dopadu:** 🟡 **STŘEDNÍ**

**Popis dopadu:**
Přidání pole `rating` vyžaduje změny v několika částech této CORE funkce:

1. **Databázové schéma** - Bude změněna tabulka `product_feed_2`
2. **Edge Function** - sync-feed-2/index.ts musí parsovat nové pole z XML
3. **TypeScript rozhraní** - ProductFeed2 interface potřebuje nový field
4. **UI komponenty** - ProductCarousel a ProductRecommendationButton potřebují zobrazit rating

**Dotčené komponenty:**
- `create_product_feed_2_table.sql` - databázová migrace
- `supabase/functions/sync-feed-2/index.ts` - Edge Function
- `src/components/ProductCarousel.tsx` - UI zobrazení
- `src/components/ProductRecommendationButton.tsx` - data mapping
- `src/services/hybridProductService.ts` - TypeScript rozhraní

**Potenciální konflikty:**
- ⚠️ Existující produkty v DB nebudou mít rating (NULL values)
- ⚠️ XML feed možná neobsahuje rating pole (nutno ověřit)
- ✅ Backwards compatible - nerozbije existující funkčnost
- ✅ UI může zobrazit rating jako optional (pokud není NULL)

**Závislosti:**
- BEWIT API XML feed musí obsahovat rating data
- ProductCarousel potřebuje novou props pro rating
- Možná potřeba nové ikony pro hvězdičky

---

## 💡 Implementační varianty

### Varianta A: Minimální dopad (Pouze DB + zobrazení)

**Přístup:** 
Přidáme pole do DB, ale nenačítáme ho z XML. Admin může ručně nastavit rating v Supabase dashboard.

**Změny:**
1. Databázová migrace:
```sql
ALTER TABLE product_feed_2 
ADD COLUMN rating INTEGER DEFAULT NULL CHECK (rating >= 1 AND rating <= 5);
```

2. UI: ProductCarousel zobrazí rating pokud existuje
```typescript
{product.rating && (
  <div className="rating">
    {'⭐'.repeat(product.rating)}
  </div>
)}
```

**Dopad na CORE:**
- 🟢 Minimální - nepřidává logic do Edge Function
- 🟢 Backwards compatible - existující funkce fungují stejně
- 🟢 Optional field - nerozbije nic

**Výhody:**
- ✅ Rychlá implementace
- ✅ Nulové riziko rozbití sync procesu
- ✅ Lze testovat okamžitě

**Nevýhody:**
- ❌ Rating musí být nastaven ručně
- ❌ Není automatická synchronizace z BEWIT API
- ❌ Neškáluje se s velkým počtem produktů

---

### Varianta B: Optimální řešení (Full integration)

**Přístup:**
Kompletní integrace - DB migrace, parsing z XML, automatická synchronizace, UI zobrazení.

**Změny:**

1. **Databázová migrace:**
```sql
ALTER TABLE product_feed_2 
ADD COLUMN rating INTEGER DEFAULT NULL CHECK (rating >= 1 AND rating <= 5);

CREATE INDEX idx_product_feed_2_rating ON product_feed_2(rating DESC);
```

2. **Edge Function - sync-feed-2/index.ts:**
```typescript
// Přidat do parsování
rating: item.RATING ? parseInt(item.RATING) : null,
```

3. **TypeScript rozhraní:**
```typescript
interface ProductFeed2 {
  // ... existing fields
  rating?: number | null;
}

interface HybridProductRecommendation {
  // ... existing fields
  rating?: number | null;
}
```

4. **hybridProductService.ts - enrichment:**
```typescript
rating: metadata?.rating || null,
```

5. **ProductCarousel.tsx:**
```tsx
<div className="product-rating">
  {product.rating && (
    <div className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < product.rating ? 'star-filled' : 'star-empty'}>
          ⭐
        </span>
      ))}
    </div>
  )}
</div>
```

6. **Ověření v XML:** Zkontrolovat, zda BEWIT feed obsahuje rating

**Dopad na CORE:**
- 🟡 Střední - mění Edge Function a několik služeb
- 🟢 Zlepšuje CORE funkci novým feature
- 🟢 Backwards compatible - existující funkce fungují

**Výhody:**
- ✅ Plně automatická synchronizace
- ✅ Škálovatelné řešení
- ✅ Konzistentní data z BEWIT API
- ✅ Index pro rychlé řazení podle ratingu

**Nevýhody:**
- ⚠️ Vyžaduje ověření, že XML obsahuje rating
- ⚠️ Více kódu k testování
- ⚠️ Nutná aktualizace CORE.md dokumentace

---

### Varianta C: Hybrid approach (DB + fallback)

**Přístup:**
Přidáme field do DB, pokusíme se načíst z XML, ale pokud chybí, použijeme default hodnotu nebo výpočet z jiných metrik.

**Změny:**

1. **Databázová migrace:** Stejná jako varianta B

2. **Edge Function:** 
```typescript
// Pokusíme se načíst rating z XML
let rating = item.RATING ? parseInt(item.RATING) : null;

// Fallback: Vypočítat rating z sales_last_30_days
if (!rating && item.SALES_30) {
  const sales = parseInt(item.SALES_30);
  rating = Math.min(5, Math.ceil(sales / 10)); // 10+ prodejů = 1 hvězdička
}

// Další fallback: Default 3 hvězdičky pro nové produkty
if (!rating) {
  rating = 3;
}
```

3. UI a rozhraní: Stejné jako varianta B

**Dopad na CORE:**
- 🟡 Střední - přidává fallback logiku
- 🟢 Robustní - funguje i bez dat v XML
- 🟡 Mírně komplikovanější - více logiky

**Výhody:**
- ✅ Vždy zobrazí nějaký rating
- ✅ Inteligentní fallback na základě prodejů
- ✅ Funguje i když XML neobsahuje rating

**Nevýhody:**
- ⚠️ Vypočítaný rating nemusí odpovídat realitě
- ⚠️ Složitější logika = vyšší maintenance
- ⚠️ Může být matoucí (uživatelé neznají source ratingu)

---

## 🔍 Validační checklist

Před implementací je nutné:

- [ ] Ověřit, zda BEWIT XML feed obsahuje rating pole
- [ ] Zkontrolovat formát rating dat (1-5? 0-100? text?)
- [ ] Rozhodnout o fallback strategii pro missing ratings
- [ ] Navrhnout UI design pro hvězdičky
- [ ] Otestovat s existujícími daty v DB
- [ ] Připravit migraci pro production DB

---

## 📄 Potřebná aktualizace CORE.md

Pokud bude schválena varianta B nebo C, bude nutné aktualizovat sekce v CORE.md:

### Sekce k aktualizaci:

1. **Databázové schéma - product_feed_2:**
```diff
+ rating INTEGER DEFAULT NULL CHECK (rating >= 1 AND rating <= 5),
```

2. **Indexy:**
```diff
+ CREATE INDEX idx_product_feed_2_rating ON product_feed_2(rating DESC);
```

3. **Edge Function - Proces:**
```diff
+ - Parsuje rating z XML (nebo vypočítá fallback)
```

4. **TypeScript rozhraní:**
```diff
+ rating?: number | null;
```

5. **UI komponenty:**
```diff
+ ProductCarousel: Zobrazení hvězdiček pro rating
```

---

## ❓ Rozhodnutí

Která varianta implementace ti vyhovuje?

- **A) Minimální dopad** - Pouze DB field, ruční nastavení, rychlé
- **B) Optimální řešení** - Full integration s XML, automatická sync
- **C) Hybrid approach** - XML + fallback logika, vždy zobrazí rating
- **D) Neschválit změnu** - Rating není potřeba

---

## 📝 Doporučení

**Moje doporučení:** Varianta **B - Optimální řešení**

**Důvody:**
1. Pokud BEWIT API poskytuje rating, měli bychom ho použít
2. Automatická synchronizace je key feature CORE funkce
3. Čisté řešení bez komplikované fallback logiky
4. Scalable pro budoucí produkty

**Podmínka:** Nejdřív ověřit, že XML obsahuje rating field. Pokud ne, pak varianta A nebo C.

---

## ✅ Po schválení

1. Implementovat zvolenou variantu
2. Otestovat synchronizaci
3. Ověřit zobrazení v UI
4. Aktualizovat CORE.md s novými změnami
5. Udělat checkpoint: "✅ CORE validace dokončena pro přidání rating pole"

---

**Status:** ⏸️ Čeká na schválení uživatele


