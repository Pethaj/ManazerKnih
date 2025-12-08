/**
 * Aktualizace Webhook URL pro Wany.Chat
 * 
 * Tento skript nastaví správný N8N webhook URL pro chatbot Wany.Chat
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Načti .env soubor
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Chyba: NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_ANON_KEY nejsou nastaveny v .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWanyChatWebhook() {
    console.log('🚀 Spouštím aktualizaci webhook URL pro Wany.Chat...\n');

    try {
        // KROK 1: Přidej webhook_url pole (pokud neexistuje)
        console.log('📋 KROK 1: Přidávám pole webhook_url...');
        
        // Použij RPC funkci pro spuštění DDL příkazu
        const { data: addColumnResult, error: addColumnError } = await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE public.chatbot_settings ADD COLUMN IF NOT EXISTS webhook_url TEXT;`
        });

        if (addColumnError) {
            console.warn('⚠️ Varování při přidávání sloupce:', addColumnError.message);
            console.log('   (Pravděpodobně sloupec už existuje, pokračujeme...)\n');
        } else {
            console.log('✅ Pole webhook_url je připraveno\n');
        }

        // KROK 2: Aktualizuj Wany.Chat webhook
        console.log('📋 KROK 2: Aktualizuji webhook URL pro Wany.Chat...');
        
        const { data: updateData, error: updateError } = await supabase
            .from('chatbot_settings')
            .update({
                webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
                updated_at: new Date().toISOString()
            })
            .eq('chatbot_id', 'vany_chat')
            .select();

        if (updateError) {
            console.error('❌ Chyba při aktualizaci Wany.Chat:', updateError);
            throw updateError;
        }

        console.log('✅ Wany.Chat webhook URL aktualizován');
        console.log('   URL:', updateData[0]?.webhook_url || 'N/A');
        console.log('');

        // KROK 3: Nastav webhook pro Sana Local Format (pokud ještě nemá)
        console.log('📋 KROK 3: Kontroluji webhook URL pro Sana Local Format...');
        
        const { data: sanaData, error: sanaError } = await supabase
            .from('chatbot_settings')
            .select('webhook_url')
            .eq('chatbot_id', 'sana_local_format')
            .single();

        if (!sanaError && !sanaData?.webhook_url) {
            const { data: updateSanaData, error: updateSanaError } = await supabase
                .from('chatbot_settings')
                .update({
                    webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
                    updated_at: new Date().toISOString()
                })
                .eq('chatbot_id', 'sana_local_format')
                .select();

            if (updateSanaError) {
                console.warn('⚠️ Varování při aktualizaci Sana Local Format:', updateSanaError.message);
            } else {
                console.log('✅ Sana Local Format webhook URL nastaven');
                console.log('   URL:', updateSanaData[0]?.webhook_url || 'N/A');
            }
        } else if (sanaData?.webhook_url) {
            console.log('✅ Sana Local Format už má webhook URL nastaven');
            console.log('   URL:', sanaData.webhook_url);
        }
        console.log('');

        // KROK 4: Ověření - zobraz všechny aktivní chatboty
        console.log('📋 KROK 4: Ověření - seznam aktivních chatbotů:\n');
        
        const { data: chatbots, error: listError } = await supabase
            .from('chatbot_settings')
            .select('chatbot_id, chatbot_name, webhook_url, is_active')
            .eq('is_active', true)
            .order('chatbot_name');

        if (listError) {
            console.error('❌ Chyba při načítání chatbotů:', listError);
            throw listError;
        }

        console.log('┌─────────────────────┬────────────────────────┬──────────────────────────────────────────────┐');
        console.log('│ Chatbot ID          │ Název                  │ Webhook URL                                  │');
        console.log('├─────────────────────┼────────────────────────┼──────────────────────────────────────────────┤');
        
        chatbots.forEach(bot => {
            const id = bot.chatbot_id.padEnd(19);
            const name = (bot.chatbot_name || '').substring(0, 22).padEnd(22);
            const webhook = (bot.webhook_url || 'není nastaven').substring(0, 44).padEnd(44);
            console.log(`│ ${id} │ ${name} │ ${webhook} │`);
        });
        
        console.log('└─────────────────────┴────────────────────────┴──────────────────────────────────────────────┘');
        console.log('');
        console.log('✅ Aktualizace webhook URL úspěšně dokončena!');
        console.log('');
        console.log('🎉 Wany.Chat nyní bude používat svůj vlastní N8N webhook!');

    } catch (error) {
        console.error('\n❌ Neočekávaná chyba:', error);
        process.exit(1);
    }
}

// Spusť aktualizaci
updateWanyChatWebhook();
