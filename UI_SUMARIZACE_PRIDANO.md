# UI pro nastavení sumarizace - Dokončeno

## Přehled

Přidáno UI tlačítko (checkbox) pro zapnutí/vypnutí sumarizace historie v admin rozhraní pro nastavení chatbotů.

## Co bylo přidáno

### 1. Checkbox v editačním formuláři

**Soubor:** `src/components/ChatbotSettings/ChatbotSettingsManager.tsx`

**Umístění:** V sekci "Základní funkce", pod checkboxem "Manuální funnel spouštěč"

**Vlastnosti:**
- ✅ Label: "Sumarizovat historii"
- ✅ Popis: "Automaticky sumarizuje historii konverzace pomocí LLM před odesláním do N8N webhooku. Snižuje latenci a náklady na tokeny."
- ✅ Výchozí hodnota: `false` (vypnuto)
- ✅ Ukládá se do `formData.summarize_history`

### 2. Indikátor v seznamu chatbotů

**Umístění:** V detailech každého chatbota, vedle "Produktový router" a "Manuální funnel"

**Vlastnosti:**
- ✅ Label: "Sumarizace"
- ✅ Barva aktivního stavu: Modrá (`bg-blue-100 text-blue-800`)
- ✅ Barva vypnutého stavu: Šedá (`bg-gray-100 text-gray-600`)
- ✅ Text: "Aktivní" / "Vypnuto"

## Jak použít

### Cesta k nastavení

1. Přihlásit se do MedBase admin rozhraní
2. Přejít na stránku **Nastavení chatbotů** (ChatbotSettingsManager)
3. Kliknout na **Upravit** u konkrétního chatbota (např. EO-Smesi, Wany.Chat)
4. V sekci **Základní funkce** najít checkbox **"Sumarizovat historii"**
5. Zaškrtnout checkbox pro zapnutí sumarizace
6. Kliknout na **Uložit změny**

### Vizuální ukázka

```
┌─────────────────────────────────────────────────────────┐
│ Základní funkce                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ☐ Produktová doporučení                                 │
│   Zobrazovat relevantní produkty...                     │
│                                                          │
│ ☐ Produktová doporučení na tlačítko                     │
│   Zobrazit tlačítko "Doporučit produkty"...             │
│                                                          │
│ ☑ Inline produktové linky                               │
│   Zobrazovat produktové linky přímo v textu...          │
│                                                          │
│ ☑ Databáze knih                                         │
│   Vyhledávat v databázi lékařské literatury...          │
│                                                          │
│ ☑ Aktivovat produktový router                           │
│   Automaticky směřovat dotazy do produktového...        │
│                                                          │
│ ☐ Manuální funnel spouštěč                              │
│   Místo žlutého calloutu zobrazí tlačítko...            │
│                                                          │
│ ☑ Sumarizovat historii                          ← NOVÉ! │
│   Automaticky sumarizuje historii konverzace...         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## V seznamu chatbotů

Sumarizace se zobrazí jako badge u každého chatbota:

```
┌──────────────────────────────────────────────────────────┐
│ Wany.Chat                                        AKTIVNÍ │
│ AI chatbot pro Wany.chat s podporou produktů            │
│                                                          │
│ Kategorie: 3 povolených                                 │
│ Typy publikací: 2 povolených                            │
│ Štítky: 0 povolených                                    │
│ ──────────────────────────────────────────────────────  │
│ Produktový router: ✓ Aktivní                            │
│ Manuální funnel:   ✗ Vypnuto                            │
│ Sumarizace:        ✓ Aktivní                    ← NOVÉ! │
└──────────────────────────────────────────────────────────┘
```

## Technické detaily

### FormData state

```typescript
const [formData, setFormData] = useState({
  // ... ostatní pole
  summarize_history: chatbotSettings?.summarize_history ?? false,
});
```

### Checkbox onChange handler

```typescript
<input
  type="checkbox"
  checked={formData.summarize_history}
  onChange={(e) => setFormData(prev => ({ 
    ...prev, 
    summarize_history: e.target.checked 
  }))}
  className="mr-2 mt-1"
/>
```

### Zobrazení v seznamu

```typescript
<div className="flex items-center">
  <span className="font-medium text-gray-700">Sumarizace:</span>
  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
    chatbot.summarize_history === true
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-gray-100 text-gray-600'
  }`}>
    {chatbot.summarize_history === true ? 'Aktivní' : 'Vypnuto'}
  </span>
</div>
```

## Změněné soubory

- ✅ `src/components/ChatbotSettings/ChatbotSettingsManager.tsx`
  - Přidán `summarize_history` do `formData` state
  - Přidán checkbox do formuláře
  - Přidán indikátor do seznamu chatbotů
  - Změněn grid z 2 sloupců na 3 sloupce pro zobrazení všech badgeů

## Integrace s backend

Checkbox automaticky ukládá hodnotu do databáze při kliknutí na "Uložit změny":

1. Uživatel zaškrtne checkbox
2. Klikne "Uložit změny"
3. Frontend volá `ChatbotSettingsService.updateChatbotSettings()`
4. Service provede SQL UPDATE:
   ```sql
   UPDATE chatbot_settings 
   SET summarize_history = true 
   WHERE chatbot_id = 'vany_chat';
   ```
5. Změna se okamžitě projeví v aplikaci

## Testování UI

### Test 1: Zapnutí sumarizace
1. Otevřít nastavení EO-Smesi chatbota
2. Zaškrtnout "Sumarizovat historii"
3. Uložit
4. ✅ Ověřit: V seznamu se zobrazí modrý badge "Aktivní"

### Test 2: Vypnutí sumarizace
1. Otevřít nastavení Wany.Chat
2. Odškrtnout "Sumarizovat historii"
3. Uložit
4. ✅ Ověřit: V seznamu se zobrazí šedý badge "Vypnuto"

### Test 3: Vytvoření nového chatbota
1. Kliknout "Vytvořit nový chatbot"
2. ✅ Ověřit: Checkbox "Sumarizovat historii" je defaultně nezaškrtnutý
3. Zaškrtnout checkbox
4. Vyplnit ostatní pole a uložit
5. ✅ Ověřit: Nový chatbot má sumarizaci zapnutou

## Screenshot umístění

Checkbox se nachází zde:

```
Admin rozhraní
  └─ Nastavení chatbotů
       └─ Upravit chatbot (tlačítko tužka)
            └─ Základní funkce (sekce)
                 └─ [x] Sumarizovat historii  ← TADY
```

## Přínosy UI

✅ **Uživatelsky přívětivé** - Jasné popisky a nápovědy  
✅ **Konzistentní design** - Stejný styl jako ostatní checkboxy  
✅ **Přehledné zobrazení** - Badge v seznamu pro rychlou kontrolu  
✅ **Bezpečné** - Výchozí hodnota `false` (opt-in)  
✅ **Okamžitý feedback** - Změna se hned projeví v seznamu  

## Budoucí vylepšení

- [ ] Tooltip s detailnějším vysvětlením
- [ ] Statistiky: kolik tokenů bylo ušetřeno
- [ ] Preview sumarizace v debug módu
- [ ] Batch operace: zapnout/vypnout pro více chatbotů najednou

---

**Implementováno:** Leden 2026  
**Status:** ✅ Hotovo a připraveno k použití
