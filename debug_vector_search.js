/**
 * 🔍 DEBUGGING SKRIPT PRO VEKTOROVÉ VYHLEDÁVÁNÍ
 * 
 * Tento skript ověří:
 * 1. Kolik embeddingů máme v databázi
 * 2. Jaké jsou hodnoty similarity_threshold
 * 3. Proč vektorové vyhledávání nevrací výsledky
 */

// Spustíme v browseru console na stránce aplikace

async function debugVectorSearch() {
    console.log('🔍 === DEBUGGING VEKTOROVÉHO VYHLEDÁVÁNÍ ===');
    
    // Import Supabase (použijeme globální objekt nebo vytvoříme nový)
    const { createClient } = supabase || window.supabase;
    
    const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';
    
    const client = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Počet embeddingů
    console.log('1️⃣ Kontroluji počet embeddingů...');
    const { count: totalEmbeddings } = await client
        .from('product_embeddings')
        .select('*', { count: 'exact', head: true });
    console.log(`📊 Celkem embeddingů: ${totalEmbeddings}`);
    
    const { count: completedEmbeddings } = await client
        .from('product_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('embedding_status', 'completed')
        .not('embedding', 'is', null);
    console.log(`✅ Dokončených embeddingů: ${completedEmbeddings}`);
    
    // 2. Vzorky embeddingů
    console.log('2️⃣ Vzorky embeddingů...');
    const { data: samples } = await client
        .from('product_embeddings')
        .select('product_code, product_name, embedding_status')
        .eq('embedding_status', 'completed')
        .limit(5);
    
    console.log('📋 Vzorky produktů:', samples);
    
    // 3. Test vektorového vyhledávání s nízkým prahem
    console.log('3️⃣ Test vektorového vyhledávání...');
    
    // Získáme první embedding jako testovací
    const { data: firstEmbedding } = await client
        .from('product_embeddings')
        .select('embedding')
        .eq('embedding_status', 'completed')
        .not('embedding', 'is', null)
        .limit(1);
    
    if (!firstEmbedding || firstEmbedding.length === 0) {
        console.log('❌ Žádné embeddingy k testování!');
        return;
    }
    
    console.log('🧪 Testuji s reálným embeddingem...');
    
    // Test s VELMI nízkým prahem
    const { data: lowThreshold, error: lowError } = await client.rpc('search_products_by_vector', {
        query_embedding: firstEmbedding[0].embedding,
        similarity_threshold: 0.1, // VELMI nízký práh
        max_results: 10
    });
    
    console.log('🔍 Test s prahem 0.1:', { data: lowThreshold, error: lowError });
    
    // Test s NULOVÝM prahem
    const { data: zeroThreshold, error: zeroError } = await client.rpc('search_products_by_vector', {
        query_embedding: firstEmbedding[0].embedding,
        similarity_threshold: 0.0, // NULOVÝ práh
        max_results: 10
    });
    
    console.log('🔍 Test s prahem 0.0:', { data: zeroThreshold, error: zeroError });
    
    // 4. Přímý SQL dotaz
    console.log('4️⃣ Přímý SQL test...');
    const { data: directQuery, error: directError } = await client
        .from('product_embeddings')
        .select('product_code, product_name, embedding_status')
        .eq('embedding_status', 'completed')
        .not('embedding', 'is', null)
        .limit(3);
    
    console.log('📊 Přímý dotaz na embeddingy:', { data: directQuery, error: directError });
    
    console.log('🏁 === KONEC DEBUGGINGU ===');
}

// Spusť debug
debugVectorSearch().catch(console.error);
