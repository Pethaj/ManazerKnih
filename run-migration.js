import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Spouštím SQL migraci...\n');

  try {
    // 1. Přidat sloupec
    console.log('1️⃣ Přidávám sloupec group_products_by_category...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS group_products_by_category BOOLEAN DEFAULT FALSE;'
    });

    if (alterError) {
      console.log('⚠️  Zkouším alternativní metodu...');
      
      // Alternativní metoda - zkusíme přidat sloupec přes update
      const { error: updateError } = await supabase
        .from('chatbot_settings')
        .select('chatbot_id')
        .limit(1);
      
      if (updateError) {
        throw new Error(`Chyba při připojení k databázi: ${updateError.message}`);
      }
      
      console.log('✅ Připojení k databázi funguje');
      console.log('\n⚠️  DŮLEŽITÉ: Musíš spustit SQL migraci manuálně v Supabase Dashboard:');
      console.log('\n📋 SQL příkazy ke spuštění:');
      console.log('-------------------------------------------');
      console.log(`
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS group_products_by_category BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN chatbot_settings.group_products_by_category IS 
'Pokud je TRUE, produkty v tabulce "Súvisející produkty BEWIT" se zobrazí rozdělené podle kategorií';

CREATE INDEX IF NOT EXISTS idx_chatbot_settings_group_by_category 
ON chatbot_settings(group_products_by_category) 
WHERE group_products_by_category = TRUE;
      `);
      console.log('-------------------------------------------\n');
      console.log('🔗 Otevři Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/modopafybeslbcqjxsve/editor');
      console.log('\n📝 Kroky:');
      console.log('   1. Klikni na "SQL Editor" v levém menu');
      console.log('   2. Zkopíruj a vlož SQL příkazy výše');
      console.log('   3. Klikni na "Run"');
      console.log('   4. Obnov aplikaci v prohlížeči\n');
      
      process.exit(1);
    }

    console.log('✅ Sloupec byl přidán');

    // 2. Ověření
    console.log('\n2️⃣ Ověřuji, že sloupec existuje...');
    const { data, error } = await supabase
      .from('chatbot_settings')
      .select('chatbot_id, chatbot_name, group_products_by_category')
      .limit(1);

    if (error) {
      throw new Error(`Chyba při ověření: ${error.message}`);
    }

    console.log('✅ Sloupec group_products_by_category existuje!');
    console.log('\n📊 Ukázka dat:');
    console.log(data);

    console.log('\n✅ Migrace dokončena úspěšně!');
    console.log('🔄 Obnov aplikaci v prohlížeči (F5)');

  } catch (error) {
    console.error('\n❌ Chyba při migraci:', error.message);
    process.exit(1);
  }
}

runMigration();
