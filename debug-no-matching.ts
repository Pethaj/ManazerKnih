import { supabase } from './src/lib/supabase';

async function debugMatching() {
  console.log('🔍 Debug matching pro "NO"\n');
  
  // Načteme produkty přes RPC
  const { data: products } = await supabase.rpc('get_products_with_pinyin_names');
  
  if (!products) {
    console.log('❌ Žádné produkty!');
    return;
  }
  
  // Filtruj na směsi EO
  const eoBlends = products.filter((p: any) => {
    const cat = p.category?.toLowerCase() || '';
    return cat.includes('směs') && cat.includes('esenciální');
  });
  
  console.log(`📦 Celkem ${eoBlends.length} směsí EO\n`);
  
  // Najdi "No esenciální olej"
  const noProduct = eoBlends.find((p: any) => 
    p.product_name.toLowerCase() === 'no esenciální olej'
  );
  
  if (noProduct) {
    console.log('✅ Produkt "No esenciální olej" NALEZEN:');
    console.log(`   ID: ${noProduct.id}`);
    console.log(`   Kód: ${noProduct.product_code}`);
    console.log(`   Název: ${noProduct.product_name}`);
    console.log(`   Pinyin: ${noProduct.pinyin_name}`);
    console.log(`   Kategorie: ${noProduct.category}`);
  } else {
    console.log('❌ Produkt "No esenciální olej" NENALEZEN!');
    
    // Hledej podobné
    const similar = eoBlends.filter((p: any) => 
      p.product_name.toLowerCase().includes('no ')
    );
    
    console.log(`\n📌 Produkty obsahující "no ":`);
    similar.forEach((p: any) => {
      console.log(`   - ${p.product_name} (ID: ${p.id}, pinyin: ${p.pinyin_name})`);
    });
  }
  
  // Najdi "Balance esenciální olej"
  console.log('\n' + '═'.repeat(60));
  const balanceProduct = eoBlends.find((p: any) => 
    p.product_name.toLowerCase().includes('balance')
  );
  
  if (balanceProduct) {
    console.log('✅ Produkt "Balance esenciální olej" NALEZEN:');
    console.log(`   ID: ${balanceProduct.id}`);
    console.log(`   Kód: ${balanceProduct.product_code}`);
    console.log(`   Název: ${balanceProduct.product_name}`);
    console.log(`   Pinyin: ${balanceProduct.pinyin_name}`);
    console.log(`   Kategorie: ${balanceProduct.category}`);
  }
}

debugMatching().catch(console.error);
