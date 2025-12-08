// Script pro přidání webhook_url pole a nastavení pro Wany.Chat
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addWebhookField() {
  console.log('🚀 Přidávám pole webhook_url a nastavuji pro Wany.Chat...');
  
  try {
    // KROK 1: Přidání pole webhook_url - to musíme udělat přes SQL
    // Protože Supabase JS klient neumí ALTER TABLE, použijeme RPC nebo přímý SQL
    console.log('📝 Pole webhook_url bude přidáno přes SQL příkaz...');
    
    // KROK 2: Nastavení webhook URL pro Wany.Chat
    console.log('🔧 Nastavuji webhook URL pro Wany.Chat...');
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
      console.log('ℹ️  Pravděpodobně ještě neexistuje sloupec webhook_url. Spusť SQL script add_webhook_url_field.sql v Supabase SQL editoru.');
      return;
    }
    
    console.log('✅ Webhook URL pro Wany.Chat nastaven!');
    
    // KROK 3: Nastavení webhook URL pro Sana Local Format (pokud ještě nemá)
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
      console.log('⚠️  Sana Local Format webhook nebyl nastaven (možná chatbot neexistuje):', sanaError.message);
    } else {
      console.log('✅ Webhook URL pro Sana Local Format nastaven!');
    }
    
    // Ověření
    const { data: verifyData, error: verifyError } = await supabase
      .from('chatbot_settings')
      .select('chatbot_id, chatbot_name, webhook_url, is_active, updated_at')
      .in('chatbot_id', ['vany_chat', 'sana_local_format'])
      .order('chatbot_name');
    
    if (verifyError) {
      console.error('❌ Chyba při ověření:', verifyError);
      return;
    }
    
    console.log('\n📊 Ověření nastavených webhooků:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    verifyData?.forEach(chatbot => {
      console.log(`\n🤖 ${chatbot.chatbot_name} (${chatbot.chatbot_id})`);
      console.log(`   Webhook: ${chatbot.webhook_url || '❌ Není nastaven'}`);
      console.log(`   Aktivní: ${chatbot.is_active ? '✅' : '❌'}`);
      console.log(`   Aktualizováno: ${chatbot.updated_at}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (err) {
    console.error('❌ Neočekávaná chyba:', err);
  }
}

addWebhookField();
