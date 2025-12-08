/**
 * Jednoduchý skript pro aktualizaci Webhook URL pro Wany.Chat
 * Používá hardcoded Supabase credentials ze src/lib/supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWanyChatWebhook() {
    console.log('🚀 Spouštím aktualizaci webhook URL pro Wany.Chat...\n');

    try {
        // KROK 1: Aktualizuj Wany.Chat webhook
        console.log('📋 KROK 1: Aktualizuji webhook URL pro Wany.Chat...');
        
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

        if (!updateData || updateData.length === 0) {
            console.error('❌ Chatbot "vany_chat" nebyl nalezen v databázi!');
            process.exit(1);
        }

        console.log('✅ Wany.Chat webhook URL aktualizován');
        console.log('   URL:', updateData[0]?.webhook_url || 'N/A');
        console.log('');

        // KROK 2: Nastav webhook pro Sana Local Format (pokud ještě nemá)
        console.log('📋 KROK 2: Kontroluji webhook URL pro Sana Local Format...');
        
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

        // KROK 3: Ověření - zobraz všechny aktivní chatboty
        console.log('📋 KROK 3: Ověření - seznam aktivních chatbotů:\n');
        
        const { data: chatbots, error: listError } = await supabase
            .from('chatbot_settings')
            .select('chatbot_id, chatbot_name, webhook_url, is_active')
            .eq('is_active', true)
            .order('chatbot_name');

        if (listError) {
            console.error('❌ Chyba při načítání chatbotů:', listError);
            throw listError;
        }

        console.log('┌──────────────────────┬─────────────────────────┬──────────────────────────────────────────────────┐');
        console.log('│ Chatbot ID           │ Název                   │ Webhook URL                                      │');
        console.log('├──────────────────────┼─────────────────────────┼──────────────────────────────────────────────────┤');
        
        chatbots.forEach(bot => {
            const id = (bot.chatbot_id || '').substring(0, 20).padEnd(20);
            const name = (bot.chatbot_name || '').substring(0, 23).padEnd(23);
            const webhook = (bot.webhook_url || 'není nastaven').substring(0, 48).padEnd(48);
            console.log(`│ ${id} │ ${name} │ ${webhook} │`);
        });
        
        console.log('└──────────────────────┴─────────────────────────┴──────────────────────────────────────────────────┘');
        console.log('');
        console.log('✅ Aktualizace webhook URL úspěšně dokončena!');
        console.log('');
        console.log('🎉 Wany.Chat nyní bude používat svůj vlastní N8N webhook!');
        console.log('');
        console.log('📝 Poznámka: Změny budou platit okamžitě pro nové konverzace.');

    } catch (error) {
        console.error('\n❌ Neočekávaná chyba:', error);
        process.exit(1);
    }
}

// Spusť aktualizaci
updateWanyChatWebhook();
