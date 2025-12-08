import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://modopafybeslbcqjxsve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'
);

console.log('🔧 Přidávám sloupec webhook_url...');

// Přidej sloupec pomocí raw SQL
const { error: sqlError } = await supabase.rpc('exec_sql', {
  sql: 'ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS webhook_url TEXT;'
});

if (sqlError && !sqlError.message.includes('already exists')) {
  console.error('❌ Chyba při přidávání sloupce:', sqlError);
  process.exit(1);
}

console.log('✅ Sloupec přidán');
console.log('');
console.log('🔄 Aktualizuji webhook URL pro Wany.Chat...');

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

console.log('✅ HOTOVO! Wany.Chat webhook URL nastaven:');
console.log('   📍', data[0].webhook_url);
