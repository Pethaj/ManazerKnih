/**
 * CONSOLE TEST - Spustit v DevTools aplikace
 * 
 * Otevři aplikaci na http://localhost:5173
 * Přihlaš se
 * Otevři DevTools (F12)
 * Jdi na Console tab
 * Zkopíruj a spusť tento skript:
 * 
 * =========================================
 */

(async () => {
    console.log('%c🚀 SPOUŠTĚNÍ TESTU ACCOUNT API', 'color: blue; font-size: 16px; font-weight: bold;');
    
    // 1. Načti token z localStorage
    const sessionStr = localStorage.getItem('app_user_session');
    if (!sessionStr) {
        console.error('%c❌ Session nenalezena! Nejsi přihlášen.', 'color: red; font-weight: bold;');
        return;
    }
    
    const session = JSON.parse(sessionStr);
    const token = session.token;
    const email = session.email;
    
    console.log(`%c✅ Session nalezena`, 'color: green; font-weight: bold;');
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Token: ${token.substring(0, 35)}...`);
    
    // 2. Příprava API call
    const apiUrl = 'https://api.mybewit.com/account?include=bbo.customer';
    console.log(`\n🌐 API URL: ${apiUrl}`);
    console.log('%c⏳ Odesílám požadavek...', 'color: orange;');
    
    try {
        // 3. Volej API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log(`\n📊 HTTP Status: ${response.status} ${response.statusText}`);
        
        // 4. Výsledky
        const data = await response.json();
        
        if (!response.ok) {
            console.error('%c❌ API vrátila chybu', 'color: red; font-weight: bold;');
            console.error('Chyba data:');
            console.table(data);
            return;
        }

        console.log('%c✅ Úspěšná odpověď!', 'color: green; font-weight: bold;');
        console.log('\n📦 Vrácená data:');
        console.table(data);
        console.log('Kompletní data:', data);

    } catch (err) {
        console.error('%c❌ Chyba při volání API:', 'color: red; font-weight: bold;', err);
    }
    
    console.log('\n%c✅ Test dokončen', 'color: green; font-weight: bold; font-size: 14px;');
})();
