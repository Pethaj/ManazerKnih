// Kontrola enable_product_pairing v databázi
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2NzI2NTIsImV4cCI6MjA0NzI0ODY1Mn0.UoZ8Gx4kTjSgbdU1rH93tLX5y2bTpJHlNL4tIdJpvh0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPairing() {
  console.log('🔍 Kontroluji enable_product_pairing v databázi...');
  
  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('chatbot_id, chatbot_name, enable_product_pairing')
    .eq('chatbot_id', 'eo_smesi')
    .single();
  
  if (error) {
    console.error('❌ Chyba:', error);
    return;
  }
  
  console.log('✅ Výsledek z DB:', data);
  console.log('📊 enable_product_pairing:', data.enable_product_pairing);
  console.log('📊 typ:', typeof data.enable_product_pairing);
}

checkPairing();
