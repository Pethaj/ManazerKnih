# N8N Response Format - Product Chat

## ✅ Podporované formáty z N8N

Aplikace automaticky rozpozná a zpracuje **všechny 3 varianty**:

### Varianta 1: Pole s objektem ❌ (starší verze)
```json
[
  {
    "data": [
      {
        "ID produktu": "2737",
        "Doporuceni": "Tato patentní směs může být skvělou volbou..."
      }
    ]
  }
]
```

### Varianta 2: Objekt s data ✅ (aktuální N8N)
```json
{
  "data": [
    {
      "ID produktu": "2318",
      "Doporuceni": "Tato směs může prokázat svoji účinnost..."
    },
    {
      "ID produktu": "2956",
      "Doporuceni": "Pomáhá při uvolnění nosních průduchů..."
    }
  ]
}
```

### Varianta 3: Standardní formát ✅ (pokud N8N konvertuje)
```json
{
  "text": "Našel jsem pro vás 5 produktů:",
  "products": [
    {
      "product_code": "2318",
      "recommendation": "Tato směs může prokázat..."
    }
  ]
}
```

## 🔧 Automatická konverze

`productChatWebhookService.ts` automaticky konvertuje N8N formát na náš standardní formát:

### Vstup (z N8N):
```json
[
  {
    "data": [
      { "ID produktu": "2737", "Doporuceni": "..." },
      { "ID produktu": "2741", "Doporuceni": "..." }
    ]
  }
]
```

### Výstup (pro aplikaci):
```json
{
  "text": "Našel jsem pro vás 5 doporučených produktů:",
  "products": [
    {
      "product_code": "2737",
      "recommendation": "Tato patentní směs může být skvělou volbou..."
    },
    {
      "product_code": "2741",
      "recommendation": "Složení této směsi se zaměřuje na podporu..."
    }
  ]
}
```

## 📋 Mapping

| N8N pole | Naše pole | Poznámka |
|----------|-----------|----------|
| `ID produktu` | `product_code` | String ID produktu |
| `Doporuceni` | `recommendation` | Personalizovaný text |
| - | `text` | Auto-generovaný: "Našel jsem pro vás X produktů" |

## 🔍 Logika konverze (automatická)

```typescript
let productsData = null;

// Varianta 1: Array s data property
if (Array.isArray(data) && data.length > 0 && data[0].data) {
  productsData = data[0].data;
}
// Varianta 2: Objekt s data property (✅ AKTUÁLNÍ)
else if (data.data && Array.isArray(data.data)) {
  productsData = data.data;
}
// Varianta 3: Už má standardní formát
else if (data.text && Array.isArray(data.products)) {
  return data; // Nic neměnit
}

// Konverze na standardní formát
if (productsData) {
  const products = productsData.map((item: any) => ({
    product_code: item['ID produktu'] || item.product_code,
    recommendation: item['Doporuceni'] || item.recommendation
  }));
  
  data = {
    text: `Našel jsem pro vás ${products.length} doporučených produktů:`,
    products: products
  };
}
```

## ✅ Co to znamená

1. **N8N může vracet jakýkoliv formát** - Aplikace ho automaticky přečte
2. **Žádné změny v N8N nejsou potřeba** - Funguje s aktuálním N8N workflow
3. **Všechny 3 varianty jsou podporovány**:
   - Varianta 1: `[{ data: [...] }]` - pole s objektem
   - Varianta 2: `{ data: [...] }` - objekt s data ✅ **AKTUÁLNÍ**
   - Varianta 3: `{ text, products }` - standardní formát

## 🧪 Test

### N8N Response příklad (aktuální):
```json
{
  "data": [
    {
      "ID produktu": "2318",
      "Doporuceni": "Tato směs může prokázat svoji účinnost..."
    },
    {
      "ID produktu": "2956",
      "Doporuceni": "Pomáhá při uvolnění nosních průduchů..."
    }
  ]
}
```

### Po konverzi:
```json
{
  "text": "Našel jsem pro vás 6 doporučených produktů:",
  "products": [
    {
      "product_code": "2318",
      "recommendation": "Tato směs může prokázat svoji účinnost..."
    },
    {
      "product_code": "2956",
      "recommendation": "Pomáhá při uvolnění nosních průduchů..."
    }
    // ... až 6 produktů celkem
  ]
}
```

**⚠️ Poznámka**: Carousel zobrazí maximálně **prvních 6 produktů** pomocí `.slice(0, 6)`, i když N8N vrátí více.

### Pak obohacení z product_feed_2:
```json
{
  "product_code": "2318",
  "product_name": "015 - Wan proti bolesti",
  "recommendation": "Tato směs může prokázat svoji účinnost...",
  "url": "https://bewit.love/produkt/wan-015",
  "image_url": "https://bewit.love/images/products/015.jpg",
  "price": 189,
  "currency": "CZK",
  "availability": 1
}
```

## 📝 Console logy

Při volání webhooku uvidíš v console:

```
🚀 Volám N8N webhook pro Product Chat...
📝 Dotaz: bolest hlavy
✅ N8N webhook raw response: {"data":[{"ID produktu":"2318","Doporuceni":"Tato směs...
🔧 Rozbaluji N8N response z object.data struktury
🔧 Konvertuji 5 produktů na standardní formát
✅ Konvertováno na standardní formát: { textLength: 45, productsCount: 5 }
✅ Finální response: { textLength: 45, productsCount: 5 }
📊 Obohacuji produkty o metadata z product_feed_2...
```

## 🎯 Status

✅ **N8N webhook funguje správně**  
✅ **Automatická konverze formátu**  
✅ **Obohacení metadat z product_feed_2**  
✅ **Zobrazení v carousel s personalizací**

---

**Závěr**: N8N workflow není potřeba měnit. Aplikace automaticky konvertuje N8N formát na požadovanou strukturu.

