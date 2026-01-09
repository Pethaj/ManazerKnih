# 🔧 TROUBLESHOOTING: Product Funnel Mode se nespouští

## 🐛 Symptomy problému

1. **Chat vrací standardní odpověď** - správně detekuje produkty
2. **Inline product buttons fungují** - produkty se vkládají do textu
3. **Product Funnel Mode se NESPOUŠTÍ** - i když by měl

## 🔍 Příklad z logů

```
SanaChat.tsx:1651 🎯 Chatbot settings v SanaChat: {
  book_database: true,
  product_recommendations: false,
  willUseCombinedSearch: false,
  webhook_url: undefined,
  chatbotId: undefined  // ← PROBLÉM!
}

SanaChat.tsx:1427 📚 Používám pouze webhook pro databázi knih - IGNORUJI produktová doporučení...
```

**Vidíme:**
- ✅ Inline product buttons fungují
- ✅ Produkty se detekují a vkládají
- ❌ **`chatbotId` je `undefined`**
- ❌ Intent routing se nespouští

---

## 🎯 Příčina problému

**Product Funnel Mode se aktivuje POUZE pokud:**

```typescript
if (chatbotId === 'vany_chat') {
  // Spustí se Intent Routing & Product Funnel
}
```

**Když `chatbotId` je `undefined`**, tento blok se **nikdy nespustí**, takže:
- ❌ Intent routing se nepoužívá
- ❌ Product Funnel Mode se nespouští
- ✅ Ale inline product buttons FUNGUJÍ (protože jsou v jiné části kódu)

---

## ✅ Řešení

### 1. Oprava v `FilteredSanaChatWithSettings.tsx`

**Před opravou:**
```tsx
<SanaChatContent 
  selectedCategories={selectedCategories}
  selectedLabels={selectedLabels}
  selectedPublicationTypes={selectedPublicationTypes}
  chatbotSettings={chatbotSettings}
  // ❌ chatbotId CHYBÍ!
/>
```

**Po opravě:**
```tsx
<SanaChatContent 
  selectedCategories={selectedCategories}
  selectedLabels={selectedLabels}
  selectedPublicationTypes={selectedPublicationTypes}
  chatbotSettings={chatbotSettings}
  chatbotId={chatbotId}  // ✅ PŘIDÁNO!
/>
```

### 2. Soubor opravy
`src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx` - řádek 378-383

---

## 📊 Jak to funguje

### Běh aplikace před opravou:

```
1. Uživatel: "doporuc wany na bolest hlavy"
   ↓
2. SanaChat.tsx (řádek 1677): if (chatbotId === 'vany_chat')
   → chatbotId = undefined
   → BLOK SE NESPUSTÍ ❌
   ↓
3. Pokračuje do "pouze databáze knih" (řádek 1828)
   → Volá N8N webhook
   → Vrátí odpověď z knih
   ↓
4. Inline product buttons se spustí ✅
   → Detekují produkty v odpovědi
   → Vloží tlačítka
   ↓
5. Product Funnel Mode se NESPUSTÍ ❌
```

### Běh aplikace po opravě:

```
1. Uživatel: "doporuc wany na bolest hlavy"
   ↓
2. SanaChat.tsx (řádek 1677): if (chatbotId === 'vany_chat')
   → chatbotId = 'vany_chat' ✅
   → BLOK SE SPUSTÍ ✅
   ↓
3. Intent Routing (řádek 1697):
   → Analyzuje intent (funnel vs normal)
   → Detekuje symptomy
   ↓
4. Pokračuje do "pouze databáze knih" (řádek 1828)
   → Volá N8N webhook
   → Vrátí odpověď z knih
   ↓
5. Inline product buttons se spustí ✅
   → Detekují produkty v odpovědi
   → Vloží tlačítka
   ↓
6. Uživatel: "boli me hlava, mam horkost v ustech"
   ↓
7. Intent Routing rozhodne: intent = 'funnel' ✅
   ↓
8. Product Funnel Mode se SPUSTÍ ✅
   → Extrahuje produkty z poslední odpovědi
   → Obohacuje je z databáze
   → Spustí funnel s GPT-4
   → Vygeneruje funnel zprávu
```

