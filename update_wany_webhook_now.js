import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://modopafybeslbcqjxsve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'
);

const { data, error } = await supabase
  .from('chatbot_settings')
  .update({ 
    webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat'
  })
  .eq('chatbot_id', 'vany_chat')
  .select();

if (error) {
  console.error('❌ Chyba:', error);
  process.exit(1);
}

console.log('✅ Hotovo! Webhook URL změněn pro Wany.Chat:');
console.log('   Nový webhook:', data[0].webhook_url);
