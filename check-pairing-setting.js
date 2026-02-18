// Spusť tento script v konzoli prohlížeče na http://localhost:5174/

(async () => {
  const { supabase } = await import('./src/lib/supabase.ts');
  
  console.log('🔍 Kontroluji enable_product_pairing v databázi...');
  
  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('chatbot_id, chatbot_name, enable_product_pairing, enable_product_router, enable_manual_funnel')
    .eq('chatbot_id', 'eo_smesi')
    .single();
  
  if (error) {
    console.error('❌ Chyba:', error);
    return;
  }
  
  console.log('✅ Výsledek z DB:');
  console.table({
    'chatbot_id': data.chatbot_id,
    'chatbot_name': data.chatbot_name,
    'enable_product_pairing': data.enable_product_pairing,
    'enable_product_router': data.enable_product_router,
    'enable_manual_funnel': data.enable_manual_funnel
  });
  
  if (data.enable_product_pairing === undefined || data.enable_product_pairing === null) {
    console.warn('⚠️ PROBLÉM: enable_product_pairing je NULL nebo UNDEFINED!');
    console.log('💡 Řešení: Zapni checkbox v admin UI a klikni na "Uložit"');
  } else {
    console.log(`📊 enable_product_pairing = ${data.enable_product_pairing} (typ: ${typeof data.enable_product_pairing})`);
  }
})();
