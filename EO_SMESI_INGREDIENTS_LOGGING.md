# 🌿 EO Smesi - Logování ingrediencí

## Přehled

Implementován vylepšený logovací systém pro získávání a sledování seznamu ingrediencí v EO Smesi chatu.

Nový systém zahrnuje:
- **Detailní logy** s barevným formátováním v DevTools konzoli
- **Tabulkové zobrazení** ingrediencí s popisem
- **Statistiky** o počtu ingrediencí s/bez popisu
- **Helper funkcí** pro logování v ostatních částech aplikace

---

## 📋 Funkce pro logování

### 1. `getIngredientsByProblem(problemName: string)`

Hlavní funkce pro načtení ingrediencí z tabulky `ingredient-solution`.

**Soubor:** `src/services/eoSmesiWorkflowService.ts` (řádky 438-511)

**Co se loguje:**
1. **Start log** - Informace o zahájení procesu
2. **Název problému** - Jaký problém se filtruje
3. **Hlavní log** - Počet nalezených ingrediencí
4. **Tabulka** - Console.table s popisem každé ingredience
5. **Detailní výpis** - Číslo, jméno a popis každé ingredience
6. **Summary** - Počet ingrediencí s/bez popisu

**Příklad logu v konzoli:**

```
🌿 [Filtrovat látky podle problému] START
Problém: Bolest hlavy

✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí pro: "Bolest hlavy"

│ Poř. │ Ingredience        │ Popis                                          │
├─────┼────────────────────┼───────────────────────────────────────────────┤
│ 1   │ Máta peprná        │ Osvěžující, chladivá, zmírňuje napětí         │
│ 2   │ Levandule          │ Zklidňující, relaxační, proti stresu          │
│ 3   │ Helichrysum        │ Antiflogistická, regenerační                  │
│ 4   │ Basalicum          │ Analgetické, protizánětlivé vlastnosti        │
│ 5   │ Santálové dřevo    │ Upokojující, konzultativní účinky            │

✨ SOUHRN: 5 ingrediencí (5 s popisem, 0 bez popisu)
```

### 2. `logFilteredIngredients(ingredients, problemName, source)`

Helper funkce pro formátované zalogování seznamu ingrediencí.

**Soubor:** `src/services/eoSmesiWorkflowService.ts` (řádky 985-1042)

**Parametry:**
- `ingredients: IngredientWithDescription[]` - Pole ingrediencí k zalogování
- `problemName: string` - Název problému (pro kontext)
- `source: 'ingredient-solution' | 'slozeni' | 'product'` - Zdroj dat

**Zdroje:**
- `ingredient-solution` - Tabulka pro filtrování podle problému (📋)
- `slozeni` - Tabulka s přesným složením produktu (📦)
- `product` - Data z produktu (🔗)

**Příklad zavolání:**

```typescript
import { logFilteredIngredients } from '../services/eoSmesiWorkflowService';

// Zaloguj ingredience
logFilteredIngredients(ingredients, 'Bolest hlavy', 'ingredient-solution');
```

**Výstup v konzoli:**

```
✨ [INGREDIENCE ZALOGOVÁNO] 📋 ingredient-solution (problém) | Bolest hlavy

│ #  │ Ingredience    │ Popis                                   │
├───┼────────────────┼────────────────────────────────────────┤
│ 1 │ Máta peprná   │ Osvěžující, chladivá, zmírňuje napě...  │
│ 2 │ Levandule     │ Zklidňující, relaxační, proti stresu    │

📊 STATISTIKA: 2 ingrediencí (2 s popisem, 0 bez)
```

---

## 🎯 Místa v aplikaci, kde se logy zobrazují

### 1. EO Smesi Workflow Service (eoSmesiWorkflowService.ts)

**Řádky 438-511:** Funkce `getIngredientsByProblem()`

Zaloguje:
- ✅ Načtené ingredience z tabulky `ingredient-solution`
- ⚠️ Chyby při dotazu na databázi
- 📊 Statistiku (počet s/bez popisu)

---

### 2. SanaChat Component (SanaChat.tsx)

**Řádky ~2960:** Handler "handleProblemSelection" - když uživatel vybere problém z formuláře

**Řádky ~3150:** Flow pro "single problem mode" - když je si agent jistý jedním problémem

