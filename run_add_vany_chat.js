// Script pro spuštění SQL příkazu pro přidání Vany.chat chatbota
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addVanyChat() {
  console.log('🚀 Spouštím přidání chatbota Vany.chat...');
  
  try {
    // Nejprve získáme všechny kategorie a typy publikací
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id');
    
    if (catError) {
      console.error('❌ Chyba při načítání kategorií:', catError);
      return;
    }
    
    const { data: publicationTypes, error: pubError } = await supabase
      .from('publication_types')
      .select('id');
    
    if (pubError) {
      console.error('❌ Chyba při načítání typů publikací:', pubError);
      return;
    }
    
    const categoryIds = categories?.map(c => c.id) || [];
    const publicationTypeIds = publicationTypes?.map(p => p.id) || [];
    
    console.log(`📋 Načteno ${categoryIds.length} kategorií a ${publicationTypeIds.length} typů publikací`);
    
    // Přidání nebo aktualizace Vany.chat chatbota
    const { data, error } = await supabase
      .from('chatbot_settings')
      .upsert({
        chatbot_id: 'vany_chat',
        chatbot_name: 'Vany.chat',
        description: 'AI asistent s plným přístupem k databázi knih a pokročilým markdown renderingem',
        product_recommendations: false,
        product_button_recommendations: false,
        book_database: true,
        allowed_categories: categoryIds,
        allowed_publication_types: publicationTypeIds,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'chatbot_id'
      })
      .select();
    
    if (error) {
      console.error('❌ Chyba při přidávání chatbota:', error);
      return;
    }
    
    console.log('✅ Chatbot Vany.chat byl úspěšně přidán!');
    
    // Ověření - načtení vytvořeného chatbota
    const { data: verifyData, error: verifyError } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('chatbot_id', 'vany_chat')
      .single();
    
    if (verifyError) {
      console.error('❌ Chyba při ověření:', verifyError);
      return;
    }
    
    console.log('\n📊 Ověření vytvořeného chatbota:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${verifyData.chatbot_id}`);
    console.log(`Název: ${verifyData.chatbot_name}`);
    console.log(`Popis: ${verifyData.description}`);
    console.log(`Produktová doporučení: ${verifyData.product_recommendations ? '✅' : '❌'}`);
    console.log(`Produktové tlačítko: ${verifyData.product_button_recommendations ? '✅' : '❌'}`);
    console.log(`Databáze knih: ${verifyData.book_database ? '✅' : '❌'}`);
    console.log(`Počet kategorií: ${verifyData.allowed_categories?.length || 0}`);
    console.log(`Počet typů publikací: ${verifyData.allowed_publication_types?.length || 0}`);
    console.log(`Aktivní: ${verifyData.is_active ? '✅' : '❌'}`);
    console.log(`Vytvořeno: ${verifyData.created_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (err) {
    console.error('❌ Neočekávaná chyba:', err);
  }
}

addVanyChat();
