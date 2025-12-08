// Script pro přidání webhook_url pole přes PostgreSQL RPC funkci
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addWebhookViaRPC() {
  console.log('🚀 Spouštím přidání webhook_url pole přes RPC funkci...');
  
  try {
    // KROK 1: Zavolej PostgreSQL funkci pro přidání sloupce
    console.log('📝 Volám funkci add_webhook_url_column()...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('add_webhook_url_column');
    
    if (rpcError) {
      console.error('❌ Chyba při volání RPC funkce:', rpcError);
      console.log('\n⚠️  Pravděpodobně funkce add_webhook_url_column() neexistuje.');
      console.log('📝 Spusť nejdřív SQL soubor: add_webhook_via_function.sql v Supabase SQL editoru');
      return;
    }
    
    console.log('✅ Výsledek RPC:', rpcData);
    
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
    
    // Nejdřív zkontrolujeme, jestli už nemá nastaven
    const { data: sanaCheck } = await supabase
      .from('chatbot_settings')
      .select('webhook_url')
      .eq('chatbot_id', 'sana_local_format')
      .single();
    
    if (!sanaCheck?.webhook_url) {
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
    } else {
      console.log('ℹ️  Sana Local Format již má webhook URL nastaven');
    }
    
    // Ověření
    console.log('\n📊 Načítám všechny aktivní chatboty s webhook URL...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('chatbot_settings')
      .select('chatbot_id, chatbot_name, webhook_url, is_active, updated_at')
      .eq('is_active', true)
      .order('chatbot_name');
    
    if (verifyError) {
      console.error('❌ Chyba při ověření:', verifyError);
      return;
    }
    
    console.log('\n📋 Přehled aktivních chatbotů:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    verifyData?.forEach(chatbot => {
      console.log(`\n🤖 ${chatbot.chatbot_name} (${chatbot.chatbot_id})`);
      if (chatbot.webhook_url) {
        const shortUrl = chatbot.webhook_url.length > 60 
          ? chatbot.webhook_url.substring(0, 60) + '...' 
          : chatbot.webhook_url;
        console.log(`   ✅ Webhook: ${shortUrl}`);
      } else {
        console.log(`   ❌ Webhook: Není nastaven`);
      }
      console.log(`   Aktualizováno: ${new Date(chatbot.updated_at).toLocaleString('cs-CZ')}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n✅ Hotovo! Webhook URL byl úspěšně nastaven pro Wany.Chat');
    
  } catch (err) {
    console.error('❌ Neočekávaná chyba:', err);
  }
}

addWebhookViaRPC();
