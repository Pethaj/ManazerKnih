// Komplexní test změny hesla
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Kompletní test změny hesla\n');

const testFullFlow = async () => {
    const email = 'a@a.cz';
    
    try {
        // KROK 1: Nastavit počáteční heslo
        console.log('📝 KROK 1: Nastavení počátečního hesla');
        const initialPassword = 'PocatecniHeslo123';
        
        const { data: user } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();
        
        if (!user) {
            console.log('❌ Uživatel nenalezen');
            return;
        }
        
        const initialHash = await bcrypt.hash(initialPassword, 10);
        await supabase
            .from('users')
            .update({ password_hash: initialHash })
            .eq('id', user.id);
        
        console.log('✅ Počáteční heslo nastaveno:', initialPassword);
        
        // Ověř, že funguje
        const { data: check1 } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', user.id)
            .single();
        
        const works1 = await bcrypt.compare(initialPassword, check1.password_hash);
        console.log('   Ověření:', works1 ? '✅ funguje' : '❌ nefunguje');
        
        // KROK 2: Simulovat změnu hesla (jako v aplikaci)
        console.log('\n🔄 KROK 2: Simulace změny hesla v aplikaci');
        const newPassword = 'NoveHeslo456';
        
        console.log('   Hashování nového hesla...');
        const newHash = await bcrypt.hash(newPassword, 10);
        console.log('   Hash (prvních 30 znaků):', newHash.substring(0, 30) + '...');
        
        console.log('   UPDATE v databázi...');
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', user.id);
        
        if (updateError) {
            console.log('❌ UPDATE chyba:', updateError.message);
            return;
        }
        
        console.log('✅ Heslo změněno na:', newPassword);
        
        // KROK 3: Ověřit nové heslo
        console.log('\n🧪 KROK 3: Ověření nového hesla');
        
        const { data: check2 } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', user.id)
            .single();
        
        console.log('   Hash z DB (prvních 30 znaků):', check2.password_hash.substring(0, 30) + '...');
        console.log('   Testování hesla:', newPassword);
        
        const works2 = await bcrypt.compare(newPassword, check2.password_hash);
        console.log('   Výsledek bcrypt.compare:', works2 ? '✅ FUNGUJE' : '❌ NEFUNGUJE');
        
        // KROK 4: Zkusit přihlášení (simulace)
        console.log('\n🔐 KROK 4: Simulace přihlášení');
        
        const { data: loginUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
        
        if (!loginUser) {
            console.log('❌ Uživatel nenalezen při přihlášení');
            return;
        }
        
        console.log('   Email:', loginUser.email);
        console.log('   Hash z DB:', loginUser.password_hash.substring(0, 30) + '...');
        console.log('   Testované heslo:', newPassword);
        
        const isPasswordValid = await bcrypt.compare(newPassword, loginUser.password_hash);
        console.log('   bcrypt.compare:', isPasswordValid ? '✅ PŘIHLÁŠENÍ ÚSPĚŠNÉ' : '❌ PŘIHLÁŠENÍ SELHALO');
        
        // KROK 5: Zkusit staré heslo (mělo by selhat)
        console.log('\n🚫 KROK 5: Test starého hesla (mělo by selhat)');
        const oldWorks = await bcrypt.compare(initialPassword, loginUser.password_hash);
        console.log('   Staré heslo funguje?', oldWorks ? '⚠️ ANO (problém!)' : '✅ NE (správně)');
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ TEST DOKONČEN');
        console.log('='.repeat(50));
        
    } catch (err) {
        console.error('💥 Chyba:', err);
    }
};

testFullFlow();




