# 🧪 Metadata 3 - Testování

## Testovací scénáře

### Scénář 1: PDF s OCR textem

**Cíl:** Ověřit, že aplikace správně detekuje OCR a použije textový model

**Kroky:**
1. Nahrajte PDF s OCR textem (např. digitálně vytvořený PDF)
2. Otevřete knihu a klikněte **"Upravit"**
3. Klikněte **"🤖 Metadata 3"**
4. Potvrďte dialog
5. Otevřete konzoli (F12) a sledujte log

**Očekávaný výsledek:**
```
🤖 Spouštím inteligentní extrakci metadat...
📥 Vytvářím signed URL pro PDF...
✅ Signed URL vytvořena
🤖 Volám inteligentní extrakční službu...
📄 Pokus o extrakci textu z prvních 10 stránek PDF...
✅ Text extrahován: XXXX znaků
🔍 OCR detekce: ✅ Obsahuje text (XXXX znaků)
📡 Volám Edge Function s typem: text
✅ Edge Function response: { success: true, type: "text", model: "meta-llama/llama-3.1-8b-instruct" }
✅ Metadata úspěšně extrahována
```

**Kontrola:**
- [ ] Detekce OCR proběhla správně (✅ Obsahuje text)
- [ ] Použit model: `meta-llama/llama-3.1-8b-instruct`
- [ ] Metadata vyplněna (title, author, atd.)
- [ ] Žádné chyby v konzoli

---

### Scénář 2: PDF bez OCR textu (sken)

**Cíl:** Ověřit, že aplikace správně detekuje chybějící OCR a použije vision model

**Kroky:**
1. Nahrajte PDF bez OCR (např. naskenovaný dokument)
2. Otevřete knihu a klikněte **"Upravit"**
3. Klikněte **"🤖 Metadata 3"**
4. Potvrďte dialog
5. Otevřete konzoli (F12) a sledujte log

**Očekávaný výsledek:**
```
🤖 Spouštím inteligentní extrakci metadat...
📥 Vytvářím signed URL pro PDF...
✅ Signed URL vytvořena
🤖 Volám inteligentní extrakční službu...
📄 Pokus o extrakci textu z prvních 10 stránek PDF...
✅ Text extrahován: 50 znaků
🔍 OCR detekce: ❌ Neobsahuje dostatek textu (50 znaků)
❌ PDF nemá OCR text → používám vision model
📄 Konvertuji prvních 10 stránek PDF na obrázky...
✅ Převod dokončen! Vytvořeno 10 obrázků
📡 Volám Edge Function s typem: images
✅ Edge Function response: { success: true, type: "images", model: "openai/gpt-4o-mini" }
✅ Metadata úspěšně extrahována
```

**Kontrola:**
- [ ] Detekce OCR proběhla správně (❌ Neobsahuje dostatek textu)
- [ ] PDF převedeno na obrázky (10 stránek)
- [ ] Použit model: `openai/gpt-4o-mini`
- [ ] Metadata vyplněna
- [ ] Žádné chyby v konzoli

---

### Scénář 3: Edge Function test

**Cíl:** Ověřit, že Edge Function funguje samostatně

**Příkaz:**
```bash
curl -X POST \
  'https://modopafybeslbcqjxsve.supabase.co/functions/v1/extract-metadata-ai' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "text",
    "content": "Tato kniha je o přírodní medicíně a bylinách. Autor: Jan Novák. Vydáno v roce 2023 nakladatelstvím Zdraví pro všechny. Kniha obsahuje přehled léčivých bylin České republiky.",
    "fileName": "test-kniha.pdf"
  }'
```

**Očekávaná odpověď:**
```json
{
  "success": true,
  "metadata": {
    "title": "Přírodní medicína a byliny",
    "author": "Jan Novák",
    "publicationYear": 2023,
    "publisher": "Zdraví pro všechny",
    "language": "Čeština",
    "summary": "Přehled léčivých bylin České republiky...",
    "keywords": ["přírodní medicína", "byliny", "zdraví", ...],
    "releaseVersion": "1. vydání"
  },
  "model": "meta-llama/llama-3.1-8b-instruct",
  "type": "text"
}
```

