# 🔧 Fix: Product Screening Prompt - Varianta A

## 🎯 Problém

**Situace:**
- User se zeptal: "jaké jsou směsi na zdraví zubů?"
- GPT screening identifikoval: `["DENT", "svěží dech", "obranyschopnost", ...]`
- Fuzzy matching našel:
  - ✅ "DENT" → Dent esenciální olej (SPRÁVNĚ)
  - ❌ "svěží dech" → Pure esenciální olej (Svěží domov) (ŠPATNĚ)

**Root cause:**
- GPT screening byl příliš agresivní
- Identifikoval **obecné fráze** a **účinky** místo konkrétních názvů produktů
- Fráze "svěží dech" v kontextu "ústní voda PRO svěží dech" byla chybně považována za produkt

---

## ✅ Řešení: Varianta A

### Upravený System Prompt

**Soubor:** `src/services/inlineProductScreeningService.ts`

**Změny:**

#### PŘED:
```javascript
const SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu...

Tvým úkolem je identifikovat v textu:
1. Názvy produktů/wanů
2. Pinyin názvy
3. Zdravotní témata relevantní pro BEWIT produkty  // ❌ Příliš široké

**PRAVIDLA:**
- Hledej produkty/témata zmíněné V TEXTU  // ❌ Zahrnuje témata
- Pro témata použij široké pojmy (např. "bolest hlavy", "trávení")  // ❌ Problém!
`;
```

#### PO:
```javascript
const SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu a esenciální oleje BEWIT.

Tvým úkolem je identifikovat v textu POUZE **KONKRÉTNÍ NÁZVY PRODUKTŮ**.

**CO IDENTIFIKOVAT:**
1. Názvy esenciálních olejů - např. "DENT", "PEPPERMINT", "EUKALYPTUS"
2. Názvy směsí - např. "Imm", "Pure", "Relax"
3. Wany (čínské směsi) - např. "009 - Čistý dech", "Shi Xiao Wan"
4. Pinyin názvy - např. "Te Xiao Bi Min Gan Wan"
5. Produktové kódy - např. "009", "033"

**CO NEIDENTIFIKOVAT (IGNORUJ):**
❌ Obecné fráze typu: "svěží dech", "zdraví zubů", "bolest hlavy"
❌ Účinky produktů: "antibakteriální", "protizánětlivé"
❌ Tělesné části: "ústní dutina", "dásně", "zuby"
❌ Symptomy: "záněty", "citlivost", "paradontóza"
❌ Popisné fráze v kontextu "něco PRO X": "výplach PRO svěží dech"

**KLÍČOVÁ PRAVIDLA:**
- Identifikuj POUZE pokud je text **přímo název produktu**, ne jeho účinek
- Pokud vidíš frázi "pro/na + X", IGNORUJ "X"
- Preferuj názvy v UPPERCASE nebo s číselnými kódy
`;
```

---

## 📊 Očekávaný výsledek

### Test case: "jaké jsou směsi na zdraví zubů?"

**PŘED (špatně):**
```javascript
Screening identifikuje: [
  "DENT",                    // ✅ Správně
  "svěží dech",              // ❌ Obecná fráze
  "zdraví zubů",             // ❌ Obecná fráze
  "záněty dásní",            // ❌ Symptom
  "obranyschopnost",         // ❌ Účinek
  // atd.
]

Matching:
- "svěží dech" → Pure esenciální olej (Svěží domov)  // ❌ False positive
```

**PO (správně):**
```javascript
Screening identifikuje: [
  "DENT",                    // ✅ Konkrétní produkt
  "PEPPERMINT",              // ✅ Konkrétní produkt (pokud zmíněn)
  "EUKALYPTUS",              // ✅ Konkrétní produkt (pokud zmíněn)
  // Obecné fráze IGNOROVÁNY
]

Matching:
- "DENT" → Dent esenciální olej  // ✅ Správně
```

---

## 🎨 Příklady nového chování

### Příklad 1: Ústní hygiena

**Text:**
```
Doporučuji směs DENT pro ústní hygienu. Pomáhá při zánětech dásní 
a udržuje svěží dech.
```

