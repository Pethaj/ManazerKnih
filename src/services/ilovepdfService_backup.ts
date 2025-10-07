interface ILovePDFStartResponse {
    server: string;
    task: string;
    remaining_credits: number;
}

interface ILovePDFUploadResponse {
    server_filename: string;
}

interface ILovePDFProcessFile {
    server_filename: string;
    filename: string;
    rotate?: number;
    password?: string;
}

interface ILovePDFProcessRequest {
    task: string;
    tool: string;
    files: ILovePDFProcessFile[];
    ocr_languages?: string[];
    compression_level?: string;
    ignore_errors?: boolean;
    ignore_password?: boolean;
    output_filename?: string;
    packaged_filename?: string;
}

export class ILovePDFService {
    private static readonly SECRET_KEY = 'secret_key_f7f1f5202b3c109e82533ae8eb60325f_QlYDx414ba9d1382983d200382a941d1a2234';
    private static readonly PUBLIC_KEY = 'project_public_472c5d1e6316410dfffa87227fa3455b_YPle4ab3f9d108e33d00f5e1644cf9b6fbc5a';
    private static readonly BASE_URL = 'https://api.ilovepdf.com/v1';
    private static readonly DEFAULT_REGION = 'eu';
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_DELAY = 2000; // 2 sekund
    
    // Cache pro JWT token
    private static jwtToken: string | null = null;
    private static tokenExpiry: number = 0;

    // Mapování jazyků z aplikace na iLovePDF kódy (podle oficiální dokumentace)
    private static readonly LANGUAGE_MAPPING: Record<string, string> = {
        'Angličtina': 'eng',
        'Čeština': 'ces',
        'Slovenština': 'slk',
        'Slovinština': 'slv',
        'Němčina': 'deu',
        'Francouzština': 'fra',
        'Španělština': 'spa',
        'Italština': 'ita',
        'Ruština': 'rus',
        'Polština': 'pol',
        'Maďarština': 'hun',
        'Nizozemština': 'nld',
        'Portugalština': 'por',
        'Švédština': 'swe',
        'Dánština': 'dan',
        'Norština': 'nor',
        'Finština': 'fin',
        'Estonština': 'est',
        'Litevština': 'lit',
        'Lotyština': 'lav',
        'Chorvatština': 'hrv',
        'Srbština': 'srp',
        'Bulharština': 'bul',
        'Rumunština': 'ron',
        'Řečtina': 'ell',
        'Turečtina': 'tur',
        'Arabština': 'ara',
        'Hebrejština': 'heb',
        'Čínština (zjednodušená)': 'chi_sim',
        'Čínština (tradiční)': 'chi_tra',
        'Japonština': 'jpn',
        'Korejština': 'kor',
        'Hindi': 'hin',
        'Thajština': 'tha',
        'Vietnamština': 'vie',
        'Ukrajinština': 'ukr',
        'Běloruština': 'bel',
        'Katalánština': 'cat',
        'Baskičtina': 'eus',
        'Galicijština': 'glg',
        'Islandština': 'isl',
        'Lotyšština': 'lav',
        'Litevština': 'lit',
        'Makedonština': 'mkd',
        'Maltština': 'mlt'
    };

    /**
     * Mapuje jazyk z aplikace na iLovePDF jazykový kód
     */
    private static mapLanguageToCode(language: string): string {
        return this.LANGUAGE_MAPPING[language] || 'eng';
    }

