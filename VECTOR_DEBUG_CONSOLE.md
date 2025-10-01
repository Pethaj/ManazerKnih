# 🔍 DIAGNOSTIKA VEKTOROVÉHO VYHLEDÁVÁNÍ

## Jak spustit diagnostiku:

1. **Otevřete aplikaci:** `http://localhost:5174`
2. **Otevřete Developer Console (F12)**
3. **Zkopírujte a vložte následující kód:**

```javascript
// === RYCHLÁ DIAGNOSTIKA VEKTOROVÉHO VYHLEDÁVÁNÍ ===
async function quickDebug() {
    console.log('🔍 DIAGNOSTIKA VEKTOROVÉHO VYHLEDÁVÁNÍ');
    console.log('='.repeat(50));
    
    // Vytvoříme Supabase klienta
    const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';
    
    // Importujeme z globalních objektů
    const { createClient } = window.supabase || supabase;
    const client = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Počet embeddingů
    console.log('1️⃣ KONTROLA EMBEDDINGŮ:');
    const { count: total } = await client
        .from('product_embeddings')
        .select('*', { count: 'exact', head: true });
    console.log(`   📊 Celkem záznamů: ${total}`);
    
    const { count: completed } = await client
        .from('product_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('embedding_status', 'completed')
        .not('embedding', 'is', null);
    console.log(`   ✅ Dokončených embeddingů: ${completed}`);
    
    // 2. Vzorky
    console.log('\n2️⃣ VZORKY PRODUKTŮ:');
    const { data: samples } = await client
        .from('product_embeddings')
        .select('product_code, product_name, embedding_status')
        .limit(3);
    samples?.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.product_code} - ${item.product_name} [${item.embedding_status}]`);
    });
    
    // 3. Test RPC funkcí
    console.log('\n3️⃣ TEST RPC FUNKCÍ:');
    const functions = ['search_products_by_vector', 'hybrid_product_search'];
    for (const func of functions) {
        try {
            const { error } = await client.rpc(func, {});
            if (error && error.message.includes('does not exist')) {
                console.log(`   ❌ ${func}: NEEXISTUJE`);
            } else {
                console.log(`   ✅ ${func}: EXISTUJE`);
            }
        } catch (e) {
            console.log(`   ✅ ${func}: EXISTUJE (chyba parametrů)`);
        }
    }
    
    // 4. Test s reálným embeddingem
    if (completed > 0) {
        console.log('\n4️⃣ TEST VEKTOROVÉHO VYHLEDÁVÁNÍ:');
        
        const { data: firstEmb } = await client
            .from('product_embeddings')
            .select('embedding, product_name')
            .eq('embedding_status', 'completed')
            .not('embedding', 'is', null)
            .limit(1);
        
        if (firstEmb && firstEmb.length > 0) {
            console.log(`   🧪 Testuji s embeddingem produktu: ${firstEmb[0].product_name}`);
            
            // Test s nízkým prahem
            const { data: results, error } = await client.rpc('search_products_by_vector', {
                query_embedding: firstEmb[0].embedding,
                similarity_threshold: 0.1,
                max_results: 5
            });
            
            console.log(`   📊 Výsledky (práh 0.1): ${results?.length || 0} produktů`);
            if (error) console.log(`   ❌ Chyba:`, error);
            
            results?.forEach((item, i) => {
                console.log(`      ${i+1}. ${item.product_name} (score: ${item.similarity_score?.toFixed(3)})`);
            });
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 DIAGNOSTIKA DOKONČENA');
}

// Spustit diagnostiku
quickDebug().catch(console.error);
```

## Co diagnostika ukáže:

- ✅ **Počet embeddingů** v databázi
- 📋 **Vzorky produktů** a jejich stav
- 🔧 **Dostupnost RPC funkcí** 
- 🧪 **Test vektorového vyhledávání** s reálnými daty

## Očekávané výsledky:

- Měli byste mít **alespoň několik dokončených embeddingů**
- RPC funkce by měly **existovat**
- Vektorové vyhledávání by mělo **vracet podobné produkty**

---

**Pokud diagnostika ukáže problémy, sdělte výsledky a opravíme je! 🔧**