**Řádky ~3210:** Hlavní flow - normální zpracování dotazu s volbou módu

**Na těchto místech se loguje:**
- 🔄 Volba módu (PROBLEM MODE vs PRODUCT MODE)
- 📋 PROBLEM MODE = logy z `getIngredientsByProblem()`
- 📦 PRODUCT MODE = logy ingrediencí ze slozeni

**Příklad logu:**

```
🔄 [EO SMESI] Volba módu zobrazení ingrediencí
Filter Mode Enabled: true

📋 PROBLEM MODE AKTIVOVÁN

🌿 [Filtrovat látky podle problému] START
...
```

---

## 📊 Struktura logu - od začátku do konce

### Fáze 1: Zahájení procesu

```
🔄 [EO SMESI] Volba módu zobrazení ingrediencí (Main flow)
Problém: Bolest hlavy
Filter Mode Enabled: true
```

### Fáze 2: Volba módu

```
📋 PROBLEM MODE AKTIVOVÁN
(nebo)
📦 PRODUCT MODE AKTIVOVÁN (slozeni tabulka)
```

### Fáze 3: Načtení ingrediencí

```
🌿 [Filtrovat látky podle problému] START
Problém: Bolest hlavy

✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí pro: "Bolest hlavy"

[Tabulka s ingrediencemi]

✨ SOUHRN: 5 ingrediencí (5 s popisem, 0 bez popisu)
```

### Fáze 4: Finalizace

```
Ingredience ze slozeni (EO1 + EO2 + Prawtein):
[Výpis ingrediencí]
```

---

## 🔴 Chybové stavy - Co se loguje

### Scenario: Žádná data v tabulce

```
⚠️ [ingredient-solution] Žádná data pro problém: "Neznámý problém"
(prázdná odpověď)
```

### Scenario: Chyba pri dotazu na DB

```
⚠️ [ingredient-solution] Žádná data pro problém: "Bolest hlavy"
Detaily chyby: Relation "ingredient-solution" does not exist
```

### Scenario: Kritická chyba

```
❌ [ingredient-solution] KRITICKÁ CHYBA při načítání látek:
Detaily chyby: [Stack trace]
```

---

## 🛠️ Jak interpretovat logy

### Zelené logy = ✅ Úspěch

```
%c✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí
```

Ingredience byly úspěšně načteny z databáze.

### Modré logy = ℹ️ Informace

```
%c🔄 [EO SMESI] Volba módu zobrazení ingrediencí
```

Standardní informační zprávy o průběhu.

### Žluté logy = ⚠️ Upozornění

```
%c⚠️ [ingredient-solution] Žádná data pro problém
```

Něco se nepovedlo, ale aplikace pokračuje (fallback).

### Červené logy = ❌ Chyba

```
%c❌ [ingredient-solution] KRITICKÁ CHYBA
```

Kritická chyba, aplikace může selhat.

---

## 🚀 Jak otevřít DevTools konzoli

### Chrome / Chromium / Edge
- Windows/Linux: `Ctrl + Shift + J`
- macOS: `Cmd + Option + J`

### Firefox
- Windows/Linux: `Ctrl + Shift + K`
- macOS: `Cmd + Option + K`

### Safari
- Zkontroluj, zda je Developer Menu povoleno
- `Cmd + Option + I`

---

## 📝 Příklady logů v praxi

### Příklad 1: Úspěšné načtení ingrediencí (PROBLEM MODE)

```
🔄 [EO SMESI] Volba módu zobrazení ingrediencí (Main flow)
Problém: Bolest hlavy
Filter Mode Enabled: true

📋 PROBLEM MODE AKTIVOVÁN

🌿 [Filtrovat látky podle problému] START
Problém: Bolest hlavy

✅ [Filtrovat látky podle problému] Nalezeno 3 ingrediencí pro: "Bolest hlavy"

│ Poř. │ Ingredience        │ Popis                           │
├─────┼────────────────────┼─────────────────────────────────┤
│ 1   │ Máta peprná        │ Osvěžující, zmírňuje napětí    │
│ 2   │ Levandule          │ Zklidňující, relaxační         │
│ 3   │ Helichrysum        │ Antiflogistická, regenerační   │

═════════════════════════════════════════════════════════════
1. Máta peprná – Osvěžující, zmírňuje napětí
2. Levandule – Zklidňující, relaxační
3. Helichrysum – Antiflogistická, regenerační
═════════════════════════════════════════════════════════════

✨ SOUHRN: 3 ingrediencí (3 s popisem, 0 bez popisu)
```

