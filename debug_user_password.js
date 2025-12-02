// Debug hesla pro konkrétního uživatele
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Debug hesla pro uživatele a@a.cz\n');

const debugPassword = async () => {
    try {
        // Načti uživatele
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'a@a.cz')
            .single();
        
        if (error || !user) {
            console.log('❌ Uživatel nenalezen');
            return;
        }
        
        console.log('✅ Uživatel nalezen:');
        console.log('   Email:', user.email);
        console.log('   ID:', user.id);
        console.log('   Password hash:', user.password_hash);
        console.log('   Hash prefix:', user.password_hash.substring(0, 7));
        console.log('   Created:', user.created_at);
        console.log('   Updated:', user.updated_at);
        
        // Zkus různá hesla
        console.log('\n🧪 Testování různých hesel:\n');
        
        const testPasswords = [
            'a',
            'aa',
            'aaa',
            'aaaa',
            'aaaaa',
            'aaaaaa',
            'test123',
            'test1234',
            'noveheslo',
            'NovaHeslo123'
        ];
        
        for (const password of testPasswords) {
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log(`   "${password}": ${isValid ? '✅ SEDÍ!' : '❌ nesedí'}`);
            if (isValid) {
                console.log(`\n🎉 SPRÁVNÉ HESLO NALEZENO: "${password}"\n`);
            }
        }
        
        // Ukáž, jaké heslo by vytvořilo tento hash
        console.log('\n📊 Analýza hash:');
        console.log('   Algoritmus:', user.password_hash.substring(0, 4));
        console.log('   Cost factor:', user.password_hash.substring(4, 6));
        
    } catch (err) {
        console.error('💥 Chyba:', err);
    }
};

debugPassword();


