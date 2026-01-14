// Script pro přidání chatbota Wany.Chat Local do databáze
// Spusťte: node add_wany_chat_local.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://modopafybeslbcqjxsve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNDQ5NDksImV4cCI6MjAzOTcyMDk0OX0.yJaXruski9fv4xP3t6d0jdHsVZk9bVxBP6u1wG8Dk2Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addWanyChatLocal() {
  console.log('🚀 Přidávám chatbot Wany.Chat Local do databáze...\n');

  try {
    // KROK 1: Načti všechny kategorie a typy publikací
    console.log('📋 KROK 1: Načítám kategorie a typy publikací...');
    
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id');
    
    if (catError) {
      console.error('❌ Chyba při načítání kategorií:', catError);
      throw catError;
    }
    
    const { data: publicationTypes, error: pubError } = await supabase
      .from('publication_types')
      .select('id');
    
    if (pubError) {
      console.error('❌ Chyba při načítání typů publikací:', pubError);
      throw pubError;
    }
    
    const categoryIds = categories?.map(c => c.id) || [];
    const publicationTypeIds = publicationTypes?.map(p => p.id) || [];
    
    console.log(`✅ Načteno ${categoryIds.length} kategorií a ${publicationTypeIds.length} typů publikací`);

    // KROK 2: Přidej chatbot Wany.Chat Local
    console.log('\n📋 KROK 2: Přidávám chatbot Wany.Chat Local...');
    
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbot_settings')
      .upsert({
        chatbot_id: 'wany_chat_local',
        chatbot_name: 'Wany.Chat Local',
        description: 'AI asistent s plným přístupem k databázi knih a pokročilým markdown renderingem - lokální verze',
        product_recommendations: false,
        product_button_recommendations: false,
        book_database: true,
        allowed_categories: categoryIds,
        allowed_publication_types: publicationTypeIds,
        webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat',
        is_active: true,
        use_feed_1: true,
        use_feed_2: true,
        inline_product_links: false,
        enable_product_router: true,
        enable_manual_funnel: false,
      }, {
        onConflict: 'chatbot_id'
      })
      .select();
    
    if (chatbotError) {
      console.error('❌ Chyba při přidávání chatbota:', chatbotError);
      throw chatbotError;
    }
    
    console.log('✅ Chatbot Wany.Chat Local byl úspěšně přidán!');

    // KROK 3: Ověř výsledek
    console.log('\n📋 KROK 3: Ověřuji výsledek...');
    
    const { data: verification, error: verifyError } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('chatbot_id', 'wany_chat_local')
      .single();
    
    if (verifyError) {
      console.error('❌ Chyba při ověřování:', verifyError);
      throw verifyError;
    }
    
    console.log('\n✅ HOTOVO! Chatbot Wany.Chat Local byl úspěšně vytvořen:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📛 Název: ${verification.chatbot_name}`);
    console.log(`🆔 ID: ${verification.chatbot_id}`);
    console.log(`🔗 Webhook: ${verification.webhook_url}`);
    console.log(`🔴 Ikona: Červená (automaticky podle chatbot_id)`);
    console.log(`📚 Databáze knih: ${verification.book_database ? '✅ Zapnuto' : '❌ Vypnuto'}`);
    console.log(`🏷️ Kategorie: ${verification.allowed_categories?.length || 0} povoleno`);
    console.log(`📄 Typy publikací: ${verification.allowed_publication_types?.length || 0} povoleno`);
    console.log(`⚡ Aktivní: ${verification.is_active ? '✅ Ano' : '❌ Ne'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🎉 Chatbot je připraven k použití!');
    console.log('\n📖 Další kroky:');
    console.log('1. Obnovte aplikaci v prohlížeči (Ctrl+R / Cmd+R)');
    console.log('2. Otevřete selector chatbotů');
    console.log('3. Ověřte, že se zobrazuje Wany.Chat Local s 🔴 červenou ikonkou');
    console.log('4. Vyzkoušejte chat a ověřte funkčnost');
    
  } catch (error) {
    console.error('\n❌ Chyba při přidávání chatbota:', error);
    console.error('\n💡 Řešení:');
    console.error('1. Zkontrolujte připojení k internetu');
    console.error('2. Ověřte, že Supabase projekt je dostupný');
    console.error('3. Zkontrolujte, že existují tabulky categories a publication_types');
    console.error('4. Zkuste spustit SQL script add_wany_chat_local.sql přímo v Supabase SQL editoru');
    process.exit(1);
  }
}

// Spusť funkci
addWanyChatLocal();
