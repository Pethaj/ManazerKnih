#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Jednoduchý skript pro zobrazení SQL migrace
 * 
 * Protože Supabase JS klient nemůže přímo spustit DDL příkazy,
 * tento skript vypíše SQL pro manuální spuštění v Supabase SQL Editoru.
 */
async function showMigrationSQL() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📄 SQL MIGRACE: Přidání kategorie do get_products_with_pinyin_names()');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  
  try {
    // Načteme SQL soubor
    const sqlPath = join(__dirname, 'supabase/migrations/20260217_add_category_to_pinyin_function.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    console.log('📍 Umístění souboru:');
    console.log(`   ${sqlPath}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📋 INSTRUKCE PRO SPUŠTĚNÍ');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('MOŽNOST 1: Supabase Dashboard SQL Editor');
    console.log('   1. Otevřete: https://supabase.com/dashboard/project/modopafybeslbcqjxsve/sql/new');
    console.log('   2. Zkopírujte SQL níže');
    console.log('   3. Klikněte na "RUN"');
    console.log('');
    console.log('MOŽNOST 2: Supabase CLI');
    console.log('   supabase db execute -f supabase/migrations/20260217_add_category_to_pinyin_function.sql');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📝 SQL KÓD');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(sqlContent);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ SQL PŘIPRAVENO K SPUŠTĚNÍ');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Po spuštění SQL:');
    console.log('   1. Restartujte aplikaci (npm run dev)');
    console.log('   2. Spusťte test: npx tsx test-eo-blend-matching.ts');
    console.log('   3. Otestujte NOHEPA v chatbotu');
    console.log('');
    
  } catch (error) {
    console.error('❌ Chyba při načítání SQL souboru:', error);
    process.exit(1);
  }
}

showMigrationSQL();
