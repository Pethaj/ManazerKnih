// Script pro opravu názvu chatbota z Vany.chat na Wany.Chat
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixWanyChatName() {
  console.log('🔧 Opravuji název chatbota z Vany.chat na Wany.Chat...');
  
  try {
    // Aktualizace názvu
    const { data, error } = await supabase
      .from('chatbot_settings')
      .update({
        chatbot_name: 'Wany.Chat',
        updated_at: new Date().toISOString()
      })
      .eq('chatbot_id', 'vany_chat')
      .select();
    
    if (error) {
      console.error('❌ Chyba při aktualizaci názvu:', error);
      return;
    }
    
    console.log('✅ Název byl úspěšně opraven na Wany.Chat!');
    
    // Ověření
    const { data: verifyData, error: verifyError } = await supabase
      .from('chatbot_settings')
      .select('chatbot_id, chatbot_name, updated_at')
      .eq('chatbot_id', 'vany_chat')
      .single();
    
    if (verifyError) {
      console.error('❌ Chyba při ověření:', verifyError);
      return;
    }
    
    console.log('\n📊 Ověření:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${verifyData.chatbot_id}`);
    console.log(`Název: ${verifyData.chatbot_name}`);
    console.log(`Aktualizováno: ${verifyData.updated_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (err) {
    console.error('❌ Neočekávaná chyba:', err);
  }
}

fixWanyChatName();