---

## 🔑 Klíčové body

### Product Funnel Mode vs Inline Product Buttons

Jsou to **DVĚ ODDĚDĚNÉ funkce**:

1. **Inline Product Buttons** (vždy aktivní):
   - Spouští se vždy po odpovědi z N8N
   - Detekuje produkty v textu
   - Vkládá tlačítka přímo do textu
   - **NEZÁVISÍ na `chatbotId`**

2. **Product Funnel Mode** (aktivní jen pro `vany_chat`):
   - Spouští se **POUZE** když `chatbotId === 'vany_chat'`
   - Analyzuje intent uživatele (funnel vs normal)
   - Po druhé zprávě spouští funnel
   - **VYŽADUJE `chatbotId`**

### Proč Product Funnel Mode je jen pro Wany Chat?

```typescript
// src/components/SanaChat/SanaChat.tsx - řádek 1677
if (chatbotId === 'vany_chat') {
  // Intent routing & Product Funnel
}
```

Je to **designové rozhodnutí**:
- Wany Chat = speciální funnel pro produkty Wany (byliny)
- Ostatní chatboty = standardní chat s inline buttons

---

## 🧪 Testování opravy

### Test 0: Tvrdý refresh aplikace

**DŮLEŽITÉ:** Po změně kódu VŽDY udělej tvrdý refresh:

```
Cmd/Ctrl + Shift + R
```

nebo zavři a znovu otevři chatbot.

### Test 1: Zkontroluj chatbotId v logách

```
SanaChat.tsx:1656 🎯 Chatbot settings v SanaChat: {
  ...
  chatbotId: 'vany_chat'  // ✅ Mělo by být vyplněno!
}
```

**Pokud je `undefined`:** Aplikace běží se starým kódem → udělej tvrdý refresh!

**Pokud má jinou hodnotu než `'vany_chat'`:** Zjisti správné ID v databázi.

### Test 1.5: Diagnostické logy (NOVÉ!)

Po poslední opravě by měly být v logách tyto řádky:

```
🔧 FilteredSanaChatWithSettings předává chatbotId: "vany_chat" do SanaChatContent
🔍 Checking Intent Routing: chatbotId = "vany_chat" (type: string)
🔍 Comparison: chatbotId === 'vany_chat' → true
```

**Co to znamená:**
- První řádek = komponenta předává ID správně
- Druhý řádek = ID dorazilo do `SanaChat.tsx`
- Třetí řádek = porovnání by mělo být `true`

**Pokud není `true`:** Máš špatné `chatbotId` v databázi!

### Test 2: Ověř spuštění Intent Routing

Po první zprávě by mělo být v logách:
```
🔀 WANY CHAT - SPOUŠTÍM INTENT ROUTING
```

**Pokud NENÍ:** Intent Routing se nespustil → viz Test 1.5

### Test 3: Zkus Product Funnel Mode

1. První zpráva: "doporuc wany na bolest hlavy"
   - Odpověď: standardní doporučení
   - Inline buttons: ✅ produkty vloženy

2. Druhá zpráva: "boli me hlava, mam horkost v ustech"
   - Intent: funnel
   - Product Funnel: ✅ měl by se spustit!

---

## 📁 Související soubory

- `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx` - **OPRAVENO** ✅
- `src/components/SanaChat/SanaChat.tsx` - Intent routing logic (řádek 1677)
- `src/services/intentRoutingService.ts` - Intent routing služba
- `src/services/productFunnelService.ts` - Product funnel služba

---

## 📝 Checklist pro budoucí přidání chatbotů

Když přidáváte nový chatbot, ujistěte se, že:

1. ✅ `chatbotId` je předáno do `SanaChatContent`
2. ✅ `chatbotId` odpovídá ID v databázi
3. ✅ Pokud chcete Product Funnel Mode, přidejte podmínku do `SanaChat.tsx` (řádek 1677)

---

## 🎉 Výsledek

Po této opravě by měl **Product Funnel Mode fungovat správně** pro Wany Chat:

1. První zpráva → standardní odpověď + inline buttons ✅
2. Druhá zpráva se symptomy → Product Funnel Mode ✅

---

_Opraveno: 8. prosince 2024_






















