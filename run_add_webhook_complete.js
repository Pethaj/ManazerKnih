// Kompletní script pro přidání webhook_url pole a nastavení
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addWebhookComplete() {
  console.log('🚀 Spouštím přidání webhook_url pole...');
  
  try {
    // KROK 1: Zkusíme zjistit, jestli už pole webhook_url existuje
    console.log('🔍 Kontroluji existenci pole webhook_url...');
    
    const { data: testData, error: testError } = await supabase
      .from('chatbot_settings')
      .select('webhook_url')
      .limit(1);
    
    if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
      console.log('⚠️  Pole webhook_url neexistuje, přidávám...');
      
      // Použijeme raw SQL query přes rpc
      const alterTableSQL = `
        ALTER TABLE public.chatbot_settings 
        ADD COLUMN IF NOT EXISTS webhook_url TEXT;
      `;
      
      // Bohužel přes supabase-js nemůžeme spustit DDL přímo
      // Musíme to udělat přes Supabase SQL editor
      console.log('❌ Pro přidání sloupce musíš spustit tento SQL příkaz v Supabase SQL editoru:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(alterTableSQL);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📝 Nebo použij soubor: add_webhook_url_field.sql');
      console.log('\nPo přidání sloupce spusť tento script znovu.');
      return;
    }
    
    console.log('✅ Pole webhook_url již existuje!');
    
    // KROK 2: Nastavení webhook URL pro Wany.Chat
    console.log('\n🔧 Nastavuji webhook URL pro Wany.Chat...');
    const { data: wanyData, error: wanyError } = await supabase
      .from('chatbot_settings')
      .update({
        webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
        updated_at: new Date().toISOString()
      })
      .eq('chatbot_id', 'vany_chat')
      .select();
    
    if (wanyError) {
      console.error('❌ Chyba při nastavení webhook pro Wany.Chat:', wanyError);
      return;
    }
    
    console.log('✅ Webhook URL pro Wany.Chat nastaven!');
    
    // KROK 3: Nastavení webhook URL pro Sana Local Format
    console.log('🔧 Nastavuji webhook URL pro Sana Local Format...');
    const { data: sanaData, error: sanaError } = await supabase
      .from('chatbot_settings')
      .update({
        webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
        updated_at: new Date().toISOString()
      })
      .eq('chatbot_id', 'sana_local_format')
      .select();
    
    if (sanaError) {
      console.log('⚠️  Sana Local Format webhook nebyl nastaven:', sanaError.message);
    } else {
      console.log('✅ Webhook URL pro Sana Local Format nastaven!');
    }
    
    // Ověření
    console.log('\n📊 Načítám všechny chatboty s webhook URL...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('chatbot_settings')
      .select('chatbot_id, chatbot_name, webhook_url, is_active, updated_at')
      .order('chatbot_name');
    
    if (verifyError) {
      console.error('❌ Chyba při ověření:', verifyError);
      return;
    }
    
    console.log('\n📋 Přehled všech chatbotů:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    verifyData?.forEach(chatbot => {
      console.log(`\n🤖 ${chatbot.chatbot_name} (${chatbot.chatbot_id})`);
      console.log(`   Webhook: ${chatbot.webhook_url || '❌ Není nastaven'}`);
      console.log(`   Aktivní: ${chatbot.is_active ? '✅' : '❌'}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (err) {
    console.error('❌ Neočekávaná chyba:', err);
  }
}

addWebhookComplete();
