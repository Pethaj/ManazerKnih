#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('📄 SQL MIGRACE V3.0: Všechny produkty v matching');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');

try {
  const sqlPath = join(__dirname, 'supabase/migrations/20260217_v3_all_products_matching.sql');
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
  console.log('   2. Spusťte test: npx tsx test-critical-eo.ts');
  console.log('   3. Otestujte NO, NOSE, NOPA v chatbotu');
  console.log('');
  console.log('⚠️  DŮLEŽITÉ:');
  console.log('   - Počet produktů se zvýší z ~1000 na ~2500');
  console.log('   - Category-based filtering zajišťuje rychlý matching');
  console.log('');
  
} catch (error) {
  console.error('❌ Chyba při načítání SQL souboru:', error);
  process.exit(1);
}
