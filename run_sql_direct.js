// Pokus o spuštění SQL přímo přes HTTP (bez supabase-js)
// Použijeme SQL Query endpoint

const SQL_QUERIES = [
  // 1. Přidání sloupce
  `ALTER TABLE public.chatbot_settings ADD COLUMN IF NOT EXISTS webhook_url TEXT;`,
  
  // 2. Nastavení pro Wany.Chat
  `UPDATE public.chatbot_settings 
   SET webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
       updated_at = NOW()
   WHERE chatbot_id = 'vany_chat';`,
  
  // 3. Nastavení pro Sana Local Format
  `UPDATE public.chatbot_settings 
   SET webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
       updated_at = NOW()
   WHERE chatbot_id = 'sana_local_format' AND webhook_url IS NULL;`
];

async function runSQLDirect() {
  console.log('🚀 Pokouším se spustit SQL příkazy...\n');
  
  console.log('⚠️  UPOZORNĚNÍ: PostgREST API neumožňuje spouštění DDL příkazů (ALTER TABLE)');
  console.log('📝 Musíš spustit SQL ručně v Supabase SQL Editoru\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 ZKOPÍRUJ A SPUSŤ TENTO SQL V SUPABASE SQL EDITORU:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  SQL_QUERIES.forEach((query, index) => {
    console.log(`-- Příkaz ${index + 1}:`);
    console.log(query);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📖 Nebo použij soubor: add_webhook_url_field.sql');
  console.log('📖 Nebo použij soubor: INSTRUKCE_WEBHOOK_WANY_CHAT.md (kompletní návod)\n');
  
  console.log('✅ Po spuštění SQL pokračuj s konfigurací SanaChat komponenty');
  console.log('   aby načítala webhook_url z chatbot_settings místo hardcoded hodnoty.\n');
}

runSQLDirect();
