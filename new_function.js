const generateMetadataWithAI = async (field: keyof Book, book: Book): Promise<string> => {
    if (!geminiClient) {
        alert("Gemini API není dostupné - chybí API klíč.");
        return "AI není k dispozici.";
    }
    
    console.log('🔍 Načítám obsah dokumentu pro AI analýzu...');
    
    // KLÍČOVÁ ZMĚNA: Načteme skutečný obsah dokumentu
    let documentContent = '';
    try {
        if (book.filePath) {
            documentContent = await api.getFileContent(book.filePath);
            console.log('✅ Obsah dokumentu načten:', documentContent.length, 'znaků');
            
            // Omezíme obsah na prvních 50 stránek (přibližně 25 000 slov/150 000 znaků)
            const maxChars = 150000; // Přibližně 25 000 slov = 50 stránek
            if (documentContent.length > maxChars) {
                documentContent = documentContent.substring(0, maxChars) + '...';
                console.log('📝 Obsah zkrácen na prvních 50 stránek (150 000 znaků)');
            }
        } else {
            console.warn('⚠️ Kniha nemá filePath - použiji pouze název');
            documentContent = `Název souboru: ${book.title}`;
        }
    } catch (error) {
        console.error('❌ Chyba při načítání obsahu dokumentu:', error);
        documentContent = `Název souboru: ${book.title}`;
    }
    
    const bookInfo = `kniha "${book.title}" od ${book.author || 'neznámého autora'}`;
    let prompt = '';
    
    // Přidáme obsah dokumentu do každého promptu
    const contentContext = documentContent.length > 50 
        ? `\n\nObsah dokumentu (prvních 50 stránek):\n${documentContent}\n\n` 
        : '\n\n';
    
    switch (field) {
        case 'title':
            prompt = `Na základě obsahu dokumentu navrhni lepší a přesnější český název místo "${book.title}". Odpověz pouze názvem bez uvozovek.${contentContext}`;
            break;
        case 'author':
            prompt = `Na základě obsahu dokumentu urči, kdo je autor této knihy. Pokud je více autorů, odděl je čárkou. Odpověz pouze jménem/jmény.${contentContext}`;
            break;
        case 'publicationYear':
            prompt = `Na základě obsahu dokumentu urči, v jakém roce byla tato kniha poprvé vydána. Odpověz pouze číslem roku.${contentContext}`;
            break;
        case 'publisher':
            prompt = `Na základě obsahu dokumentu urči, které nakladatelství vydalo tuto knihu. Odpověz pouze názvem nakladatelství.${contentContext}`;
            break;
        case 'summary':
            prompt = `Na základě obsahu dokumentu napiš krátkou, výstižnou sumarizaci v češtině. Sumarizace by měla být konkrétní a informativní - po přečtení musí být jasné, o čem kniha je a co se v ní čtenář dozví. Maximálně 3 věty.${contentContext}`;
            break;
        case 'keywords':
            prompt = `Na základě obsahu dokumentu vygeneruj 5-7 relevantních klíčových slov v češtině. Vrať je jako seznam oddělený čárkami.${contentContext}`;
            break;
        case 'language':
            prompt = `Na základě obsahu dokumentu urči, v jakém jazyce je tato kniha napsána. Odpověz pouze názvem jazyka v češtině.${contentContext}`;
            break;
        default:
            return "Toto pole není podporováno pro AI generování.";
    }
    
    try {
        console.log('🤖 Odesílám prompt s obsahem dokumentu do AI...');
        const result = await geminiClient.generateText(prompt);
        console.log('✅ AI odpověď na základě obsahu dokumentu:', result);
        return result || "Nepodařilo se vygenerovat odpověď.";
    } catch (error) {
        console.error(`Chyba při generování ${field}:`, error);
        return "Nepodařilo se vygenerovat data.";
    }
};
