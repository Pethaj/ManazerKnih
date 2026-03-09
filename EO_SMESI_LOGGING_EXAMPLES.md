# 📺 Příklady logu - Vizuální průvodce

Tento soubor ukazuje, jak vypadají logy v DevTools konzoli, krok za krokem.

---

## 📋 SCENARIO 1: Úspěšné načtení ingrediencí (PROBLEM MODE)

### Situace:
- Uživatel: "Bolí mě hlava"
- Chatbot: Klasifikuje problém "Bolest hlavy"
- Nastavení: `filter_ingredients_by_problem = true` (PROBLEM MODE)

### Logy v konzoli (v pořadí):

```
═══════════════════════════════════════════════════════════════
1. VOLBA MÓDU
═══════════════════════════════════════════════════════════════

🔄 [EO SMESI] Volba módu zobrazení ingrediencí (Main flow)
Problém: Bolest hlavy
Filter Mode Enabled: true
```

↓ (v barvě fialové pro titulky s modrou logiku)

```
═══════════════════════════════════════════════════════════════
2. POTVRZENÍ MÓDU
═══════════════════════════════════════════════════════════════

📋 PROBLEM MODE AKTIVOVÁN
```

↓ (zelená = OK)

```
═══════════════════════════════════════════════════════════════
3. START FUNKCE
═══════════════════════════════════════════════════════════════

🌿 [Filtrovat látky podle problému] START
Problém: Bolest hlavy
```

↓ (tmavě zelená)

```
═══════════════════════════════════════════════════════════════
4. DOTAZ NA DATABÁZI
═══════════════════════════════════════════════════════════════

SQL: SELECT ingredience, popis FROM "ingredient-solution" 
     WHERE kategorie = 'Bolest hlavy'

Výsledek: 5 záznamů nalezeno
```

↓

```
═══════════════════════════════════════════════════════════════
5. ÚSPĚŠNÉ NAČTENÍ - POČET
═══════════════════════════════════════════════════════════════

✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí pro: "Bolest hlavy"
```

↓ (jasně zelená)

```
═══════════════════════════════════════════════════════════════
6. TABULKOVÝ FORMÁT
═══════════════════════════════════════════════════════════════

┌───┬────────────────────┬──────────────────────────────────────┐
│ # │ Ingredience        │ Popis                                │
├───┼────────────────────┼──────────────────────────────────────┤
│ 1 │ Máta peprná        │ Osvěžující, chladivá, zmírňuje n... │
│ 2 │ Levandule          │ Zklidňující, relaxační, proti st... │
│ 3 │ Helichrysum        │ Antiflogistická, regenerační        │
│ 4 │ Basalicum          │ Analgetické, protizánětlivé vlast... │
│ 5 │ Santálové dřevo    │ Upokojující, konzultativní účinky   │
└───┴────────────────────┴──────────────────────────────────────┘
```

↓

```
═══════════════════════════════════════════════════════════════
7. DETAILNÍ VÝPIS
═══════════════════════════════════════════════════════════════

═════════════════════════════════════════════════════════════════
1. Máta peprná – Osvěžující, chladivá, zmírňuje napětí
2. Levandule – Zklidňující, relaxační, proti stresu  
3. Helichrysum – Antiflogistická, regenerační
4. Basalicum – Analgetické, protizánětlivé vlastnosti
5. Santálové dřevo – Upokojující, konzultativní účinky
═════════════════════════════════════════════════════════════════
```

↓ (v šedé barvě pro oddělení)

```
═══════════════════════════════════════════════════════════════
8. STATISTIKA
═══════════════════════════════════════════════════════════════

✨ SOUHRN: 5 ingrediencí (5 s popisem, 0 bez popisu)
```

↓ (modrá na světlém pozadí)

```
═══════════════════════════════════════════════════════════════
9. FINALIZACE
═══════════════════════════════════════════════════════════════

[Console group zavřen]
```

---

## 🎨 Barvy v konzoli

