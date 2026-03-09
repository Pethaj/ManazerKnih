/**
 * IFRAME API TEST - FINÁLNÍ VERZE
 * 
 * ✅ Funguje - Token je v cookie "token"
 * ✅ API vrací data se status 200
 * 
 * Spustit v Console na iframe
 */

(async () => {
    console.log('%c🚀 API TEST - ACCOUNT ENDPOINT', 'color: #00d4ff; font-size: 16px; font-weight: bold;');
    console.log('═'.repeat(60));
    
    // Získej token z cookies
    const cookies = document.cookie.split(';');
    let token = null;
    
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token' && value) {
            token = decodeURIComponent(value);
            break;
        }
    }
    
    if (!token) {
        console.error('%c❌ TOKEN NENALEZEN V COOKIES', 'color: red; font-weight: bold;');
        return;
    }
    
    console.log('%c✅ TOKEN NALEZEN', 'color: green; font-weight: bold;');
    console.log(`🔐 Token: ${token.substring(0, 50)}...`);
    console.log(`📍 Zdroj: Cookie "token"`);
    
    // Volání API
    const apiUrl = 'https://api.mybewit.com/account?include=bbo.customer';
    console.log(`\n🌐 API URL: ${apiUrl}`);
    console.log('%c⏳ Odesílám požadavek...', 'color: orange;');
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log(`\n📊 HTTP Status: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('%c❌ API vrátila chybu', 'color: red; font-weight: bold;');
            console.error('Status:', response.status);
            console.error('Chyba data:');
            console.table(data);
            return;
        }

        console.log('%c✅ ÚSPĚŠNÁ ODPOVĚĎ!', 'color: green; font-weight: bold;');
        console.log('\n📦 Struktura dat:');
        console.log('Top level keys:', Object.keys(data));
        
        if (data.data) {
            console.log('\n📋 data.data keys:', Object.keys(data.data));
            console.log('\n🎯 Vrácená data:');
            console.table(data.data);
        }
        
        console.log('\n📄 Kompletní odpověď:');
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('%c❌ Chyba při volání API', 'color: red; font-weight: bold;');
        console.error('Typ chyby:', err.name);
        console.error('Zpráva:', err.message);
        console.error('Detaily:', err);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('%c✅ TEST DOKONČEN', 'color: green; font-weight: bold; font-size: 14px;');
})();
