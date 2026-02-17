import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 Aplikuji SQL migraci V3.0');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  try {
    const sqlPath = join(__dirname, 'supabase/migrations/20260217_v3_all_products_matching.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Načten SQL soubor:', sqlPath);
    console.log('📏 Velikost:', sqlContent.length, 'znaků\n');
    
    // Extrahovat pouze CREATE FUNCTION část (bez komentářů na začátku)
    const createFunctionMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION[\s\S]+?\$\$ LANGUAGE plpgsql;/);
    
    if (!createFunctionMatch) {
      throw new Error('Nepodařilo se najít CREATE FUNCTION v SQL souboru');
    }
    
    const createFunctionSQL = createFunctionMatch[0];
    
    console.log('🔧 Spouštím CREATE OR REPLACE FUNCTION...\n');
    
    // Supabase JS klient nemůže přímo spustit DDL, musíme použít RPC nebo REST API
    // Zkusíme přes fetch s REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql: createFunctionSQL })
    });
    
    if (!response.ok) {
      // Fallback: Vypsat SQL pro manuální spuštění
      console.log('⚠️  Automatické spuštění selhalo.');
      console.log('📋 MANUÁLNÍ SPUŠTĚNÍ POTŘEBNÉ\n');
      console.log('Zkopíruj následující SQL a spusť v Supabase SQL Editoru:');
      console.log('https://supabase.com/dashboard/project/modopafybeslbcqjxsve/sql/new\n');
      console.log('─'.repeat(70));
      console.log(sqlContent);
      console.log('─'.repeat(70));
      console.log('\n❌ Migrace NEBYLA aplikována automaticky.');
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('✅ SQL úspěšně spuštěn!');
    console.log('📊 Odpověď:', data);
    
    // Test: Zkontrolovat, že funkce vrací více produktů
    console.log('\n🧪 Testování aktualizované funkce...');
    const { data: products, error } = await supabase.rpc('get_products_with_pinyin_names');
    
    if (error) {
      console.log('⚠️  Chyba při testování:', error.message);
    } else {
      console.log(`✅ Funkce vrací ${products?.length || 0} produktů`);
      
      // Zkontrolovat "Nohepa esenciální olej"
      const nohepa = products?.find((p: any) => 
        p.product_name.toLowerCase().includes('nohepa')
      );
      
      if (nohepa) {
        console.log('✅ "Nohepa esenciální olej" JE v RPC výsledcích!');
        console.log(`   ID: ${nohepa.id}, Název: ${nohepa.product_name}`);
      } else {
        console.log('⚠️  "Nohepa esenciální olej" stále NENÍ v RPC výsledcích');
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('✅ MIGRACE DOKONČENA');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log('📋 Další kroky:');
    console.log('   1. Restartuj dev server (npm run dev)');
    console.log('   2. Spusť test: npx tsx test-critical-eo.ts');
    console.log('   3. Otestuj NOHEPA v chatbotu\n');
    
  } catch (error) {
    console.error('❌ Chyba při migraci:', error);
    console.log('\n📋 MANUÁLNÍ ŘEŠENÍ:');
    console.log('Spusť SQL manuálně v Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/modopafybeslbcqjxsve/sql/new\n');
    
    const sqlPath = join(__dirname, 'supabase/migrations/20260217_v3_all_products_matching.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    console.log(sqlContent);
    
    process.exit(1);
  }
}

applyMigration();
