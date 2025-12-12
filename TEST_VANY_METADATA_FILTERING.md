# Test: Vany Chat Metadata Filtering

## Účel testu
Ověřit, že když admin nastaví chatbotu pouze některé kategorie, zobrazí se v chatu pouze tyto kategorie a defaultně budou zaškrtnuté.

---

## Testovací scénář 1: Základní funkčnost

### Příprava
1. Přihlas se jako admin
2. Přejdi do "Správa chatbotů"
3. Najdi nebo vytvoř chatbot "vany_chat"

### Krok 1: Nastavení chatbota
**Akce:**
- V sekci "Povolené kategorie" **odškrtni všechny kategorie KROMĚ:**
  - ✅ Wany
  - ✅ TČM
- Klikni "Uložit změny"

**Očekávaný výsledek:**
- ✅ Zobrazí se zpráva "Nastavení úspěšně uloženo"
- ✅ Stránka se obnoví a v nastavení jsou stále zaškrtnuty pouze Wany a TČM

---

### Krok 2: Otevření chatu
**Akce:**
- Přejdi na chat s vany_chat (např. `/vany-chat` nebo přes rozcestník)
- Otevři filtrační panel (posuvník "Filtry" v headeru)

**Očekávaný výsledek:**
✅ **Ve filtračním panelu vidíš:**
- Kategorie léčby:
  - 🔵 **Wany** (zaškrtnuté - modré tlačítko)
  - 🔵 **TČM** (zaškrtnuté - modré tlačítko)
- Ostatní kategorie (Aromaterapie, Masáže, Akupunktura, Diagnostika) **nejsou viditelné**

---

### Krok 3: Odeslání zprávy (vše zaškrtnuté)
**Akce:**
- Zapiš dotaz: "Jaké produkty mají na bolest hlavy?"
- Odešli zprávu
- Otevři Developer Console (F12) → Network tab
- Najdi request na N8N webhook

**Očekávaný výsledek:**
✅ **Payload obsahuje:**
```json
{
  "metadata": {
    "categories": ["Wany", "TČM"],
    "publication_types": [...],
    "labels": []
  }
}
```

---

### Krok 4: Odškrtnutí jedné kategorie
**Akce:**
- V filtračním panelu klikni na **TČM** (odškrtneš ho)
- TČM tlačítko zešedne
- Zapiš nový dotaz: "Co pomáhá na nespavost?"
- Odešli zprávu
- Zkontroluj Network tab

**Očekávaný výsledek:**
✅ **Payload obsahuje:**
```json
{
  "metadata": {
    "categories": ["Wany"],
    "publication_types": [...],
    "labels": []
  }
}
```

---

### Krok 5: Odškrtnutí všeho
**Akce:**
- V filtračním panelu klikni na **Wany** (odškrtneš ho)
- Obě tlačítka jsou šedá
- Zapiš dotaz: "Test bez filtrů"
- Odešli zprávu
- Zkontroluj Network tab

**Očekávaný výsledek:**
✅ **Payload obsahuje:**
```json
{
  "metadata": {
    "categories": [],
    "publication_types": [...],
    "labels": []
  }
}
```
⚠️ **Poznámka:** Chat může vrátit horší výsledky nebo chybu, protože nefiltruje na žádnou kategorii.

---

## Testovací scénář 2: Všechny kategorie povoleny

### Příprava
1. V admin UI edituj vany_chat
2. **Zaškrtni VŠECHNY kategorie**
3. Ulož změny

### Test
**Akce:**
- Otevři chat s vany_chat
- Otevři filtrační panel

**Očekávaný výsledek:**
✅ **Ve filtračním panelu vidíš:**
- Všech 6 kategorií
- Všechny jsou defaultně zaškrtnuté (modré)

**Payload při odeslání:**
```json
{
  "metadata": {
    "categories": ["Aromaterapie", "Masáže", "Akupunktura", "Diagnostika", "TČM", "Wany"],
    "publication_types": [...],
    "labels": []
  }
}
```

---

## Testovací scénář 3: Žádné kategorie povoleny

### Příprava
1. V admin UI edituj vany_chat
2. **Odškrtni VŠECHNY kategorie**
3. Ulož změny

### Test
**Akce:**
- Otevři chat s vany_chat
- Otevři filtrační panel

**Očekávaný výsledek:**
✅ **Ve filtračním panelu vidíš:**
- Zpráva: "Žádné filtrace nejsou k dispozici"
- Žádné kategorie nejsou viditelné

**Payload při odeslání:**
```json
{
  "metadata": {
    "categories": [],
    "publication_types": [...],
    "labels": []
  }
}
```

---

## Debug při chybě testu

### Pokud test selže, zkontroluj:

1. **Console logy při otevření chatu:**
   ```
   🤖 Načítám nastavení pro chatbota: vany_chat
   📊 Načtené filtrace pro chatbota: { ... }
   ```

2. **SQL dotaz pro ověření DB:**
   ```sql
   SELECT 
       chatbot_id,
       chatbot_name,
       array_length(allowed_categories, 1) as num_categories
   FROM chatbot_settings 
   WHERE chatbot_id = 'vany_chat';
   ```

3. **Network tab - Request payload:**
   - URL: `https://n8n.srv980546.hstgr.cloud/webhook/...`
   - Method: POST
   - Body → metadata

---

## Známé problémy a jejich příčiny

### ❌ Problém: Všechny kategorie viditelné i když jsou v admin odškrtnuté

**Příčina A:** Nastavení se neuložilo do DB
- Zkontroluj SQL dotaz výše
- Pokud `num_categories = 6` (nebo více než očekáváš), problém je v ukládání

**Příčina B:** Načítá se jiný chatbot
- Zkontroluj console log - je tam správné `chatbot_id`?

**Příčina C:** Fallback se aktivoval kvůli chybě
- Zkontroluj console - je tam "Chyba při načítání nastavení chatbota"?

---

### ❌ Problém: Kategorie jsou správně viditelné, ale jsou odškrtnuté místo zaškrtnutých

**Příčina:** Chyba v inicializaci `selectedCategories` state
- Zkontroluj `FilteredSanaChatWithSettings.tsx` řádek 84
- Mělo by tam být: `setSelectedCategories(filters.categories.map(c => c.name))`

---

### ❌ Problém: Do N8N se posílají jiná metadata než očekávám

**Příčina:** Uživatel změnil filtry v UI, ale ty jsi to nepozoroval
- Překontroluj UI - jsou tlačítka modrá (zaškrtnuté) nebo šedá (odškrtnuté)?

---

## Výsledek testu

**Datum testu:** _________

**Tester:** _________

| Scénář | Výsledek | Poznámky |
|--------|----------|----------|
| Scénář 1 - Krok 1 | ⬜ ✅ / ❌ |  |
| Scénář 1 - Krok 2 | ⬜ ✅ / ❌ |  |
| Scénář 1 - Krok 3 | ⬜ ✅ / ❌ |  |
| Scénář 1 - Krok 4 | ⬜ ✅ / ❌ |  |
| Scénář 1 - Krok 5 | ⬜ ✅ / ❌ |  |
| Scénář 2 | ⬜ ✅ / ❌ |  |
| Scénář 3 | ⬜ ✅ / ❌ |  |

**Celkový výsledek:** ⬜ ✅ Vše funguje / ❌ Jsou problémy

**Nalezené problémy:**
_____________________________________________
_____________________________________________
_____________________________________________





