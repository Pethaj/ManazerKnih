    // NOVÁ INTELIGENTNÍ FUNKCE PRO ČTENÍ PDF S DETEKCÍ OCR
    async getFileContent(filePath: string): Promise<string> {
        if (!filePath) return "Soubor pro tuto knihu nebyl nalezen.";
        
        try {
            const { data, error } = await supabaseClient.storage.from('Books').download(filePath);
            if (error) {
                console.error('Error downloading file content:', error.message, error);
                throw error;
            }
            
            if (!data) {
                return "Nepodařilo se načíst obsah souboru: soubor je prázdný.";
            }

            // Detekce typu souboru
            const fileExtension = filePath.toLowerCase().split('.').pop();
            
            if (fileExtension === 'pdf') {
                console.log('🔍 Detekován PDF soubor - spouštím inteligentní analýzu...');
                return await this.extractPdfTextContent(data);
            } else {
                // Pro ostatní formáty použijeme standardní text()
                return await data.text();
            }
            
        } catch (e: any) {
            console.error("Failed to read file content:", e.message, e);
            return `Nepodařilo se zpracovat obsah souboru: ${e.message}`;
        }
    },

    // NOVÁ FUNKCE PRO INTELIGENTNÍ EXTRAKCI TEXTU Z PDF
    async extractPdfTextContent(fileData: Blob): Promise<string> {
        try {
            const arrayBuffer = await fileData.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            
            console.log(`📄 PDF má ${pdf.numPages} stránek`);
            
            // Omezíme na prvních 50 stránek
            const maxPages = Math.min(pdf.numPages, 50);
            let extractedText = '';
            let hasTextContent = false;
            
            // Pokusíme se extrahovat text z prvních několika stránek
            for (let pageNum = 1; pageNum <= Math.min(5, maxPages); pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                const pageText = textContent.items
                    .filter(item => 'str' in item)
                    .map(item => (item as any).str)
                    .join(' ')
                    .trim();
                
                if (pageText.length > 100) { // Pokud stránka obsahuje alespoň 100 znaků textu
                    hasTextContent = true;
                    break;
                }
            }
            
            if (hasTextContent) {
                console.log('✅ PDF obsahuje OCR text - extrahuji text...');
                
                // Extrahujeme text ze všech stránek (max 50)
                for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    const pageText = textContent.items
                        .filter(item => 'str' in item)
                        .map(item => (item as any).str)
                        .join(' ')
                        .trim();
                    
                    if (pageText) {
                        extractedText += `\n\nStránka ${pageNum}:\n${pageText}`;
                    }
                    
                    // Omezení na 150 000 znaků (50 stránek)
                    if (extractedText.length > 150000) {
                        extractedText = extractedText.substring(0, 150000) + '...';
                        console.log('📝 Text zkrácen na 150 000 znaků (50 stránek)');
                        break;
                    }
                }
                
                if (extractedText.trim().length > 500) {
                    console.log(`✅ Úspěšně extrahován OCR text: ${extractedText.length} znaků`);
                    return extractedText.trim();
                }
            }
            
            // Pokud PDF nemá OCR text, vrátíme informaci o struktuře
            console.log('⚠️ PDF neobsahuje čitelný text (chybí OCR) - vracím strukturální informace');
            
            const metadata = await pdf.getMetadata();
            const info = metadata.info;
            
            let structuralInfo = `PDF dokument bez OCR vrstvy.\n\n`;
            structuralInfo += `Počet stránek: ${pdf.numPages}\n`;
            structuralInfo += `Název: ${info?.Title || 'Neznámý'}\n`;
            structuralInfo += `Autor: ${info?.Author || 'Neznámý'}\n`;
            structuralInfo += `Vytvořeno: ${info?.CreationDate || 'Neznámé'}\n`;
            structuralInfo += `Aplikace: ${info?.Creator || 'Neznámá'}\n\n`;
            structuralInfo += `POZNÁMKA: Tento PDF soubor neobsahuje prohledávatelný text. `;
            structuralInfo += `Pro analýzu obsahu by bylo potřeba použít OCR (optické rozpoznávání znaků).`;
            
            return structuralInfo;
            
        } catch (error) {
            console.error('❌ Chyba při zpracování PDF:', error);
            return `Nepodařilo se zpracovat PDF soubor: ${error}`;
        }
    },
