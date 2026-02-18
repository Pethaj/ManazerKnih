# Implementace prioritního řazení produktů BEWIT

## Datum implementace
2026-02-18

## Popis změny
Přidáno prioritní řazení produktů podle kategorií do vyhledávacího systému. Produkty se nyní zobrazují v tomto pořadí:

1. **Směsi esenciálních olejů** (nejvyšší priorita) 🥇
2. **PRAWTEIN® – superpotravinové směsi** (druhá priorita) 🥈
3. **TČM - Tradiční čínská medicína** (třetí priorita) 🥉
4. **Ostatní produkty** (seřazené pouze podle similarity) 📦

V rámci každé kategorie se produkty řadí podle **similarity score** (relevance vůči dotazu).

**DŮLEŽITÉ:** Směsi esenciálních olejů jsou VŽDY na prvním místě, bez ohledu na relevanci nebo pořadí v textu!

## Varianta implementace
**Varianta A: Frontend řazení po vyhledání**

### Důvody výběru
- Minimální dopad na existující CORE funkce
- Žádné změny v databázi nebo SQL funkcích
- Snadná implementace a testování
- Jednoduché rollback v případě problémů

## Změněné soubory

### 1. `src/services/hybridProductService.ts`

**Přidané funkce:**

#### `PRIORITY_CATEGORIES` konstanta
```typescript
const PRIORITY_CATEGORIES = [
  'Směsi esenciálních olejů',
  'PRAWTEIN® – superpotravinové směsi',
  'TČM - Tradiční čínská medicína'
];
```

#### `getCategoryPriority(category: string | undefined): number`
- Vrací prioritu kategorie (0 = nejvyšší, 999 = žádná priorita)
- Používá fuzzy matching (contains) pro robustní porovnání kategorií

#### `sortProductsByPriorityCategories(products: HybridProductRecommendation[]): HybridProductRecommendation[]`
- Seřadí produkty podle prioritních kategorií
- V rámci stejné kategorie řadí podle similarity score (sestupně)

**Upravené funkce:**

#### `getHybridProductRecommendations()`
- Přidán krok 3: Řazení výsledků pomocí `sortProductsByPriorityCategories()`
- Řazení se aplikuje na `allResults` před vrácením

#### `getPureSemanticRecommendations()`
- Přidáno řazení výsledků pomocí `sortProductsByPriorityCategories()`
- Řazení se aplikuje i na fallback vyhledávání

### 2. `src/components/SanaChat/SanaChat.tsx` ⚡ NOVĚ PŘIDÁNO

**Přidané funkce v komponentě `Message`:**

#### `PRIORITY_CATEGORIES` konstanta
- Stejné jako v `hybridProductService.ts`
- Definuje prioritní pořadí kategorií

#### `getCategoryPriority(category: string | undefined): number`
- Lokální implementace pro komponentu
- Vrací prioritu kategorie pro řazení inline produktů

#### `sortProductsByPriorityCategories(products: RecommendedProduct[]): RecommendedProduct[]`
- Seřadí inline produkty podle prioritních kategorií
- Používá se pro "Související produkty BEWIT" v modrém boxu

**Upravené části:**

#### Řazení obohacených produktů (řádek ~888)
```typescript
const sortedProducts = sortProductsByPriorityCategories(enriched);
setEnrichedProducts(sortedProducts);
```
- Po obohacení produktů z databáze se produkty seřadí
- Console log zobrazuje pořadí produktů po řazení

#### Řazení kategorií v boxu (řádek ~1047)
```typescript
const categories = Object.keys(byCategory).sort((catA, catB) => {
    const priorityA = getCategoryPriority(catA);
    const priorityB = getCategoryPriority(catB);
    return priorityA - priorityB;
});
```
- Kategorie v modrém boxu se řadí podle priority
- Směsi esenciálních olejů se zobrazí jako první sekce

## Testování

### Automatický test
Vytvořen testovací soubor `test-priority-sorting.ts` s následujícími scénáři:
- ✅ Produkty se správně řadí podle prioritních kategorií
- ✅ V rámci každé kategorie jsou seřazeny podle similarity
- ✅ Produkty bez prioritní kategorie jsou na konci

**Výsledek testu:** ✅ VŠECHNY TESTY PROŠLY

