# ⚡ QUICK START - Logování Ingrediencí

## 🎯 V 60 sekund

### Co se změnilo?
Aplikace EO Smesi nyní loguje seznam ingrediencí z tabulky `ingredient-solution` v **barevné a strukturované formě** v DevTools konzoli.

### Jak se to spustí?

1. **Otevři DevTools**
   ```
   F12 nebo Ctrl+Shift+J (Chrome)
   Cmd+Option+J (Mac)
   ```

2. **Jdi na Console tab**
   ```
   Zobrazí se konzola s logy
   ```

3. **Spusť EO Smesi chat**
   ```
   Zadej dotaz: "Bolí mě hlava"
   ```

4. **Podívej se do konzole** 🌿
   ```
   Měl bys vidět:
   ✅ Nalezeno 5 ingrediencí...
   [tabulka s ingrediencemi]
   ✨ SOUHRN: 5 ingrediencí (5 s popisem, 0 bez)
   ```

---

## 📊 Příklad logu, který vidíš

```
🔄 [EO SMESI] Volba módu zobrazení ingrediencí
Filter Mode Enabled: true

📋 PROBLEM MODE AKTIVOVÁN

🌿 [Filtrovat látky podle problému] START
Problém: Bolest hlavy

✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí...

│ Poř. │ Ingredience        │ Popis                           │
├─────┼────────────────────┼─────────────────────────────────┤
│ 1   │ Máta peprná        │ Osvěžující, chladivá            │
│ 2   │ Levandule          │ Zklidňující, relaxační          │
│ 3   │ Helichrysum        │ Antiflogistická, regenerační    │

✨ SOUHRN: 3 ingrediencí (3 s popisem, 0 bez)
```

---

## 🎨 Ikony a barvy

```
🌿 Zelená = START/OK
📋 Zelená = PROBLEM MODE je ON
📦 Modrá = PRODUCT MODE (fallback)
⚠️ Žlutá = Upozornění
❌ Červená = Chyba
```

---

## 🔍 Filtrování logu

V konzoli klikni na search (`Ctrl+F`) a hledej:
```
[EO SMESI]
```

Zobrazí se jen relevantní logy.

---

## 📁 Soubory, které se změnily

```
✅ src/services/eoSmesiWorkflowService.ts
   - getIngredientsByProblem() - vylepšené logy
   - logFilteredIngredients() - nová helper funkce
   
✅ src/components/SanaChat/SanaChat.tsx
   - 3 místa s logy volby módu
```

---

## 📚 Kde se dozvědět víc?

Podívej se na tyto soubory:

1. **EO_SMESI_INGREDIENTS_LOGGING.md** ← Detailný průvodce
2. **EO_SMESI_LOGGING_EXAMPLES.md** ← Vizuální příklady
3. **CHANGELOG_EO_SMESI_LOGGING.md** ← Co se změnilo
4. **LOGGING_HOTOVO.md** ← Úplné shrnutí

---

## ✅ Co si vyzkoušet

**Test 1: Normální flow**
```
1. Spusť chat
2. Zadej: "Bolí mě hlava"
3. Otevři DevTools
4. Podívej se na logy
```

**Test 2: Filtrování**
```
1. V konzoli klikni: Ctrl+F
2. Hledej: [EO SMESI]
3. Měly by se zvýraznit logy
```

**Test 3: Statistika**
```
1. Podívej se na poslední log
2. Měl by být: "✨ SOUHRN: X ingrediencí..."
3. Zkontroluj počet s/bez popisu
```

---

## 🚀 Ready to go!

Build je úspěšný ✅ a aplikace je připravená.

Otevři konzoli a **vyzkoušej nové logy!** 🌿

---

**Poslední update:** 2026-03-09
