// TESTOVÁNÍ CELÉHO FLOW - USER MESSAGE → PROBLEM CLASSIFICATION → PAIRING
// Data jsou mockována ze SQL - žádný Supabase client v konzoli není potřeba

// Mockovaná data z tabulky leceni
const leceniData = [
  {"Problém":"Bolest hlavy – ze stresu","EO 1":"NOHEPA","EO 2":"ANTIS","EO 3":"CALMING","Prawtein":"Reishi","TČM wan":"063 - Klidné dřevo","Aloe":"Aloe","Merkaba":"ano"},
  {"Problém":"Bolest hlavy – nervová","EO 1":"NOPA NR","EO 2":"FRANKINCENSE QUATTUOR","EO 3":null,"Prawtein":"Frankincense Plus","TČM wan":"066 - Vyrovnaná energie","Aloe":null,"Merkaba":null},
  {"Problém":"Migréna","EO 1":"MIG","EO 2":"BEST FRIEND","EO 3":"Máta peprná","Prawtein":"MIG, HOCY","TČM wan":"112 - Utišení bouře","Aloe":"Aloe","Merkaba":"ano"},
  {"Problém":"Bolest zubů – akutní","EO 1":"NOPA","EO 2":"DENT","EO 3":"Hřebíček","Prawtein":null,"TČM wan":"012 - Ochlazení","Aloe":null,"Merkaba":null},
  {"Problém":"Bolest svalů – přetížení","EO 1":"MOVE IT","EO 2":"BEST FRIEND","EO 3":"RELAX","Prawtein":"Frankincense Plus","TČM wan":"008 - Skořicová směs","Aloe":"Aloe","Merkaba":"ano"},
  {"Problém":"Bolest svalů – křeče","EO 1":"RELAX, MUCRA","EO 2":"BEST FRIEND","EO 3":"–","Prawtein":"Frankincense Plus","TČM wan":"008 - Skořicová směs","Aloe":"Aloe","Merkaba":"ano"},
  {"Problém":"Bolest nervová (obecně)","EO 1":"NOPA NR","EO 2":"BEST FRIEND","EO 3":"FRANKINCENSE QUATTUOR","Prawtein":"Reishi","TČM wan":"156 - Silný kříž","Aloe":"Aloe","Merkaba":"ano"},
  {"Problém":"Bolest kloubů – akutní","EO 1":"NOPA","EO 2":"MOVE IT","EO 3":"BEST FRIEND","Prawtein":"Frankincense Plus","TČM wan":"111 – Snadný pohyb","Aloe":"–","Merkaba":"–"},
  {"Problém":"Bolest kloubů – zánět","EO 1":"MOVE IT","EO 2":"NOPA","EO 3":"BEST FRIEND","Prawtein":"Frankincense Plus","TČM wan":"012 - Ochlazení","Aloe":"Aloe","Merkaba":"ano"},
  {"Problém":"Bolest kloubů – chronická","EO 1":"MOVE IT","EO 2":"NOPA","EO 3":"BODYGUARD","Prawtein":"Frankincense Plus","TČM wan":"008 - Skořicová směs","Aloe":"–","Merkaba":"–"}
];

/**
 * Simuluje flow v chatbotu:
 * 1. User napíše zprávu
 * 2. Najde se problém v tabulce leceni podle textu
 * 3. Najdou se kombinace v leceni pro ten problém
 * 4. Extrahují se produkty a doporučení
 */