    /**
     * Získá JWT token z iLovePDF auth serveru
     */
    private static async getAuthToken(): Promise<string> {
        // Zkontrolujeme, zda máme validní cached token
        const now = Date.now();
        if (this.jwtToken && now < this.tokenExpiry) {
            return this.jwtToken;
        }

        try {
            console.log('🔑 Získávám nový JWT token z iLovePDF...');
            
            const response = await fetch(`${this.BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    public_key: this.PUBLIC_KEY
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Auth failed: ${response.status} - ${errorText}`);
            }

            const authData = await response.json();
            this.jwtToken = authData.token;
            
            // Token expiruje za 2 hodiny (podle dokumentace), nastavíme expiry na 1.5h pro bezpečnost
            this.tokenExpiry = now + (1.5 * 60 * 60 * 1000);
            
            console.log('✅ JWT token získán úspěšně');
            return this.jwtToken;
            
        } catch (error: any) {
            console.error('❌ Chyba při získávání JWT tokenu:', error);
            throw new Error(`JWT authentication failed: ${error.message}`);
        }
    }

    /**
     * Vrátí seznam dostupných jazyků pro OCR
     */
    public static getAvailableLanguages(): Array<{ label: string; code: string }> {
        return Object.entries(this.LANGUAGE_MAPPING).map(([label, code]) => ({
            label,
            code
        })).sort((a, b) => a.label.localeCompare(b.label, 'cs'));
    }

    /**
     * Najde nejlepší shodu jazyka podle detekovaného jazyka z metadat
     */
    public static getBestLanguageMatch(detectedLanguage: string): string {
        // Pokud máme přesnou shodu, použijeme ji
        if (this.LANGUAGE_MAPPING[detectedLanguage]) {
            return detectedLanguage;
        }

        // Pokusíme se najít shodu podle částí názvu
        const detectedLower = detectedLanguage.toLowerCase();
        for (const [langName] of Object.entries(this.LANGUAGE_MAPPING)) {
            if (langName.toLowerCase().includes(detectedLower) || 
                detectedLower.includes(langName.toLowerCase())) {
                return langName;
            }
        }

        // Fallback na angličtinu
        return 'Angličtina';
    }

    /**
     * Retry funkce pro HTTP requesty
     */
    private static async retryRequest<T>(
        requestFn: () => Promise<T>,
        operation: string,
        maxRetries: number = this.MAX_RETRIES
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error: any) {
                lastError = error;
                
                // Neretryujeme pro některé typy chyb
                if (error.message.includes('401') || error.message.includes('403')) {
                    throw new Error(`Chyba autorizace pro ${operation}: Neplatný API klíč`);
                }
                
                if (error.message.includes('400') && !error.message.includes('500')) {
                    throw new Error(`Chyba v requestu pro ${operation}: ${error.message}`);
                }
                
                // Pro síťové chyby a timeouty také retryujeme
                const shouldRetry = error.message.includes('500') || 
                                  error.message.includes('502') || 
                                  error.message.includes('503') || 
                                  error.message.includes('504') ||
                                  error.message.includes('network') ||
                                  error.message.includes('timeout') ||
                                  error.message.includes('fetch');
                
                if (!shouldRetry && attempt === 1) {
                    // Pokud to není retriable chyba, netrácíme čas s dalšími pokusy
                    throw error;
                }
                
                console.warn(`⚠️ Pokus ${attempt}/${maxRetries} pro ${operation} selhal:`, error.message);
                
                if (attempt === maxRetries) {
                    break;
                }
                
                // Exponential backoff
                const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
                console.log(`⏳ Čekám ${delay}ms před dalším pokusem...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error(`❌ ${operation} selhal po ${maxRetries} pokusech`);
        throw lastError; // Předáme původní chybu pro lepší error handling
    }

    /**
     * Kontroluje dostupnost iLovePDF API - rychlá kontrola bez autorizace
     */
    private static async checkApiHealth(): Promise<boolean> {
        try {
            // Použijeme jednoduchý HEAD request bez autorizace pro rychlou kontrolu
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
            
            const response = await fetch(`https://api.ilovepdf.com`, {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            // Pokud dostaneme jakoukoliv odpověď (i 404), API je dostupné
            return response.status < 500;
        } catch (error: any) {
            // Timeout nebo síťová chyba - považujeme za nedostupné
            console.warn('⚠️ API health check failed:', error.message);
            return false;
        }
    }

    /**
     * Spustí nový task pro daný nástroj
     */
    private static async startTask(tool: 'pdfocr' | 'compress'): Promise<ILovePDFStartResponse> {
        return await this.retryRequest(async () => {
            const token = await this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/start/${tool}/${this.DEFAULT_REGION}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chyba při spuštění ${tool} tasku: ${response.status} - ${errorText}`);
            }

            return response.json();
        }, `startTask(${tool})`);
    }

    /**
     * Nahraje soubor na iLovePDF server
     */
    private static async uploadFile(server: string, task: string, file: File): Promise<ILovePDFUploadResponse> {
        return await this.retryRequest(async () => {
            const formData = new FormData();
            formData.append('task', task);
            formData.append('file', file);

            const token = await this.getAuthToken();
            const response = await fetch(`https://${server}/v1/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chyba při nahrávání souboru: ${response.status} - ${errorText}`);
            }

            return response.json();
        }, 'uploadFile');
    }

    /**
     * Zpracuje soubory pomocí daného nástroje
     */
    private static async processFiles(
        server: string, 
        task: string, 
        tool: 'pdfocr' | 'compress',
        files: ILovePDFProcessFile[],
        options: {
            ocrLanguages?: string[];
            compressionLevel?: string;
        } = {}
    ): Promise<void> {
        await this.retryRequest(async () => {
            const processRequest: ILovePDFProcessRequest = {
                task,
                tool,
                files,
                ignore_errors: true,
                ignore_password: false
            };

            if (tool === 'pdfocr' && options.ocrLanguages) {
                processRequest.ocr_languages = options.ocrLanguages;
            }

            if (tool === 'compress' && options.compressionLevel) {
                processRequest.compression_level = options.compressionLevel;
            }

            const token = await this.getAuthToken();
            const response = await fetch(`https://${server}/v1/process`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processRequest)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chyba při zpracování souboru (${tool}): ${response.status} - ${errorText}`);
            }

            // Čekáme na dokončení zpracování
            return await response.json();
        }, `processFiles(${tool})`);
    }

    /**
     * Stáhne zpracovaný soubor
     */
    private static async downloadFile(server: string, task: string): Promise<File> {
        return await this.retryRequest(async () => {
            const token = await this.getAuthToken();
            const response = await fetch(`https://${server}/v1/download/${task}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chyba při stahování souboru: ${response.status} - ${errorText}`);
            }

            const blob = await response.blob();
            return new File([blob], 'processed.pdf', { type: 'application/pdf' });
        }, 'downloadFile');
    }

    /**
     * Smaže task z iLovePDF serveru
     */
    private static async deleteTask(server: string, task: string): Promise<void> {
        try {
            const token = await this.getAuthToken();
            await fetch(`https://${server}/v1/task/${task}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log(`✅ Task ${task} byl úspěšně smazán z iLovePDF serveru`);
        } catch (error) {
            console.warn(`⚠️  Nepodařilo se smazat task ${task} z iLovePDF serveru:`, error);
        }
    }

    /**
     * Provede OCR na PDF souboru
     */
    public static async performOCR(file: File, language: string): Promise<File> {
        console.log(`🔍 Spouštím OCR pro soubor ${file.name} v jazyce ${language}`);
        
        let taskInfo: ILovePDFStartResponse | null = null;
        
        try {
            // 1. Spustíme OCR task
            taskInfo = await this.startTask('pdfocr');
            console.log(`📝 OCR task spuštěn: ${taskInfo.task} na serveru ${taskInfo.server}`);

            // 2. Nahrajeme soubor
            const uploadResult = await this.uploadFile(taskInfo.server, taskInfo.task, file);
            console.log(`📤 Soubor nahrán: ${uploadResult.server_filename}`);

            // 3. Zpracujeme s OCR
            const ocrLanguage = this.mapLanguageToCode(language);
            await this.processFiles(taskInfo.server, taskInfo.task, 'pdfocr', [{
                server_filename: uploadResult.server_filename,
                filename: file.name
            }], {
                ocrLanguages: [ocrLanguage]
            });
            console.log(`🔍 OCR zpracování dokončeno pro jazyk ${ocrLanguage}`);

            // 4. Stáhneme zpracovaný soubor
            const processedFile = await this.downloadFile(taskInfo.server, taskInfo.task);
            console.log(`✅ OCR soubor stažen úspěšně`);

            return processedFile;

        } catch (error: any) {
            console.error('❌ Chyba při OCR zpracování:', error);
            
            // Poskytujeme specifické error zprávy podle typu chyby
            if (error.message.includes('500') || error.message.includes('ServerError') || error.message.includes('Internal Server Error')) {
                throw new Error('iLovePDF server má dočasný problém (HTTP 500). Zkuste nahrát soubor bez OCR zpracování nebo to zkuste za chvíli.');
            }
            
            if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Problém se síťovým připojením k iLovePDF. Zkontrolujte internetové připojení nebo nahrajte soubor bez zpracování.');
            }
            
            if (error.message.includes('timeout') || error.message.includes('aborted')) {
                throw new Error('iLovePDF API odpovídá příliš pomalu. Zkuste nahrát soubor bez zpracování nebo to zkuste později.');
            }
            
            // Obecná chyba s původní zprávou
            throw new Error(`OCR zpracování selhalo: ${error.message}. Můžete zkusit nahrát soubor bez zpracování.`);
        } finally {
            // 5. Smažeme task ze serveru
            if (taskInfo) {
                await this.deleteTask(taskInfo.server, taskInfo.task);
            }
        }
    }

    /**
     * Provede kompresi PDF souboru
     */
    public static async compressPDF(file: File, compressionLevel: string = 'recommended'): Promise<File> {
        console.log(`🗜️  Spouštím kompresi pro soubor ${file.name}`);
        
        let taskInfo: ILovePDFStartResponse | null = null;
        
        try {
            // 1. Spustíme compression task
            taskInfo = await this.startTask('compress');
            console.log(`📝 Compression task spuštěn: ${taskInfo.task} na serveru ${taskInfo.server}`);

            // 2. Nahrajeme soubor
            const uploadResult = await this.uploadFile(taskInfo.server, taskInfo.task, file);
            console.log(`📤 Soubor nahrán: ${uploadResult.server_filename}`);

            // 3. Zpracujeme s kompresí (recommended compression)
            await this.processFiles(taskInfo.server, taskInfo.task, 'compress', [{
                server_filename: uploadResult.server_filename,
                filename: file.name
            }], {
                compressionLevel: compressionLevel
            });
            console.log(`🗜️  Komprese dokončena`);

            // 4. Stáhneme zpracovaný soubor
            const compressedFile = await this.downloadFile(taskInfo.server, taskInfo.task);
            console.log(`✅ Komprimovaný soubor stažen úspěšně`);

            return compressedFile;

        } catch (error: any) {
            console.error('❌ Chyba při kompresi:', error);
            
            // Poskytujeme specifické error zprávy podle typu chyby
            if (error.message.includes('500') || error.message.includes('ServerError') || error.message.includes('Internal Server Error')) {
                throw new Error('iLovePDF server má dočasný problém (HTTP 500). Zkuste nahrát soubor bez komprese nebo to zkuste za chvíli.');
            }
            
            if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Problém se síťovým připojením k iLovePDF. Zkontrolujte internetové připojení nebo nahrajte soubor bez zpracování.');
            }
            
            if (error.message.includes('timeout') || error.message.includes('aborted')) {
                throw new Error('iLovePDF API odpovídá příliš pomalu. Zkuste nahrát soubor bez zpracování nebo to zkuste později.');
            }
            
            // Obecná chyba s původní zprávou
            throw new Error(`Komprese selhala: ${error.message}. Můžete zkusit nahrát soubor bez zpracování.`);
        } finally {
            // 5. Smažeme task ze serveru
            if (taskInfo) {
                await this.deleteTask(taskInfo.server, taskInfo.task);
            }
        }
    }

    /**
     * Ověří dostupnost iLovePDF API pro uživatele
     */
    public static async checkApiStatus(): Promise<{ available: boolean; message: string }> {
        try {
            console.log('🔍 Kontroluji stav iLovePDF API...');
            
            // Rychlý test dostupnosti API
            const isHealthy = await this.checkApiHealth();
            
            if (!isHealthy) {
                return {
                    available: false,
                    message: 'iLovePDF API není dostupné. Zkuste to později.'
                };
            }

            // Test autentizace (získání JWT tokenu)
            try {
                await this.getAuthToken();
                console.log('✅ Autentizace úspěšná');
                
                return {
                    available: true,
                    message: 'iLovePDF API je dostupné a autentizace funguje.'
                };
            } catch (authError: any) {
                if (authError.message.includes('500')) {
                    return {
                        available: false,
                        message: 'iLovePDF server má dočasné problémy (HTTP 500). Zkuste to za chvíli.'
                    };
                }
                if (authError.message.includes('Auth failed')) {
                    return {
                        available: false,
                        message: 'Chyba autentizace. Zkontrolujte API klíče.'
                    };
                }
                throw authError;
            }
            
        } catch (error: any) {
            console.error('❌ API status check selhal:', error);
            return {
                available: false,
                message: `API kontrola selhala: ${error.message}`
            };
        }
    }

    /**
     * Provede kombinované zpracování: OCR + komprese
     */
    public static async processWithOCRAndCompression(file: File, language: string, compressionLevel: string = 'recommended'): Promise<File> {
        console.log(`🔄 Spouštím kombinované zpracování: OCR + komprese pro ${file.name}`);
        
        // 1. Nejprve provedeme OCR
        const ocrFile = await this.performOCR(file, language);
        console.log(`✅ OCR dokončeno, pokračuji s kompresí`);
        
        // 2. Pak provedeme kompresi na OCR verzi
        const finalFile = await this.compressPDF(ocrFile, compressionLevel);
        console.log(`✅ Kombinované zpracování dokončeno`);
        
        return finalFile;
    }
}