### Ruční testování - INLINE PRODUKTY
Pro ověření funkčnosti inline produktů (Související produkty BEWIT):
1. Přihlásit se do aplikace
2. Otevřít chatbot "EO-Smesi" nebo podobný
3. Zadat dotaz: "doporuč mi směsi proti bolesti hlavy"
4. **Ověřit pořadí v modrém boxu "Související produkty BEWIT":**
   - ✅ První sekce: **Směsi esenciálních olejů** (např. "Bo esenciální olej")
   - ✅ Druhá sekce: **PRAWTEIN** (pokud jsou nalezeny)
   - ✅ Třetí sekce: **TČM** (např. "004 - Eliminace větru", "114 - Vnitřní jas")
   - ✅ Čtvrtá sekce: Ostatní (pokud existují)

### Screenshot z testování
![Priority sorting v akci](Screenshot_2026-02-18_at_8.42.19.png)

**Před opravou:** TČM produkty byly první ❌
**Po opravě:** Směsi esenciálních olejů jsou první ✅

## Dopad na CORE funkce

### FUNC-001: Synchronizace Product Feed 2
**Úroveň dopadu:** Střední (Vylepšení)

**Co se změnilo:**
- Produkty se nyní řadí podle prioritních kategorií po vyhledání
- **NOVĚ:** Inline produktové linky v SanaChat se také řadí podle priorit
- Samotné vyhledávání zůstává nezměněno
- SQL funkce `hybrid_product_search()` zůstává beze změn

**Co zůstalo stejné:**
- Databázové schéma
- SQL funkce pro vyhledávání
- N8N webhook integrace
- Edge Functions
- Obohacování metadaty

## Zpětná kompatibilita
✅ **Plná zpětná kompatibilita**
- Žádné breaking changes
- Všechny existující funkce zůstávají funkční
- API rozhraní nezměněno

## Budoucí rozšíření
V případě potřeby lze snadno upgradovat na:

### Varianta B: Konfigurovatelné řazení v chatbot_settings
- Přidat sloupec `product_category_priority TEXT[]` do `chatbot_settings`
- Umožnit každému chatbotu mít vlastní prioritní kategorie
- Přidat UI pro správu priorit v `ChatbotManagement.tsx`

### Varianta C: SQL funkce s weights
- Přidat řazení přímo do SQL funkce `hybrid_product_search()`
- Nejvýkonnější řešení, ale vyžaduje změnu CORE funkce

## Poznámky pro údržbu
- Priority kategorií jsou definované v `PRIORITY_CATEGORIES` konstantě (2 místa):
  1. `src/services/hybridProductService.ts` - pro API doporučení
  2. `src/components/SanaChat/SanaChat.tsx` - pro inline produkty
- Pro změnu priorit stačí upravit tyto konstanty na obou místech
- Pro přidání nové prioritní kategorie přidej řetězec do pole

## Schválení
- **Datum:** 2026-02-18
- **Schválil:** Uživatel (Varianta A)
- **Status:** ✅ Implementováno a otestováno
- **Urgence:** Kritická - "vždycky a pokaždé musí být směsi esenciálních olejů na prvním místě"

## Rollback postup
V případě problémů:

### Soubor: `src/services/hybridProductService.ts`
1. Odstranit `PRIORITY_CATEGORIES`, `getCategoryPriority()` a `sortProductsByPriorityCategories()`
2. Odstranit volání `sortProductsByPriorityCategories()` ze dvou míst:
   - `getHybridProductRecommendations()` (řádek ~190)
   - `getPureSemanticRecommendations()` (řádek ~242)
3. Vrátit původní `return allResults;` a `return searchResults.map(...)`

### Soubor: `src/components/SanaChat/SanaChat.tsx`
1. Odstranit funkce `PRIORITY_CATEGORIES`, `getCategoryPriority()` a `sortProductsByPriorityCategories()` (cca řádky 765-800)
2. V useEffect (cca řádek 888): odstranit řádky s `sortProductsByPriorityCategories` a vrátit `setEnrichedProducts(enriched)`
3. V renderTextWithProductButtons (cca řádek 1047): změnit `const categories = Object.keys(byCategory).sort(...)` na `const categories = Object.keys(byCategory)`