### Příklad 2: Fallback na PRODUCT MODE

```
🔄 [EO SMESI] Volba módu zobrazení ingrediencí
Filter Mode Enabled: false

📦 PRODUCT MODE AKTIVOVÁN (slozeni tabulka)

Ingredience ze slozeni (EO1 + EO2 + Prawtein):
[
  { name: 'Máta peprná', description: 'Osvěžující...' },
  { name: 'Levandule', description: 'Zklidňující...' }
]
```

---

## 🔍 Debugging tipsů

### Tip 1: Filtruj logy v konzoli

V DevTools konzoli zadej v search box:
```
[EO SMESI]
```

Zobrazí se pouze logy týkající se EO Smesi.

### Tip 2: Zkopíruj tabulku

Klikni pravým tlačítkem na console.table() a vyber "Copy Object".

### Tip 3: Sleduj hodnotu settings

```javascript
// V konzoli:
console.log(chatbotSettings.filter_ingredients_by_problem)
```

Ověří, zda je nastavení správně načteno.

### Tip 4: Zkontroluj obsah tabulky

```javascript
// Přes Supabase dashboard:
// Table: ingredient-solution
// Zkontroluj, zda data existují pro daný problém
```

---

## 📚 Soubory, které byly změněny

### 1. `src/services/eoSmesiWorkflowService.ts`

- **Funkce `getIngredientsByProblem()`** - Vylepšené logování
  - Řádky 438-511
  - Změna: Přidány detailní logy s CSS stylem, console.table, statistika

- **Nová funkce `logFilteredIngredients()`** - Helper pro logování
  - Řádky 985-1042
  - Nová: Znovupoužitelná funkce pro logování ingrediencí

### 2. `src/components/SanaChat/SanaChat.tsx`

- **handleProblemSelection()** - Vylepšené logy volby módu
  - Řádky ~2960-2974
  - Změna: Přidány logy s indikací módu (PROBLEM vs PRODUCT)

- **Single problem mode** - Vylepšené logy
  - Řádky ~3150-3159
  - Změna: Přidány logy s indikací módu

- **Main flow** - Vylepšené logy
  - Řádky ~3210-3233
  - Změna: Přidány logy s indikací módu a problému

---

## 🎓 Jak používat ve vlastním kódu

### Import funkce

```typescript
import { 
  getIngredientsByProblem, 
  logFilteredIngredients 
} from '../../services/eoSmesiWorkflowService';
```

### Příklad 1: Zaloguj ingredience za běhu

```typescript
const ingredients = await getIngredientsByProblem('Bolest hlavy');
logFilteredIngredients(ingredients, 'Bolest hlavy', 'ingredient-solution');
```

### Příklad 2: Zaloguj ingredience z jiného zdroje

```typescript
const ingredients = [
  { name: 'Máta peprná', description: 'Osvěžující' },
  { name: 'Levandule', description: 'Zklidňující' }
];
logFilteredIngredients(ingredients, 'Bolest hlavy', 'slozeni');
```

---

## ✅ Kontrolní seznam

- [x] Vylepšené logování v `getIngredientsByProblem()`
- [x] Nová helper funkce `logFilteredIngredients()`
- [x] Logy volby módu v SanaChat.tsx (3 místa)
- [x] CSS styly pro barevné logy
- [x] Console.table pro ingredience
- [x] Statistika (s/bez popisu)
- [x] Chybové stavy s detaily
- [x] Dokumentace (tento soubor)

---

## 📞 Podpora

Pokud máš problémy s logy nebo vidíš neočekávané chyby:

1. **Ověř DevTools konzoli** - Zkontroluj, zda se logy zobrazují
2. **Zkontroluj databázi** - Jsou data v tabulce `ingredient-solution`?
3. **Ověř nastavení** - Je `filter_ingredients_by_problem` správně nastaveno?
4. **Vyzkoušej obě módy** - PROBLEM MODE i PRODUCT MODE
5. **Restartuj aplikaci** - Někdy Vite servír potřebuje restart

---

**Poslední update:** 2026-03-09
