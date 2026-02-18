/**
 * TEST: Product Screening s Problem Classification a Product Pairing
 * 
 * Tento script testuje kompletní orchestraci:
 * 1. Identifikace problému z user message
 * 2. Extrakce produktů z bot response
 * 3. Párování kombinací podle tabulky leceni
 * 
 * Spuštění:
 * node test-screening-with-pairing.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Chybí SUPABASE credentials v .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// PROBLEM CLASSIFICATION
// ============================================================================

async function classifyProblem(userMessage) {
  console.log('🔍 Problem Classification...');
  console.log('📥 User message:', userMessage);
  
  // Načti dostupné problémy z leceni
  const { data: leceniData, error: leceniError } = await supabase
    .from('leceni')
    .select('Problém');
  
  if (leceniError) {
    console.error('❌ Chyba při načítání leceni:', leceniError);
    return [];
  }
  
  const problems = new Set();
  leceniData.forEach(row => {
    const problem = row['Problém'];
    if (problem && problem.trim() !== '') {
      problems.add(problem.trim());
    }
  });
  
  const problemsList = Array.from(problems);
  console.log(`📋 Dostupné kategorie (${problemsList.length}):`, problemsList.slice(0, 5), '...');
  
  // System prompt
  const systemPrompt = `Jsi lékařský expert specializující se na symptomy a zdravotní problémy.

Tvým úkolem je KLASIFIKOVAT zdravotní problém z textu uživatele podle těchto dostupných kategorií:

**DOSTUPNÉ KATEGORIE PROBLÉMŮ:**
${problemsList.map(p => `- ${p}`).join('\n')}

**PRAVIDLA KLASIFIKACE:**
1. Přečti si uživatelskou zprávu
2. Identifikuj zdravotní problém/symptom
3. Vyber NEJPŘESNĚJŠÍ kategorii ze seznamu výše
4. Pokud není přesná shoda, vyber NEJBLIŽŠÍ obecnější kategorii
5. Můžeš vybrat VÍCE kategorií pokud uživatel popisuje více problémů
6. Pokud problém není v seznamu, vrať prázdné pole []

**KRITICKÉ PRAVIDLO PRO VÝSTUP:**
- Vrať VÝHRADNĚ validní JSON array - žádný text před ani za
- NEPIŠ vysvětlení, komentáře
- POUZE čistý JSON: ["kategorie1", "kategorie2"]`;

  const userPrompt = `Klasifikuj zdravotní problém z následující zprávy uživatele. Vrať POUZE JSON array:\n\n"${userMessage}"`;
  
  // Zavolej Edge Function
  const { data, error } = await supabase.functions.invoke('openrouter-proxy', {
    body: {
      systemPrompt,
      userPrompt,
      model: 'anthropic/claude-3-haiku',
      temperature: 0.1,
      maxTokens: 200
    }
  });
  
  if (error || !data || !data.success) {
    console.error('❌ Edge Function error:', error || data?.error);
    return [];
  }
  
  // Parse JSON
  let classifiedProblems = [];
  try {
    const responseText = data.response || '';
    let jsonText = responseText.trim();
    const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || responseText.match(/(\[[\s\S]*\])/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    classifiedProblems = JSON.parse(jsonText);
    if (!Array.isArray(classifiedProblems)) {
      classifiedProblems = [];
    }
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    classifiedProblems = [];
  }
  
  console.log('✅ Klasifikované problémy:', classifiedProblems);
  return classifiedProblems;
}

// ============================================================================
// PRODUCT EXTRACTION
// ============================================================================

async function extractProducts(botResponse) {
  console.log('🔍 Product Extraction...');
  console.log('📥 Bot response length:', botResponse.length);
  
  const systemPrompt = `Jsi expert na tradiční čínskou medicínu a esenciální oleje BEWIT.

Tvým úkolem je identifikovat v textu POUZE **KONKRÉTNÍ NÁZVY PRODUKTŮ**.

**CO IDENTIFIKOVAT:**
1. **Názvy esenciálních olejů** - např. "LEVANDULE", "MÁTA PEPRNÁ", "KADIDLO"
2. **Názvy směsí** - např. "Imm", "Pure", "Relax", "MIG", "NOPA"
3. **České názvy rostlin/olejů** - např. "Bergamot", "Ylang-Ylang", "Heřmánek"
4. **Wany (čínské směsi)** - např. "009 - Čistý dech"
5. **PRAWTEINY** - např. "PRAWTEIN Aloe Vera Plus"

**KRITICKÉ PRAVIDLO PRO VÝSTUP:**
- Vrať VÝHRADNĚ validní JSON array - žádný text před ani za
- POUZE čistý JSON: ["produkt1", "produkt2"]
- Prázdný výsledek: []`;

  const userPrompt = `Analyzuj následující text a extrahuj POUZE názvy produktů. Vrať POUZE JSON array:\n\n${botResponse}`;
  
  const { data, error } = await supabase.functions.invoke('openrouter-proxy', {
    body: {
      systemPrompt,
      userPrompt,
      model: 'anthropic/claude-3-haiku',
      temperature: 0.1,
      maxTokens: 500
    }
  });
  
  if (error || !data || !data.success) {
    console.error('❌ Edge Function error:', error || data?.error);
    return [];
  }
  
  let products = [];
  try {
    const responseText = data.response || '';
    let jsonText = responseText.trim();
    const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || responseText.match(/(\[[\s\S]*\])/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    products = JSON.parse(jsonText);
    if (!Array.isArray(products)) {
      products = [];
    }
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    products = [];
  }
  
  console.log('✅ Extrahované produkty:', products);
  return products;
}

// ============================================================================
// PRODUCT CODE LOOKUP
// ============================================================================

async function findProductCodes(productNames) {
  if (productNames.length === 0) {
    return [];
  }
  
  console.log('🔍 Hledám product_code pro názvy:', productNames);
  
  const { data, error } = await supabase
    .from('product_feed_2')
    .select('product_code, product_name');
  
  if (error || !data) {
    console.error('❌ Chyba při načítání product_feed_2:', error);
    return [];
  }
  
  const productCodes = [];
  
  productNames.forEach(extractedName => {
    const normalizedExtracted = extractedName.toLowerCase().trim();
    
    const matchedProduct = data.find(product => {
      const normalizedProductName = product.product_name.toLowerCase();
      
      if (normalizedProductName.includes(normalizedExtracted)) {
        return true;
      }
      
      if (normalizedExtracted.includes(normalizedProductName)) {
        return true;
      }
      
      const cleanedProductName = normalizedProductName
        .replace(/esenciální olej/gi, '')
        .replace(/bewit/gi, '')
        .replace(/prawtein/gi, '')
        .trim();
      
      const cleanedExtracted = normalizedExtracted
        .replace(/esenciální olej/gi, '')
        .replace(/bewit/gi, '')
        .replace(/prawtein/gi, '')
        .trim();
      
      return cleanedProductName === cleanedExtracted || 
             cleanedProductName.includes(cleanedExtracted) ||
             cleanedExtracted.includes(cleanedProductName);
    });
    
    if (matchedProduct) {
      console.log(`   ✅ Match: "${extractedName}" → ${matchedProduct.product_code} (${matchedProduct.product_name})`);
      productCodes.push(matchedProduct.product_code);
    } else {
      console.log(`   ❌ No match: "${extractedName}"`);
    }
  });
  
  return [...new Set(productCodes)];
}

// ============================================================================
// PRODUCT PAIRING
// ============================================================================

async function pairProducts(productCodes) {
  if (productCodes.length === 0) {
    console.log('⚠️ Žádné product_code k napárování');
    return { products: [], aloe: false, merkaba: false };
  }
  
  console.log('🔗 Product Pairing Service...');
  console.log('📥 Product codes:', productCodes);
  
  const { data, error } = await supabase
    .rpc('match_product_combinations', {
      input_codes: productCodes
    });
  
  if (error) {
    console.error('❌ Chyba při párování:', error);
    return { products: [], aloe: false, merkaba: false };
  }
  
  if (!data || data.length === 0) {
    console.log('ℹ️ Žádné napárované produkty');
    return { products: [], aloe: false, merkaba: false };
  }
  
  const aloe = data.some(p => p.aloe_recommended?.toLowerCase() === 'ano');
  const merkaba = data.some(p => p.merkaba_recommended?.toLowerCase() === 'ano');
  
  console.log('✅ Napárováno produktů:', data.length);
  console.log('💧 Aloe doporučeno:', aloe);
  console.log('✨ Merkaba doporučeno:', merkaba);
  
  data.forEach(p => {
    console.log(`   - ${p.matched_product_name} (${p.matched_category})`);
  });
  
  return { products: data, aloe, merkaba };
}

// ============================================================================
// MAIN TEST
// ============================================================================

async function runTest() {
  console.log('🧪 TEST: Product Screening s Problem Classification a Pairing');
  console.log('='.repeat(70));
  
  // Testovací data
  const userMessage = "Bolí mě hlava ze stresu a jsem přepracovaný";
  const botResponse = `
    Doporučuji vám LEVANDULE esenciální olej pro uklidnění a KADIDLO pro meditaci.
    Můžete také zkusit směs RELAX nebo NOPA pro podporu nervového systému.
    PRAWTEIN Aloe Vera Plus může pomoct s regenerací.
  `;
  
  console.log('📥 USER MESSAGE:');
  console.log(userMessage);
  console.log('');
  console.log('📥 BOT RESPONSE:');
  console.log(botResponse.trim());
  console.log('='.repeat(70));
  console.log('');
  
  // KROK 1: Parallel - Problem Classification + Product Extraction
  console.log('⚡ KROK 1: PARALLEL - Problem Classification + Product Extraction');
  console.log('-'.repeat(70));
  
  const [problems, products] = await Promise.all([
    classifyProblem(userMessage),
    extractProducts(botResponse)
  ]);
  
  console.log('');
  console.log('-'.repeat(70));
  console.log('');
  
  // KROK 2: Validace
  console.log('🔍 KROK 2: VALIDACE');
  console.log('-'.repeat(70));
  console.log('Problémy identifikovány:', problems.length > 0 ? '✅' : '❌', problems);
  console.log('Produkty extrahovány:', products.length > 0 ? '✅' : '❌', products);
  console.log('');
  
  if (problems.length === 0 || products.length === 0) {
    console.log('⚠️ Chybí problémy nebo produkty - párování nebude spuštěno');
    console.log('='.repeat(70));
    return;
  }
  
  console.log('-'.repeat(70));
  console.log('');
  
  // KROK 3: Product Code Lookup
  console.log('🔍 KROK 3: PRODUCT CODE LOOKUP');
  console.log('-'.repeat(70));
  
  const productCodes = await findProductCodes(products);
  console.log('');
  console.log('Nalezené product_code:', productCodes);
  console.log('');
  console.log('-'.repeat(70));
  console.log('');
  
  if (productCodes.length === 0) {
    console.log('⚠️ Žádné product_code nalezeny - párování nebude spuštěno');
    console.log('='.repeat(70));
    return;
  }
  
  // KROK 4: Product Pairing
  console.log('🔗 KROK 4: PRODUCT PAIRING');
  console.log('-'.repeat(70));
  
  const pairing = await pairProducts(productCodes);
  
  console.log('');
  console.log('-'.repeat(70));
  console.log('');
  
  // VÝSLEDEK
  console.log('🎉 VÝSLEDEK:');
  console.log('='.repeat(70));
  console.log('');
  console.log('✅ Identifikované problémy:', problems);
  console.log('✅ Extrahované produkty:', products);
  console.log('✅ Nalezené product_code:', productCodes);
  console.log('');
  console.log('🔗 NAPÁROVANÉ PRODUKTY:', pairing.products.length);
  if (pairing.products.length > 0) {
    pairing.products.forEach(p => {
      console.log(`   - ${p.matched_product_name} (${p.matched_category})`);
    });
  }
  console.log('');
  console.log('💧 Aloe doporučeno:', pairing.aloe ? '✅ ANO' : '❌ NE');
  console.log('✨ Merkaba doporučeno:', pairing.merkaba ? '✅ ANO' : '❌ NE');
  console.log('');
  console.log('='.repeat(70));
}

// Spusť test
runTest().catch(console.error);
