/**
 * TEST ACCOUNT API - NAČÍTÁNÍ TOKENU Z LOKÁLNÍ APLIKACE
 * 
 * Tento skript:
 * 1. Připojí se k běžící aplikaci přes DevTools Protocol
 * 2. Získá token z localStorage (app_user_session)
 * 3. Zavolá API endpoint s tímto tokenem
 * 
 * Spuštění:
 *   npx tsx test-account-api.ts
 * 
 * Poznámka: Aplikace musí běžet na http://localhost:5173 (Vite dev server)
 */

import fetch from 'node-fetch';

interface UserSession {
    userId: string;
    email: string;
    role: string;
    token: string;
    expiresAt: string;
}

/**
 * Získání tokenu z běžící aplikace
 */
async function getTokenFromLocalStorage(): Promise<string | null> {
    console.log('🔍 Hledám běžící aplikaci...\n');
    
    try {
        // Zkusíme připojit se na dev server
        const response = await fetch('http://localhost:5173');
        if (!response.ok) {
            throw new Error('Dev server neběží');
        }
        
        console.log('✅ Dev server nalezen na http://localhost:5173\n');
        console.log('⚠️  Poznámka: Pro načtení tokenu z localStorage musíte být přihlášeni v aplikaci\n');
        console.log('📝 Alternativa - Použijte přímo token:');
        console.log('   API_TOKEN="tvuj_token" npx tsx test-account-api.ts\n');
        
        // Pokud máme proměnnou, použijeme ji
        const token = process.env.API_TOKEN;
        if (token) {
            console.log('✅ Token nalezen v proměnné API_TOKEN\n');
            return token;
        }
        
        return null;
        
    } catch (err) {
        console.log('⚠️  Dev server není dostupný\n');
        return null;
    }
}

/**
 * Zavolání API endpointu
 */
async function callAccountAPI(token: string, bboId?: string): Promise<void> {
    let apiUrl = 'https://api.mybewit.com/account?include=bbo.customer';
    
    if (bboId) {
        apiUrl += `&bbo_id=${bboId}`;
    }
    
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   TEST ACCOUNT API - BBO CUSTOMER       ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`\n🌐 API URL: ${apiUrl}`);
    console.log(`🔐 Token: ${token.substring(0, 35)}...`);
    if (bboId) {
        console.log(`📍 BBO ID: ${bboId}`);
    }
    console.log('\n⏳ Odesílám požadavek...\n');
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
        console.log(`\n📋 Response Headers:`);
        
        const headers = response.headers as any;
        for (const [key, value] of headers.entries()) {
            console.log(`   ${key}: ${value}`);
        }

        const data = await response.json();

        if (!response.ok) {
            console.error(`\n❌ API vrátila chybu`);
            console.error('Chyba data:');
            console.error(JSON.stringify(data, null, 2));
            return;
        }

        console.log('\n✅ Úspěšná odpověď!');
        console.log('\n📦 Vrácená data:');
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('❌ Chyba při volání API:', err);
    }
}

/**
 * Hlavní funkce
 */
async function runTest(): Promise<void> {
    let token = process.env.API_TOKEN;

    if (!token) {
        token = await getTokenFromLocalStorage();
    }

    if (!token) {
        console.error('❌ Token není dostupný!\n');
        console.log('Postupy:\n');
        console.log('1️⃣  Přihlašte se v aplikaci na http://localhost:5173');
        console.log('   Pak spusťte test znovu\n');
        console.log('2️⃣  Nebo předejte token přímo:');
        console.log('   API_TOKEN="tvuj_token" npx tsx test-account-api.ts\n');
        console.log('3️⃣  S BBO ID:');
        console.log('   API_TOKEN="tvuj_token" BBO_ID="123" npx tsx test-account-api.ts');
        process.exit(1);
    }

    const bboId = process.env.BBO_ID;
    await callAccountAPI(token, bboId);
    console.log('\n✅ Test dokončen');
}

// Spuštění testu
runTest().catch((err) => {
    console.error('❌ Kritická chyba:', err);
    process.exit(1);
});
