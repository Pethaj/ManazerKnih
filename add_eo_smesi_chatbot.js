/**
 * Script pro přidání nového chatbota "EO-Smesi" do databáze
 * Spusť pomocí: node add_eo_smesi_chatbot.js
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

async function addEOSmesiChatbot() {
    console.log('🚀 Spouštím přidání chatbota "EO-Smesi"...\n');

    try {
        // KROK 1: Načti všechny kategorie
        console.log('📋 KROK 1: Načítám všechny kategorie...');
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('id');

        if (categoriesError) {
            console.error('❌ Chyba při načítání kategorií:', categoriesError);
            throw categoriesError;
        }

        const categoryIds = categories?.map(c => c.id) || [];
        console.log(`✅ Načteno ${categoryIds.length} kategorií\n`);

        // KROK 2: Načti všechny typy publikací
        console.log('📋 KROK 2: Načítám všechny typy publikací...');
        const { data: publicationTypes, error: pubTypesError } = await supabase
            .from('publication_types')
            .select('id');

        if (pubTypesError) {
            console.error('❌ Chyba při načítání typů publikací:', pubTypesError);
            throw pubTypesError;
        }

        const publicationTypeIds = publicationTypes?.map(pt => pt.id) || [];
        console.log(`✅ Načteno ${publicationTypeIds.length} typů publikací\n`);

        // KROK 3: Přidej nebo aktualizuj EO-Smesi chatbota
        console.log('📋 KROK 3: Přidávám chatbota "EO-Smesi"...');
        
        const chatbotData = {
            chatbot_id: 'eo_smesi',
            chatbot_name: 'EO-Smesi',
            description: 'AI asistent s plným přístupem k databázi knih a pokročilým markdown renderingem',
            product_recommendations: false,
            product_button_recommendations: false,
            book_database: true,
            allowed_categories: categoryIds,
            allowed_publication_types: publicationTypeIds,
            webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat',
            is_active: true,
            use_feed_1: true,
            use_feed_2: true,
            inline_product_links: false,
            enable_product_router: true,
            enable_manual_funnel: false
        };

        const { data: insertData, error: insertError } = await supabase
            .from('chatbot_settings')
            .upsert(chatbotData, {
                onConflict: 'chatbot_id'
            })
            .select();

        if (insertError) {
            console.error('❌ Chyba při přidávání chatbota:', insertError);
            throw insertError;
        }

        console.log('✅ Chatbot "EO-Smesi" byl úspěšně přidán/aktualizován\n');

        // KROK 4: Ověření - načti přidaný chatbot
        console.log('📋 KROK 4: Ověřuji přidaný chatbot...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('chatbot_settings')
            .select('*')
            .eq('chatbot_id', 'eo_smesi')
            .single();

        if (verifyError) {
            console.error('❌ Chyba při ověřování:', verifyError);
            throw verifyError;
        }

        console.log('✅ Ověření úspěšné!\n');
        console.log('📊 Detail chatbota:');
        console.log('   ID:', verifyData.chatbot_id);
        console.log('   Název:', verifyData.chatbot_name);
        console.log('   Popis:', verifyData.description);
        console.log('   Webhook URL:', verifyData.webhook_url);
        console.log('   Aktivní:', verifyData.is_active ? '✅ Ano' : '❌ Ne');
        console.log('   Databáze knih:', verifyData.book_database ? '✅ Ano' : '❌ Ne');
        console.log('   Produktová doporučení:', verifyData.product_recommendations ? '✅ Ano' : '❌ Ne');
        console.log('   Počet kategorií:', verifyData.allowed_categories?.length || 0);
        console.log('   Počet typů publikací:', verifyData.allowed_publication_types?.length || 0);
        console.log('   Use Feed 1:', verifyData.use_feed_1 ? '✅ Ano' : '❌ Ne');
        console.log('   Use Feed 2:', verifyData.use_feed_2 ? '✅ Ano' : '❌ Ne');
        console.log('   Enable Product Router:', verifyData.enable_product_router ? '✅ Ano' : '❌ Ne');
        console.log('   Enable Manual Funnel:', verifyData.enable_manual_funnel ? '✅ Ano' : '❌ Ne');

        // KROK 5: Porovnání s Wany Chat
        console.log('\n📋 KROK 5: Porovnání s Wany Chat...');
        const { data: comparisonData, error: comparisonError } = await supabase
            .from('chatbot_settings')
            .select('chatbot_id, chatbot_name, webhook_url, product_recommendations, book_database, is_active')
            .in('chatbot_id', ['eo_smesi', 'vany_chat'])
            .order('chatbot_name');

        if (comparisonError) {
            console.warn('⚠️ Varování při porovnání:', comparisonError.message);
        } else if (comparisonData) {
            console.log('\n📊 Porovnání chatbotů:');
            console.table(comparisonData);
        }

        console.log('\n✅ HOTOVO! Chatbot "EO-Smesi" je připraven k použití.');
        console.log('\n📝 Poznámky:');
        console.log('   • Webhook pro odpovědi: https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat');
        console.log('   • Webhook pro produktový funnel: https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat (sdílený)');
        console.log('   • Nastavení je stejné jako u Wany Chat');

    } catch (error) {
        console.error('\n❌ CHYBA PŘI PŘIDÁVÁNÍ CHATBOTA:', error);
        process.exit(1);
    }
}

// Spusť script
addEOSmesiChatbot();


