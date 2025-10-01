// Rychlý test webhook parsingu
console.log('🧪 RYCHLÝ TEST WEBHOOK PARSINGU\n');

// Simulace skutečné webhook odpovědi (na základě curl testu)
const mockWebhookResponse = {
  "data": [
    {
      "Doporuceni": "Yin Qiao Jie Du Wan - Doporučení: Tato tradiční čínská bylinná směs napomáhá při prvních projevech napadení toxickým horkem a větrem, což může být užitečné při bolesti kloubů a zánětech. - ID produktu: 1002318245 - [Produkt](https://bewit.love/produkt/bewit-vetrolam?variant=6727)",
      "ID produktu": ""
    },
    {
      "Doporuceni": "Chuan Xiong Cha Tiao Wan - Doporučení: Tento produkt je navržen pro zkrocení chladu a větru pod kůží, což může přinést úlevu od bolestí kloubů spojených s externími faktory, jakými jsou chladné a vlhké počasí. - ID produktu: 1002737245 - [Produkt](https://bewit.love/produkt/bewit-eliminace-vetru?variant=7666)",
      "ID produktu": ""
    },
    {
      "Doporuceni": "Xiao Qing Long Wan - Doporučení: Tento lék působí jako ochranný faktor proti chladným větrům, což může být přínosné pro ty, kteří trpí bolestmi kloubů způsobenými klimatickými podmínkami. - ID produktu: 1002324245",
      "ID produktu": ""
    }
  ]
};

// Test funkce pro extrakci ID z textu
function extractProductIdFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  console.log('🔍 Extrakce ID z textu:', text.substring(0, 100) + '...');
  
  const idPatterns = [
    /ID produktu:\s*(\d+)/gi,
    /product[_\s]*id[:\s]*(\d+)/gi,
    /kód[:\s]*(\d+)/gi,
    /\b(\d{10})\b/g,
    /\b(\d{9,12})\b/g
  ];
  
  for (const pattern of idPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const id = match[1].trim();
      console.log(`✅ Nalezeno ID pomocí pattern ${pattern.source}:`, id);
      return id;
    }
  }
  
  console.log('❌ Žádné ID nenalezeno v textu');
  return null;
}

// Test parsing
console.log('📦 Testovací data:', JSON.stringify(mockWebhookResponse, null, 2));
console.log('\n🔍 ZAČÍNÁM PARSING...\n');

if (mockWebhookResponse.data && Array.isArray(mockWebhookResponse.data)) {
  console.log(`✅ Nalezen formát: objekt s data polem (${mockWebhookResponse.data.length} items)`);
  
  mockWebhookResponse.data.forEach((product, index) => {
    console.log(`\n--- PRODUKT ${index + 1} ---`);
    console.log('🔍 Dostupná pole:', Object.keys(product));
    
    // Zkus standardní pole pro ID
    let productId = null;
    const idFields = ['id', 'product_id', 'product_code', 'ID produktu'];
    
    for (const field of idFields) {
      if (product[field] && product[field].trim() !== '') {
        productId = product[field].toString().trim();
        console.log(`✅ ID z pole "${field}":`, productId);
        break;
      }
    }
    
    // Zkus doporučení
    let recommendation = '';
    const recommendationFields = ['Doporuceni', 'doporuceni', 'recommendation'];
    
    for (const field of recommendationFields) {
      if (product[field] && typeof product[field] === 'string') {
        recommendation = product[field].trim();
        console.log(`✅ Doporučení z pole "${field}":`, recommendation.substring(0, 150) + '...');
        
        // Pokud ID nebylo nalezeno, zkus ho extrahovat z textu
        if (!productId && recommendation) {
          productId = extractProductIdFromText(recommendation);
        }
        
        break;
      }
    }
    
    if (productId) {
      console.log(`🎯 FINÁLNÍ VÝSLEDEK - ID: ${productId}`);
      console.log(`📝 Doporučení: ${recommendation.substring(0, 100)}...`);
    } else {
      console.log('❌ ID produktu nebylo nalezeno');
    }
  });
} else {
  console.log('❌ Neočekávaný formát dat');
}

console.log('\n✅ TEST DOKONČEN');