**Kontrola:**
- [ ] HTTP status: 200
- [ ] `success: true`
- [ ] Metadata obsahují správné údaje
- [ ] Model: `meta-llama/llama-3.1-8b-instruct`

---

### Scénář 4: Chybové stavy

#### 4a. Neplatný API klíč

**Simulace:** Dočasně odstraňte `OPENROUTER_API_KEY` ze Supabase Secrets

**Očekávaná chyba:**
```
❌ Chyba při inteligentní extrakci metadat:
Edge Function error: 500 - OPENROUTER_API_KEY není nastaven v Supabase Secrets
```

**Kontrola:**
- [ ] Uživatel vidí srozumitelnou chybu
- [ ] V konzoli jasná chybová zpráva

#### 4b. Nečitelný PDF

**Simulace:** Pokus o zpracování poškozeného PDF

**Očekávaná chyba:**
```
❌ Chyba při inteligentní extrakci metadat:
Nepodařilo se převést PDF na obrázky: ...
```

**Kontrola:**
- [ ] Aplikace nepadne
- [ ] Uživatel vidí chybu
- [ ] Možnost zkusit znovu

---

## Testovací checklist

### Před nasazením do produkce

- [ ] **Edge Function nasazena** v Supabase
- [ ] **API klíč nastaven** v Supabase Secrets (`OPENROUTER_API_KEY`)
- [ ] **Test Edge Function** (curl command)
- [ ] **PDF s OCR** - test funkčnosti
- [ ] **PDF bez OCR** - test funkčnosti
- [ ] **Metadata vyplnění** - všechna pole fungují
- [ ] **Chybové stavy** - graceful handling
- [ ] **UI tlačítko** - viditelné a funkční
- [ ] **Loading state** - uživatel vidí progress
- [ ] **Konzole** - žádné neočekávané chyby

### Performance testy

- [ ] **Rychlost - text model:** < 10 sekund
- [ ] **Rychlost - vision model:** < 60 sekund
- [ ] **Velikost PDF:** funguje pro 1-50 stránek
- [ ] **Memory leak:** žádné úniky paměti při opakovaném použití

### Bezpečnost

- [ ] **API klíč** - nikde v client kódu
- [ ] **Edge Function** - CORS správně nastaven
- [ ] **Supabase secrets** - API klíč v secretech
- [ ] **Signed URLs** - používány pro PDF download

---

## Debug tip

Pro detailní debugging zapněte console logging:

```javascript
// V konzoli prohlížeče
localStorage.setItem('DEBUG', 'true');
```

Poté při každém volání Metadata 3 uvidíte detailní log všech kroků.

---

## Známé problémy a řešení

### 1. CORS Error při volání Edge Function

**Problém:** 
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Řešení:**
Edge Function má správně nastavené CORS headery. Zkontrolujte, že používáte správnou URL a že je funkce nasazená.

### 2. PDF.js worker error

**Problém:**
```
❌ PDF.js není načten!
```

**Řešení:**
PDF.js je načítán z CDN v `index.html`. Zkontrolujte síťové připojení a že CDN je dostupné.

### 3. Timeout při velkých PDF

**Problém:**
Zpracování trvá příliš dlouho (>5 minut)

**Řešení:**
- Použijte menší PDF (< 50 stránek)
- Funkce zpracovává pouze prvních 10 stránek
- Zkontrolujte kvalitu/velikost obrázků v PDF

### 4. Metadata nejsou přesná

**Problém:**
AI vyplní špatná data

**Řešení:**
- Pro lepší přesnost použijte "Vyplnit metadata" po OCR webhooků
- Metadata 3 je optimalizováno pro rychlost, ne maximální přesnost
- Vždy zkontrolujte metadata před uložením

---

## Kontakt při problémech

Pokud najdete bug nebo máte dotaz:
1. Zkontrolujte konzoli (F12)
2. Zkontrolujte Supabase Edge Function logs
3. Ověřte OpenRouter API status: https://openrouter.ai/docs




