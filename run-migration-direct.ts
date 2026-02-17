import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Spouštím SQL migraci pomocí Supabase klienta...\n');

  try {
    // Nejdřív zkusíme ověřit, jestli sloupec už neexistuje
    console.log('1️⃣ Kontroluji existující strukturu tabulky...');
    
    const { data: existingData, error: checkError } = await supabase
      .from('chatbot_settings')
      .select('chatbot_id, chatbot_name, group_products_by_category')
      .limit(1);

    if (!checkError) {
      console.log('✅ Sloupec group_products_by_category už existuje!');
      console.log('📊 Ukázka dat:', existingData);
      console.log('\n✅ Migrace není potřeba - sloupec už je v databázi!');
      console.log('🔄 Obnov aplikaci v prohlížeči (F5)');
      return;
    }

    if (checkError && !checkError.message.includes('group_products_by_category')) {
      throw new Error(`Neočekávaná chyba: ${checkError.message}`);
    }

    console.log('⚠️  Sloupec group_products_by_category neexistuje');
    console.log('\n📋 MANUÁLNÍ MIGRACE POTŘEBNÁ\n');
    console.log('Supabase REST API neumožňuje spouštět DDL příkazy (ALTER TABLE) z bezpečnostních důvodů.');
    console.log('\n🔗 Otevři Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/modopafybeslbcqjxsve/editor\n');
    console.log('📝 Kroky:');
    console.log('   1. Klikni na "SQL Editor" v levém menu');
    console.log('   2. Zkopíruj a vlož tento SQL:\n');
    console.log('-------------------------------------------');
    
    const sql = fs.readFileSync('add_group_products_by_category.sql', 'utf-8');
    console.log(sql);
    
    console.log('-------------------------------------------\n');
    console.log('   3. Klikni na "Run" (nebo stiskni Ctrl+Enter)');
    console.log('   4. Měl by se zobrazit výsledek s ✅ úspěšnou zprávou');
    console.log('   5. Obnov aplikaci v prohlížeči (F5)\n');

  } catch (error: any) {
    console.error('\n❌ Chyba:', error.message);
    process.exit(1);
  }
}

runMigration();
