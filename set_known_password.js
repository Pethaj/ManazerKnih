// Nastavení známého hesla pro testování
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

const setPassword = async () => {
    const email = 'a@a.cz';
    const newPassword = 'test123456'; // Známé heslo pro testování
    
    console.log(`📝 Nastavuji heslo pro ${email}`);
    console.log(`   Heslo: ${newPassword}\n`);
    
    try {
        // 1. Najdi uživatele
        const { data: user } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();
        
        if (!user) {
            console.log('❌ Uživatel nenalezen');
            return;
        }
        
        console.log('✅ Uživatel nalezen:', user.id);
        
        // 2. Vytvoř hash
        console.log('🔐 Hashování hesla...');
        const hash = await bcrypt.hash(newPassword, 10);
        console.log('✅ Hash vytvořen:', hash.substring(0, 30) + '...');
        
        // 3. Ulož hash
        console.log('💾 Ukládám do databáze...');
        const { error } = await supabase
            .from('users')
            .update({ password_hash: hash })
            .eq('id', user.id);
        
        if (error) {
            console.log('❌ Chyba:', error.message);
            return;
        }
        
        console.log('✅ Heslo úspěšně změněno!');
        
        // 4. Ověř, že to funguje
        console.log('\n🧪 Ověřování...');
        const { data: checkUser } = await supabase
            .from('users')
            .select('password_hash')
            .eq('email', email)
            .single();
        
        if (checkUser) {
            const isValid = await bcrypt.compare(newPassword, checkUser.password_hash);
            console.log('   Heslo funguje?', isValid ? '✅ ANO' : '❌ NE');
        }
        
        console.log(`\n🎯 Teď se můžeš přihlásit s:`);
        console.log(`   Email: ${email}`);
        console.log(`   Heslo: ${newPassword}`);
        
    } catch (err) {
        console.error('💥 Chyba:', err);
    }
};

setPassword();