async function testFullFlow(userMessage) {
  console.clear();
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('%c🧪 TESTOVÁNÍ CELÉHO FLOW PÁROVÁNÍ', 'color: #8B5CF6; font-weight: bold; font-size: 18px;');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('');
  console.log('%c📝 USER MESSAGE:', 'color: #3B82F6; font-weight: bold;');
  console.log(`"${userMessage}"`);
  console.log('');
  
  try {
    // KROK 1: Najdi problémy z tabulky leceni které odpovídají user messagu
    console.log('%c═══ KROK 1: KLASIFIKACE PROBLÉMU ═══', 'color: #3B82F6; font-weight: bold;');
    
    const userMessageUpper = userMessage.toUpperCase();
    console.log(`📊 Máme ${leceniData.length} kombinací v tabulce leceni`);
    console.log('');
    
    // Extrahuj klíčová slova z user message
    const keywords = userMessageUpper
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['JSEM', 'JSOU', 'MNOU', 'MOJE', 'PODLE', 'SVÝMI', 'MOŽNÉ', 'MYSLÍM'].includes(w));
    
    console.log(`🔑 Klíčová slova z messagu: ${keywords.join(', ')}`);
    console.log('');
    
    // Najdi problémy které obsahují tato slova
    const detectedProblems = [];
    leceniData.forEach(record => {
      const problem = record.Problém?.toUpperCase() || '';
      keywords.forEach(keyword => {
        if (problem.includes(keyword) && !detectedProblems.includes(record.Problém)) {
          detectedProblems.push(record.Problém);
        }
      });
    });
    
    if (detectedProblems.length === 0) {
      console.log('ℹ️ Žádné problémy klasifikovány - zkus jinou zprávu');
      return;
    }
    
    console.log('%c✅ AGENT KLASIFIKOVAL PROBLÉMY:', 'color: #10B981; font-weight: bold; font-size: 16px;');
    detectedProblems.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p}`);
    });
    console.log('');
    
    // KROK 2: Najdi kombinace pro tyto problémy
    console.log('%c═══ KROK 2: HLEDÁNÍ KOMBINACÍ V LECENI ═══', 'color: #3B82F6; font-weight: bold;');
    
    const combinationsForProblems = leceniData.filter(record => {
      return detectedProblems.includes(record.Problém);
    });
    
    console.log(`🔗 Nalezeno ${combinationsForProblems.length} kombinací`);
    console.log('');
    
    // KROK 3: Extrahuj produkty a doporučení
    console.log('%c═══ KROK 3: EXTRAKCE PRODUKTŮ A DOPORUČENÍ ═══', 'color: #3B82F6; font-weight: bold;');
    
    const prawteins = new Set();
    const tcmWans = new Set();
    let aloe = false;
    let merkaba = false;
    
    combinationsForProblems.forEach(combination => {
      if (combination.Prawtein && combination.Prawtein.trim() !== '' && combination.Prawtein !== '–') {
        combination.Prawtein.split(',').forEach(p => {
          const trimmed = p.trim();
          if (trimmed && trimmed !== '–') prawteins.add(trimmed);
        });
      }
      
      if (combination['TČM wan'] && combination['TČM wan'].trim() !== '' && combination['TČM wan'] !== '–') {
        tcmWans.add(combination['TČM wan'].trim());
      }
      
      if (combination.Aloe && combination.Aloe.trim() !== '' && combination.Aloe !== '–') {
        aloe = true;
      }
      
      if (combination.Merkaba && combination.Merkaba.trim() !== '' && combination.Merkaba !== '–' && combination.Merkaba.toLowerCase() === 'ano') {
        merkaba = true;
      }
    });
    
    console.log('%c🥤 EXTRAHOVANÉ PRODUKTY:', 'color: #10B981; font-weight: bold; font-size: 16px;');
    console.log('');
    console.log('%cPRAWTEINY:', 'color: #10B981; font-weight: bold;');
    if (prawteins.size > 0) {
      Array.from(prawteins).forEach(p => {
        console.log(`  • ${p}`);
      });
    } else {
      console.log('  (žádné)');
    }
    console.log('');
    
    console.log('%cTČM WAN:', 'color: #3B82F6; font-weight: bold;');
    if (tcmWans.size > 0) {
      Array.from(tcmWans).forEach(t => {
        console.log(`  • ${t}`);
      });
    } else {
      console.log('  (žádné)');
    }
    console.log('');
    
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
    console.log('%c💧 DOPLŇKOVÁ DOPORUČENÍ:', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
    console.log('');
    console.log(`%c  💧 ALOE: ${aloe ? '✅ ANO' : '❌ NE'}`, aloe ? 'color: #10B981; font-size: 18px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;' : 'color: #EF4444; font-size: 18px;');
    console.log('');
    console.log(`%c  ✨ MERKABA: ${merkaba ? '✅ ANO' : '❌ NE'}`, merkaba ? 'color: #8B5CF6; font-size: 18px; font-weight: bold; background: #F5F3FF; padding: 8px; border-radius: 4px;' : 'color: #EF4444; font-size: 18px;');
    console.log('');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
    console.log('');
    
    // VÝSLEDNÝ OBJEKT
    console.log('%c✅ VÝSLEDNÝ PAIRING INFO:', 'color: #10B981; font-weight: bold; font-size: 16px;');
    const pairingInfo = {
      detectedProblems,
      combinations: combinationsForProblems.length,
      prawteins: Array.from(prawteins),
      tcmWans: Array.from(tcmWans),
      aloe,
      merkaba
    };
    console.table(pairingInfo);
    
    return pairingInfo;
    
  } catch (error) {
    console.error('❌ KRITICKÁ CHYBA:', error);
  }
}

window.testFullFlow = testFullFlow;

console.clear();
console.log('✅ Script načten');
console.log('');
console.log('%c📖 POUŽITÍ - TESTUJ CELÝ FLOW:', 'color: #3B82F6; font-weight: bold; font-size: 14px;');
console.log('');
console.log('%c  testFullFlow("Bolí mě hlava a jsem vypálený")', 'color: #10B981; font-size: 14px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;');
console.log('%c  testFullFlow("Boláček v koleni")', 'color: #10B981; font-size: 14px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;');
console.log('%c  testFullFlow("Záboly v zádech po sportování")', 'color: #10B981; font-size: 14px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;');
console.log('');
console.log('%c💡 PŘÍKLADY TEXTŮ PRO TESTOVÁNÍ:', 'color: #F59E0B; font-weight: bold;');
console.log('  - "Bolí mě hlava ze stresu"');
console.log('  - "Migréna mě trápí"');
console.log('  - "Boláček v koleni"');
console.log('  - "Zánět svalů"');
console.log('  - "Bolest zubů"');
console.log('');
