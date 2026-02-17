import { supabase } from './src/lib/supabase';

async function listEssentialOilBlends() {
  console.log('🔍 Hledám všechny směsi esenciálních olejů v databázi...\n');
  
  const { data, error } = await supabase
    .from('product_feed_2')
    .select('id, product_code, product_name, category, description_short')
    .ilike('category', '%směs%esenciální%')
    .order('product_name');
  
  if (error) {
    console.error('❌ Chyba:', error);
    return;
  }
  
  console.log(`📦 Nalezeno ${data?.length || 0} směsí esenciálních olejů:\n`);
  
  data?.forEach((product, index) => {
    console.log(`${index + 1}. ID: ${product.id}`);
    console.log(`   Kód: ${product.product_code}`);
    console.log(`   Název: ${product.product_name}`);
    console.log(`   Kategorie: ${product.category}`);
    
    // Extrahovat pinyin název (první slovo bez "esenciální olej")
    const match = product.product_name.match(/^([A-Z]+)/);
    const shortName = match ? match[1] : '';
    if (shortName) {
      console.log(`   Krátký název: ${shortName}`);
    }
    
    console.log('');
  });
  
  // Hledat konkrétně NO, NOSE, NOPA
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 Hledám konkrétně: NO, NOSE, NOPA\n');
  
  const targets = ['NO', 'NOSE', 'NOPA'];
  
  for (const target of targets) {
    const found = data?.filter(p => 
      p.product_name.toLowerCase().includes(target.toLowerCase())
    );
    
    console.log(`📌 "${target}":`);
    if (!found || found.length === 0) {
      console.log('   ❌ Nenalezeno v databázi!');
    } else {
      found.forEach(p => {
        console.log(`   ✅ ${p.product_name} (ID: ${p.id})`);
      });
    }
    console.log('');
  }
}

listEssentialOilBlends().catch(console.error);
