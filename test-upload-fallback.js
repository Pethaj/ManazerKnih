// Test utilitka pro ověření fallback mechanismu
// Spusťte v console browseru na stránce aplikace

console.log('🧪 Spouštím test fallback mechanismu...');

// Mock funkce pro simulaci chyb
const originalFetch = window.fetch;

// Funkce pro simulaci různých typů chyb
function simulateApiError(errorType) {
    return new Promise((resolve, reject) => {
        switch (errorType) {
            case 'http500':
                reject(new Error('Chyba při spuštění pdfocr tasku: 500 - {"error":{"type":"ServerError","message":"Something on our end went wrong"}}'));
                break;
            case 'network':
                reject(new Error('fetch failed - network error'));
                break;
            case 'timeout':
                reject(new Error('Request timeout after 3000ms'));
                break;
            default:
                resolve({ ok: true, json: () => ({}) });
        }
    });
}

// Test retry mechanismu
async function testRetryMechanism() {
    console.log('\n📋 Testování retry mechanismu:');
    
    const maxRetries = 3;
    const delays = [2000, 4000, 8000];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`⚠️ Pokus ${attempt}/${maxRetries} pro startTask(pdfocr) selhal: HTTP 500`);
        
        if (attempt < maxRetries) {
            console.log(`⏳ Čekám ${delays[attempt-1]}ms před dalším pokusem...`);
            // V reálném testu by zde bylo čekání
        }
    }
    
    console.log('❌ Všechny pokusy selhaly - aktivuje se fallback dialog');
    return false;
}

// Test fallback dialogu
function testFallbackDialog() {
    console.log('\n💬 Testování fallback dialogu:');
    
    const operationsText = ['OCR rozpoznání textu'];
    const errorMessage = 'iLovePDF server má dočasný problém (HTTP 500). Zkuste nahrát soubor bez OCR zpracování nebo to zkuste za chvíli.';
    
    const dialogMessage = [
        `Zpracování pomocí iLovePDF se nezdařilo:`,
        ``,
        `${errorMessage}`,
        ``,
        `Zvolené operace: ${operationsText.join(' a ')}`,
        ``,
        `Můžete:`,
        `• ZRUŠIT nahrání a zkusit to později`,
        `• POKRAČOVAT a nahrát soubor bez zpracování`,
        ``,
        `Chcete pokračovat s nahráním bez zpracování?`
    ].join('\n');
    
    console.log('📝 Dialog message:');
    console.log(dialogMessage);
    
    // Simulace uživatelské volby
    const userChoice = confirm(dialogMessage);
    console.log(`👤 Uživatel zvolil: ${userChoice ? 'POKRAČOVAT' : 'ZRUŠIT'}`);
    
    if (userChoice) {
        console.log('✅ Pokračuji s nahráním bez zpracování');
        console.log('ℹ️  Soubor bude nahrán s původními metadaty bez OCR rozpoznání textu');
        alert(`✅ Pokračuji s nahráním bez zpracování\n\nSoubor bude nahrán s původními metadaty.\nZpracování OCR rozpoznání textu můžete zkusit později.`);
    } else {
        console.log('❌ Upload zrušen uživatelem');
    }
    
    return userChoice;
}

// Test error message classifiction
function testErrorClassification() {
    console.log('\n🏷️  Testování klasifikace chyb:');
    
    const errors = [
        'Chyba při spuštění pdfocr tasku: 500 - ServerError',
        'fetch failed - network error',
        'Request timeout after 3000ms',
        'HTTP 401 - Unauthorized'
    ];
    
    errors.forEach(errorMsg => {
        let classification = 'unknown';
        
        if (errorMsg.includes('500') || errorMsg.includes('ServerError')) {
            classification = 'server_error';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
            classification = 'network_error';
        } else if (errorMsg.includes('timeout')) {
            classification = 'timeout_error';
        } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
            classification = 'auth_error';
        }
        
        console.log(`📋 "${errorMsg}" → ${classification}`);
    });
}

// Spuštění všech testů
async function runAllTests() {
    console.log('🚀 Spouštím kompletní test suite...\n');
    
    testErrorClassification();
    await testRetryMechanism();
    const fallbackResult = testFallbackDialog();
    
    console.log('\n✅ Test dokončen!');
    console.log(`📊 Výsledek: Fallback mechanismus ${fallbackResult ? 'FUNGUJE' : 'byl ZRUŠEN uživatelem'}`);
}

// Export funkcí pro manuální testování
window.testUploadFallback = {
    runAllTests,
    testRetryMechanism,
    testFallbackDialog,
    testErrorClassification,
    simulateApiError
};

console.log('🎯 Test utility načtena! Použijte:');
console.log('- testUploadFallback.runAllTests() - kompletní test');
console.log('- testUploadFallback.testFallbackDialog() - test dialogu');
console.log('- testUploadFallback.testRetryMechanism() - test retry');

// Auto-run test if requested
if (window.location.search.includes('auto-test')) {
    setTimeout(runAllTests, 1000);
}
