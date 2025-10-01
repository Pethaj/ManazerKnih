# Debug kombinovaného vyhledávání

## Problém
Webhooky se spouštějí, ale odpovědi se nezobrazují v aplikaci.

## Přidané debugging

### 1. Kombinovaná služba (`combinedSearchService.ts`)

**Spuštění:**
```
🚀 Spouštím kombinované vyhledávání... {
  message: "Bolí mě záda...",
  sessionId: "abc123", 
  hasMetadata: true,
  hasBooksCallback: true,
  hasProductsCallback: true
}
```

**Knihy webhook:**
```
📚 Knihy webhook dokončen za 1200ms
📚 Knihy dorazily první - zobrazuji ihned { textLength: 450, sourcesCount: 3, hasCallback: true }
✅ onBooksReceived callback zavolán
```

**Produkty webhook:**
```
🛍️ Produkty webhook dokončen za 800ms  
🛍️ Produkty dorazily - knihy už byly zobrazeny, přidávám produkty { productsCount: 5, hasCallback: true }
✅ onProductsReceived callback zavolán
```

**Finální kontrola:**
```
🎯 Finální kontrola callbacků: {
  booksReceived: true,
  productsReceived: true, 
  booksText: 450,
  productsCount: 5
}
```

### 2. React komponenta (`SanaChat.tsx`)

**Callback v komponentě:**
```
📚 onBooksReceived callback zavolán v komponentě! {
  textLength: 450,
  sourcesCount: 3,
  productsCount: 0
}
📚 Přidávám zprávu do messages: {...}
📚 Nový stav messages: 3 zpráv
```

**Produkty callback:**
```
🛍️ onProductsReceived callback zavolán v komponentě! {
  productsCount: 5,
  targetMessageId: "1234567890"
}
🛍️ Aktualizoval jsem zprávu s produkty: 5
```

## Diagnostické kroky

### Krok 1: Otevřete Developer Console
- **Chrome/Edge:** F12 → Console tab
- **Firefox:** F12 → Console tab  
- **Safari:** Cmd+Option+I → Console tab

### Krok 2: Zapněte kombinované vyhledávání
1. V ChatbotManagement zaškrtněte ✅ **Knihy** + ✅ **Produkty**
2. Uložte nastavení

### Krok 3: Pošlete testovací dotaz
```
"Bolí mě záda, co mi poradíte?"
```

### Krok 4: Sledujte console logy
Měli byste vidět tuto sekvenci:

**✅ Pokud vše funguje správně:**
```
🚀 Spouštím kombinované vyhledávání...
📚 Knihy webhook dokončen za XXXms
✅ onBooksReceived callback zavolán  
📚 onBooksReceived callback zavolán v komponentě!
📚 Nový stav messages: X zpráv
🛍️ Produkty webhook dokončen za XXXms
✅ onProductsReceived callback zavolán
🛍️ onProductsReceived callback zavolán v komponentě!
🛍️ Aktualizoval jsem zprávu s produkty: X
```

**❌ Možné problémy a jejich indikátory:**

1. **Webhooky selhávají:**
```
❌ Chyba v knihy webhook: Error: HTTP 500
❌ Chyba v produkty webhook: Error: Network error
```

2. **Callbacky se nevolají:**
```
✅ onBooksReceived callback zavolán
❌ onBooksReceived callback není dostupný!
```

3. **Komponenta nepřijímá data:**
```
📚 Knihy webhook dokončen za XXXms
// Žádný log o komponentě = callback se nedostal do React
```

4. **Messages se neaktualizují:**
```
📚 onBooksReceived callback zavolán v komponentě!
📚 Přidávám zprávu do messages: {...}
// Žádný log o "Nový stav messages" = setState selhal
```

## Nejčastější problémy

### 1. Nesprávné nastavení chatbota
**Symptom:** Žádné logy v console
**Řešení:** Zkontrolujte ChatbotManagement - musí být zaškrtnuty obě možnosti

### 2. Webhook servery nedostupné  
**Symptom:** `❌ Chyba v X webhook: Error: Failed to fetch`
**Řešení:** Zkontrolujte internet připojení a dostupnost n8n serverů

### 3. Chybné webhook odpovědi
**Symptom:** `❌ Chyba v X webhook: Error: HTTP 500`  
**Řešení:** Problém na straně n8n workflow - zkontrolujte webhook konfiguraci

### 4. React state problémy
**Symptom:** Callbacky se volají, ale UI se neaktualizuje
**Řešení:** Možná konzola browser - zkuste refresh stránky

## Rychlá diagnostika

**Pokud nevidíte ŽÁDNÉ logy:**
- ❓ Máte zapnuté kombinované vyhledávání?
- ❓ Je console otevřená před odesláním zprávy?

**Pokud vidíte jen "🚀 Spouštím kombinované vyhledávání":**  
- ❓ Jsou webhooky dostupné?
- ❓ Není síťová chyba v Network tabu?

**Pokud vidíte webhook logy, ale ne React logy:**
- ❓ Není JavaScript chyba výše v console?
- ❓ Zkuste refresh stránky

**Pokud vidíte React logy, ale ne změny v UI:**
- ❓ Není ve stránce jiná chyba?
- ❓ Zkuste hard refresh (Ctrl+F5)

---

S tímto debuggingem byste měli být schopni identifikovat přesně kde se kombinované vyhledávání zastavuje. 🔍
