# 🧪 Test Guide: Screening Prompt Fix

## ⚡ Rychlý test (5 minut)

### Krok 1: Otevři EO-Smesi chat

Spusť aplikaci a otevři chatbot **EO-Smesi**

---

### Krok 2: Test původního problému

**Dotaz:**
```
jaké jsou směsi na zdraví zubů?
```

**Očekávaný výsledek:**

#### Console log:
```javascript
📦 GPT identifikoval X produktů: ["DENT", ...možná další produkty...]

// ✅ MĚLO BY BÝT:
- DENT (konkrétní produkt)
- PEPPERMINT (pokud zmíněn)
- EUKALYPTUS (pokud zmíněn)

// ❌ NEMĚLO BY BÝT:
- "svěží dech"
- "zdraví zubů"
- "záněty dásní"
- "obranyschopnost"
```

#### Product Pills:
```
✅ [🛒 Dent esenciální olej]  ← Správně
❌ [🛒 Pure esenciální olej]  ← Neměl by se objevit!
```

**Validace:**
- ✅ Pouze DENT product pill (+ možná další KONKRÉTNÍ produkty)
- ✅ ŽÁDNÝ pill pro "Pure" nebo "Svěží domov"

---

### Krok 3: Test wany produktů

**Dotaz:**
```
bolí mě hlava, co doporučíte?
```

**Očekávaný screening:**
```javascript
["009", "Te Xiao Bi Min Gan Wan"]  // Pokud bot tyto produkty zmíní
// NEMĚLO BY obsahovat: "bolest hlavy", "hlavní bolest", atd.
```

**Product Pills:**
```
✅ [🛒 009 - Čistý dech]  ← Pokud zmíněn
✅ [🛒 Te Xiao Bi Min Gan Wan]  ← Pokud zmíněn
```

---

### Krok 4: Test esenciální oleje

**Dotaz:**
```
máte PEPPERMINT nebo EUKALYPTUS?
```

**Očekávaný screening:**
```javascript
["PEPPERMINT", "EUKALYPTUS"]
```

**Product Pills:**
```
✅ [🛒 PEPPERMINT]
✅ [🛒 EUKALYPTUS]
```

---

### Krok 5: Negative test (žádné produkty)

**Dotaz:**
```
jak udržovat svěží dech bez produktů?
```

**Očekávaný screening:**
```javascript
[]  // Prázdné pole - žádné produkty
```

**Product Pills:**
```
❌ Žádné pills by se neměly objevit
```

---

## 🔍 Console monitoring checklist

Pro každý test sleduj Console (F12):

### 1. Screening log

```javascript
🔍 Zahajuji screening produktů z odpovědi...
📦 GPT identifikoval X produktů: [...]
```

**Kontroluj:**
- ✅ Pole obsahuje pouze KONKRÉTNÍ názvy produktů
- ❌ Pole NEOBSAHUJE obecné fráze ("svěží dech", "zdraví zubů")

---

### 2. Matching log

```javascript
✅ Match: "DENT" → "Dent esenciální olej" (95%)
```

**Kontroluj:**
- ✅ Matching našel správný produkt
- ✅ URL je validní (začíná `bewit.love`)

---

### 3. Marker insertion

```javascript
📝 Finální text s markery (preview): ...<<<PRODUCT:774|||...|||Dent...>>>...
```

**Kontroluj:**
- ✅ Markery jsou pro správné produkty
- ❌ NEJSOU markery pro "Pure" nebo jiné false positives

---

## 📊 Success kritéria

### Minimální (MUSÍ projít):

- [x] Test 1 (zdraví zubů): NEIDENTIFIKUJE "svěží dech"
- [x] Test 1 (zdraví zubů): Pouze "DENT" product pill
- [x] Test 5 (negative): Žádné pills

### Kompletní (doporučeno):

- [x] Test 1: ✅
- [x] Test 2: ✅ (wany produkty správně)
- [x] Test 3: ✅ (esenciální oleje správně)
- [x] Test 4: ✅ (negative test)
- [x] Console logy čisté (bez errorů)

---

## 🐛 Debugging

### Problém: Stále identifikuje "svěží dech"

**Checklist:**

1. **Ověř, že změna promptu je aktivní:**
   ```bash
   # Zkontroluj obsah souboru
   cat src/services/inlineProductScreeningService.ts | grep "CO NEIDENTIFIKOVAT"
   ```
   Očekávané: Mělo by se zobrazit "CO NEIDENTIFIKOVAT"

2. **Hard refresh aplikace:**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)
   - Vyprázdni cache

3. **Zkontroluj Console log:**
   ```javascript
   📊 Screening výsledek: { products: [...] }
   ```
   - Pokud stále obsahuje "svěží dech", prompt možná nebyl načten

---

### Problém: Neidentifikuje žádné produkty

**Možné příčiny:**

1. **Prompt je příliš striktní**
   - Zkontroluj, zda bot vůbec zmínil nějaké produkty v odpovědi
   - Bot může odpovědět obecně bez konkrétních produktů

2. **Edge Function error**
   - Zkontroluj Console na chyby typu "Edge Function chyba"
   - Zkontroluj network tab (F12 → Network)

---

## 📝 Test reportování

Po dokončení testů vyplň:

### Test 1: Zdraví zubů
- [ ] PASS: Neidentifikuje "svěží dech"
- [ ] PASS: Pouze konkrétní produkty
- [ ] FAIL: (popis problému)

### Test 2: Wany produkty
- [ ] PASS
- [ ] FAIL: (popis problému)

### Test 3: Esenciální oleje
- [ ] PASS
- [ ] FAIL: (popis problému)

### Test 4: Negative test
- [ ] PASS: Žádné pills
- [ ] FAIL: (popis problému)

---

## 🎯 Next steps

**Pokud všechny testy projdou:**
✅ Fix funguje! Můžeš používat EO-Smesi chat s product pills.

**Pokud něco selhává:**
1. Zkontroluj debugging sekci výše
2. Zkus hard refresh
3. Zkontroluj Console logy
4. Reportuj problém s detaily

---

**Happy testing! 🚀**

Pro detaily viz: `FIX_PRODUCT_SCREENING_PROMPT.md`