| Barva | Případ | Příklad |
|-------|--------|---------|
| **Zelená (#2ecc71)** | Úspěch | ✅ Nalezeno 5 ingrediencí |
| **Modrá (#3498db)** | Info | 📋 PROBLEM MODE AKTIVOVÁN |
| **Fialová (#9b59b6)** | Volba | 🔄 Volba módu |
| **Žlutá (#f39c12)** | Upozornění | ⚠️ Žádná data |
| **Červená (#e74c3c)** | Chyba | ❌ KRITICKÁ CHYBA |
| **Šedá (#95a5a6)** | Oddělení | ════════════ |

---

## 📋 SCENARIO 2: Fallback na PRODUCT MODE

### Situace:
- Uživatel: "Bolí mě hlava"
- Chatbot: Klasifikuje problém "Bolest hlavy"
- Nastavení: `filter_ingredients_by_problem = false` (PRODUCT MODE - fallback)

### Logy v konzoli:

```
═══════════════════════════════════════════════════════════════
1. VOLBA MÓDU
═══════════════════════════════════════════════════════════════

🔄 [EO SMESI] Volba módu zobrazení ingrediencí (Main flow)
Problém: Bolest hlavy
Filter Mode Enabled: false
```

↓

```
═══════════════════════════════════════════════════════════════
2. POTVRZENÍ MÓDU
═══════════════════════════════════════════════════════════════

📦 PRODUCT MODE AKTIVOVÁN (slozeni tabulka)
```

↓ (modrá - fallback mód)

```
═══════════════════════════════════════════════════════════════
3. INGREDIENCE ZE SLOZENI
═══════════════════════════════════════════════════════════════

Ingredience ze slozeni (EO1 + EO2 + Prawtein):
[
  {
    "name": "Máta peprná",
    "description": "Osvěžující, chladivá, zmírňuje napětí"
  },
  {
    "name": "Levandule",
    "description": "Zklidňující, relaxační, proti stresu"
  },
  {
    "name": "Helichrysum",
    "description": "Antiflogistická, regenerační"
  }
]
```

↓

```
═══════════════════════════════════════════════════════════════
4. KONEC LOGU
═══════════════════════════════════════════════════════════════

[Ingredience se zobrazí v UI chatu]
```

---

## 🔴 SCENARIO 3: Chyba - Žádná data

### Situace:
- Uživatel: Dotaz na neznámý problém
- Nastavení: `filter_ingredients_by_problem = true`

### Logy v konzoli:

```
🌿 [Filtrovat látky podle problému] START
Problém: Neznámý problém

⚠️ [ingredient-solution] Žádná data pro problém: "Neznámý problém"
(prázdná odpověď)
```

↓ (žlutá - upozornění)

```
Aplikace fallbackuje na PRODUCT MODE
```

---

## ❌ SCENARIO 4: Kritická chyba

### Situace:
- Databáze není dostupná
- Chyba v Supabase klientovi

### Logy v konzoli:

```
🌿 [Filtrovat látky podle problému] START
Problém: Bolest hlavy

⚠️ [ingredient-solution] Žádná data pro problém: "Bolest hlavy"
Detaily chyby: PGERROR: relation "ingredient-solution" does not exist

❌ [ingredient-solution] KRITICKÁ CHYBA při načítání látek:
Detaily chyby: Error: Failed to fetch
    at async getIngredientsByProblem 
    (eoSmesiWorkflowService.ts:440)
```

↓ (červená - kritická chyba)

```
Aplikace pokračuje s prázdným polem ingrediencí []
```

---

## 🔍 Jak číst console.group() logy

V Developer Tools konzoli se skupiny logu zobrazují takto:

```
▼ ✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí...
  │
  ├─ console.table() [tabulka]
  │
  ├─ console.log() 1. Máta peprná – ...
  ├─ console.log() 2. Levandule – ...
  ├─ console.log() 3. Helichrysum – ...
  ├─ console.log() 4. Basalicum – ...
  ├─ console.log() 5. Santálové dřevo – ...
  │
  └─ ✨ SOUHRN: 5 ingrediencí...
```

**Interakce:**
- Klikni na ▼ pro rozbalení/sbalení skupiny
- Skupiny se otevírají automaticky při prvním logu

---

## 📊 Příklad console.table() formátu

Jak se zobrazuje tabulka:

```
┌───┬────────────────────┬───────────────────────────────────────────────┐
│ # │ Ingredience        │ Popis                                         │
├───┼────────────────────┼───────────────────────────────────────────────┤
│ 1 │ Máta peprná        │ Osvěžující, chladivá, zmírňuje napětí       │
│ 2 │ Levandule          │ Zklidňující, relaxační, proti stresu         │
│ 3 │ Helichrysum        │ Antiflogistická, regenerační                 │
│ 4 │ Basalicum          │ Analgetické, protizánětlivé vlastnosti       │
│ 5 │ Santálové dřevo    │ Upokojující, konzultativní účinky            │
└───┴────────────────────┴───────────────────────────────────────────────┘
```

**Vlastnosti:**
- Kliknutím na záhlaví sloupce (# / Ingredience / Popis) se řadí
- Pravý klik → "Copy Object" kopíruje celou tabulku

---

## 💡 Debugging tipsů

### Tip 1: Hledej "[EO SMESI]" v search
V DevTools konzoli:
```
Ctrl+F → "[EO SMESI]"
```
Zobrazí se jen relevantní logy.

### Tip 2: Zkopíruj tabulku
```
Pravý klik na console.table() → Copy Object
```
Vloží JSON do clipboardu.

### Tip 3: Zkontroluj barvu módu
- 📋 Zelená = PROBLEM MODE OK
- 📦 Modrá = PRODUCT MODE fallback

### Tip 4: Počítej ingredience
```
SOUHRN: X ingrediencí (Y s popisem, Z bez)
```

---

## 🎯 Co se očekává vidět

### PERFECT ✅
```
🔄 [EO SMESI] Volba módu
Filter Mode Enabled: true
📋 PROBLEM MODE AKTIVOVÁN
✅ [Filtrovat látky podle problému] Nalezeno 5 ingrediencí...
✨ SOUHRN: 5 ingrediencí (5 s popisem, 0 bez)
```

### FALLBACK ⚠️
```
🔄 [EO SMESI] Volba módu
Filter Mode Enabled: false
📦 PRODUCT MODE AKTIVOVÁN
Ingredience ze slozeni: [...]
```

### CHYBA ❌
```
❌ [ingredient-solution] KRITICKÁ CHYBA
Aplikace pokračuje s prázdným polem
```

---

## 📝 Poznámka

Všechny příklady logu jsou skutečné a reflektují aktuální implementaci.

Pokud vidíš jiné logy, zkontroluj:
1. Verzi kódu - potřebuješ nejnovější commit?
2. Nastavení - je `filter_ingredients_by_problem` správně?
3. DevTools - je filtr vypnutý?

**Poslední update:** 2026-03-09