**Screening:**
```json
["DENT"]
```

**Proč:**
- ✅ "DENT" = konkrétní název produktu
- ❌ "svěží dech" = účinek (v kontextu "udržuje svěží dech")
- ❌ "záněty dásní" = symptom

---

### Příklad 2: Wan produkty

**Text:**
```
Pro bolest hlavy zkuste wan 009 - Čistý dech nebo Te Xiao Bi Min Gan Wan.
```

**Screening:**
```json
["009", "Te Xiao Bi Min Gan Wan"]
```

**Proč:**
- ✅ "009" = produktový kód
- ✅ "Te Xiao Bi Min Gan Wan" = pinyin název
- ❌ "bolest hlavy" = symptom (IGNOROVÁNO)

---

### Příklad 3: Žádné produkty

**Text:**
```
Pro svěží dech a zdravé zuby používejte pravidelnou ústní hygienu.
```

**Screening:**
```json
[]
```

**Proč:**
- ❌ "svěží dech" = obecná fráze, ne produkt
- ❌ "zdravé zuby" = obecná fráze, ne produkt

---

## 🔍 Validace

### Test checklist

Pro ověření, že fix funguje:

**Test 1: Původní problémový dotaz**
```
Dotaz: "jaké jsou směsi na zdraví zubů?"

Očekáváno:
- Screening: ["DENT"] (možná další konkrétní produkty)
- NEIDENTIFIKUJE: "svěží dech", "zdraví zubů"
```

**Test 2: Wany produkty**
```
Dotaz: "bolí mě hlava"

Očekáváno:
- Screening: ["009", "Te Xiao Bi Min Gan Wan"] (pokud zmíněny)
- NEIDENTIFIKUJE: "bolest hlavy"
```

**Test 3: Esenciální oleje**
```
Dotaz: "co je PEPPERMINT a EUKALYPTUS?"

Očekáváno:
- Screening: ["PEPPERMINT", "EUKALYPTUS"]
```

---

## 📈 Výhody tohoto řešení

### ✅ Pros:

1. **Žádné false positives**
   - Screening už nebude identifikovat obecné fráze

2. **Rychlé**
   - Pouze úprava promptu, žádné nové služby

3. **Snadná údržba**
   - Vše na jednom místě (SYSTEM_PROMPT)

4. **Explicitní příklady**
   - Prompt obsahuje konkrétní "CO NEIDENTIFIKOVAT"

5. **Konzistentní**
   - Aplikuje se na všechny chatboty s `inline_product_links = true`

---

## 🚨 Edge cases & omezení

### Potenciální problémy:

1. **Produkt jménem "Svěží dech"**
   - Pokud existuje produkt s názvem "Svěží dech", může být problém
   - Řešení: GPT by měl rozpoznat z kontextu (uppercase, mention jako produkt)

2. **Produkty s obecnými názvy**
   - Např. "Relaxace", "Energie"
   - Screening může být konzervativní
   - Řešení: Pokud jsou zmíněny jako produkty (uppercase), měly by být detekovány

3. **Pinyin vs. obecná slova**
   - Některé pinyin názvy mohou být podobné obecným slovům
   - Řešení: Pinyin obvykle obsahuje "Wan", "Tang", které jsou indicators

---

## 🔄 Rollback (pokud potřeba)

Pokud by nový prompt způsoboval problémy:

```javascript
// Vrátit starý SYSTEM_PROMPT z gitu:
git diff HEAD~1 src/services/inlineProductScreeningService.ts
git checkout HEAD~1 -- src/services/inlineProductScreeningService.ts
```

---

## 📚 Související

- `EO_SMESI_PRODUCT_PILLS_SETUP.md` - Setup EO-Smesi product pills
- `PRODUCT_NAME_MATCHING_SETUP.md` - Matching služba
- `inlineProductScreeningService.ts` - Screening služba (upraveno)

---

**Datum implementace:** 2026-01-15  
**Varianta:** A (Screening prompt upgrade)  
**Status:** ✅ Implementováno  
**Testováno:** ⏳ Čeká na user testing
