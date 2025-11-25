# N8N Response Format - Product Chat

## ✅ Skutečný formát z N8N

N8N webhook vrací data v tomto formátu:

```json
[
  {
    "data": [
      {
        "ID produktu": "2737",
        "Doporuceni": "Tato patentní směs může být skvělou volbou..."
      },
      {
        "ID produktu": "2741",
        "Doporuceni": "Složení této směsi se zaměřuje na podporu..."
      }
    ]
  }
]
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

## 🔍 Logika konverze

```typescript
// Detekce N8N formátu
if (Array.isArray(data) && data.length > 0 && data[0].data) {
  const productsData = data[0].data;
  
  // Konverze na standardní formát
  const products = productsData.map((item: any) => ({
    product_code: item['ID produktu'],
    recommendation: item['Doporuceni']
  }));
  
  data = {
    text: `Našel jsem pro vás ${products.length} doporučených produktů:`,
    products: products
  };
}
```

## ✅ Co to znamená

1. **N8N může vracet svůj vlastní formát** - Aplikace ho automaticky přečte
2. **Žádné změny v N8N nejsou potřeba** - Funguje s aktuálním N8N workflow
3. **Obě varianty jsou podporovány**:
   - N8N formát: `[{ data: [...] }]`
   - Standardní formát: `{ text, products }`

## 🧪 Test

### N8N Response příklad:
```json
[
  {
    "data": [
      {
        "ID produktu": "2737",
        "Doporuceni": "Tato patentní směs..."
      }
    ]
  }
]
```

### Po konverzi:
```json
{
  "text": "Našel jsem pro vás 1 doporučených produktů:",
  "products": [
    {
      "product_code": "2737",
      "recommendation": "Tato patentní směs..."
    }
  ]
}
```

### Pak se obohacení z product_feed_2:
```json
{
  "product_code": "2737",
  "product_name": "009 - Čistý dech",
  "recommendation": "Tato patentní směs...",
  "url": "https://bewit.love/produkt/...",
  "image_url": "https://bewit.love/images/...",
  "price": 175,
  "currency": "CZK",
  "availability": 1
}
```

## 📝 Console logy

Při volání webhooku uvidíš v console:

```
🚀 Volám N8N webhook pro Product Chat...
📝 Dotaz: bolest hlavy
✅ N8N webhook raw response: [{"data":[{"ID produktu":"2737"...
🔧 Rozbaluji N8N response z array[0].data struktury
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

