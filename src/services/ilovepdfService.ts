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
    // Supabase Edge Function URL pro proxy
    private static readonly PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://modopafybeslbcqjxsve.supabase.co'}/functions/v1/ilovepdf-proxy`;
    private static readonly SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';
    private static readonly DEFAULT_REGION = 'eu';
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_DELAY = 2000; // 2 sekund
    private static readonly PROCESSING_TIMEOUT = 3600000; // 60 minut (1 hodina)
    private static readonly POLLING_INTERVAL = 30000; // 30 sekund
    
    // Cache pro JWT token
    private static jwtToken: string | null = null;
    private static tokenExpiry: number = 0;

    /**
     * Zavolá iLovePDF API přes bezpečnou Supabase Edge Function
     */
    private static async callProxy(
        endpoint: string, 
        method: string = 'GET', 
        body?: any, 
        options?: {
            server?: string;
            isFormData?: boolean;
            authToken?: string;
            usePublicKey?: boolean;
        }
    ): Promise<any> {
        const response = await fetch(this.PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
                'apikey': this.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                endpoint,
                method,
                body,
                ...options
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Proxy error: ${response.status} - ${errorData?.error?.message || response.statusText}`);
        }

        return await response.json();
    }

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
        'Portugalština': 'por',
        'Ruština': 'rus',
        'Japonština': 'jpn',
        'Korejština': 'kor',
        'Čínština (zjednodušená)': 'chi_sim',
        'Čínština (tradiční)': 'chi_tra',
        'Arabština': 'ara',
        'Hindština': 'hin',
        'Thajština': 'tha',
        'Vietnamština': 'vie',
        'Indonéština': 'ind',
        'Malajština': 'msa',
        'Tagalog': 'tgl',
        'Holandština': 'nld',
        'Dánština': 'dan',
        'Finština': 'fin',
        'Norština': 'nor',
        'Švédština': 'swe',
        'Islandština': 'isl',
        'Lotyšština': 'lav',
        'Litevština': 'lit',
        'Makedonština': 'mkd',
        'Maltština': 'mlt'
    };

    /**
     * Získá JWT token z iLovePDF auth serveru s refresh mechanismem
     */
    private static async getAuthToken(forceRefresh: boolean = false): Promise<string> {
        // Zkontrolujeme, zda máme validní cached token
        const now = Date.now();
        if (!forceRefresh && this.jwtToken && now < this.tokenExpiry) {
            return this.jwtToken;
        }

        try {
            console.log('🔑 Získávám nový JWT token z iLovePDF...');
            
            const authData = await this.callProxy('/auth', 'POST', {}, { usePublicKey: true });
            this.jwtToken = authData.token;
            
            // Token expiruje za 2 hodiny, nastavíme expiry na 1.5h pro bezpečnost
            this.tokenExpiry = now + (1.5 * 60 * 60 * 1000);
            
            console.log('✅ JWT token získán úspěšně');
            return this.jwtToken;
            
        } catch (error: any) {
            console.error('❌ Chyba při získávání JWT tokenu:', error);
            throw new Error(`JWT authentication failed: ${error.message}`);
        }
    }

    /**
     * Čeká na dokončení zpracování tasku
     */
    private static async waitForProcessingComplete(server: string, task: string): Promise<void> {
        console.log('⏳ Čekám na dokončení zpracování...');
        
        const startTime = Date.now();
        let attempts = 0;
        const maxAttempts = Math.floor(this.PROCESSING_TIMEOUT / this.POLLING_INTERVAL);
        
        while (attempts < maxAttempts) {
            attempts++;
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const elapsedMinutes = Math.floor(elapsedTime / 60);
                const remainingMinutes = Math.floor((this.PROCESSING_TIMEOUT / 1000 - elapsedTime) / 60);
                console.log(`🔍 Pokus ${attempts}/${maxAttempts} (${elapsedMinutes}min) - kontrola stavu zpracování... (zbývá ~${remainingMinutes}min)`);
            
            try {
                // Získáme fresh token pro každou kontrolu
                const token = await this.getAuthToken();
                
                const response = await this.callProxy(`/v1/download/${task}`, 'HEAD', undefined, {
                    server: server,
                    authToken: token
                });
                
                // Proxy vrací status v response
                if (response.status === 200) {
                    console.log(`✅ Zpracování dokončeno po ${elapsedTime} sekundách!`);
                    return;
                } else if (response.status === 400) {
                    console.log(`⏳ Zpracování stále probíhá... (${elapsedTime}s)`);
                } else if (response.status === 401) {
                    console.log('🔄 Token vypršel, obnovuji...');
                    await this.getAuthToken(true); // Force refresh
                } else {
                    console.warn(`⚠️ Neočekávaný status: ${response.status}`);
                }
                
            } catch (error) {
                console.warn(`⚠️ Chyba při kontrole stavu (pokus ${attempts}):`, error);
            }
            
            // Čekáme před dalším pokusem
            await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
        }
        
        throw new Error(`Timeout: Zpracování trvalo déle než ${this.PROCESSING_TIMEOUT / 1000} sekund`);
    }

    /**
     * Retry mechanismus s lepším error handlingem
     */
    private static async retryRequest<T>(
        requestFn: () => Promise<T>, 
        operation: string
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await requestFn();
            } catch (error: any) {
                lastError = error;
                
                console.warn(`⚠️ ${operation} pokus ${attempt}/${this.MAX_RETRIES} selhal:`, error.message);
                
                // Neretryujeme pro některé typy chyb
                if (error.message.includes('401')) {
                    // Pro 401 zkusíme refresh token
                    if (attempt < this.MAX_RETRIES) {
                        console.log('🔄 Obnovuji token kvůli 401 chybě...');
                        await this.getAuthToken(true);
                        continue;
                    }
                    throw new Error(`Chyba autorizace pro ${operation}: Token vypršel nebo je neplatný`);
                }
                
                if (error.message.includes('403')) {
                    throw new Error(`Chyba oprávnění pro ${operation}: Nedostatečná oprávnění`);
                }
                
                if (error.message.includes('400') && !error.message.includes('500')) {
                    throw new Error(`Chyba v requestu pro ${operation}: ${error.message}`);
                }
                
                // Speciální handling pro 500 server chyby
                if (error.message.includes('500') || error.message.includes('ServerError')) {
                    if (attempt === this.MAX_RETRIES) {
                        throw new Error(
                            `iLovePDF API má dočasné problémy (${operation})\n\n` +
                            `🔧 Co můžete zkusit:\n` +
                            `• Zkuste to za 5-10 minut\n` +
                            `• iLovePDF servery jsou přetížené\n` +
                            `• Zkuste později nebo použijte jiný nástroj\n\n` +
                            `Technická chyba: ${error.message}`
                        );
                    }
                    // Pro 500 chyby čekáme déle
                    const serverErrorDelay = this.RETRY_DELAY * attempt * 2;
                    console.log(`⏳ Čekám ${serverErrorDelay}ms před dalším pokusem kvůli server chybě...`);
                    await new Promise(resolve => setTimeout(resolve, serverErrorDelay));
                    continue;
                }
                
                // Pro ostatní chyby čekáme před dalším pokusem
                if (attempt < this.MAX_RETRIES) {
                    const delay = this.RETRY_DELAY * attempt;
                    console.log(`⏳ Čekám ${delay}ms před dalším pokusem...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`${operation} selhal po ${this.MAX_RETRIES} pokusech: ${lastError.message}`);
    }

    /**
     * Vytvoří nový task
     */
    private static async startTask(tool: 'pdfocr' | 'compress'): Promise<ILovePDFStartResponse> {
        return await this.retryRequest(async () => {
            const token = await this.getAuthToken();
            return await this.callProxy(`/start/${tool}/${this.DEFAULT_REGION}`, 'GET', undefined, {
                authToken: token
            });
        }, 'startTask');
    }

    /**
     * Nahraje soubor na iLovePDF server
     */
    private static async uploadFile(server: string, task: string, file: File): Promise<ILovePDFUploadResponse> {
        return await this.retryRequest(async () => {
            const token = await this.getAuthToken();
            
            // Převedeme File na base64 pro přenos přes proxy
            const fileData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            return await this.callProxy('/v1/upload', 'POST', {
                file: {
                    data: fileData,
                    name: file.name,
                    type: file.type
                },
                task: task
            }, {
                server: server,
                authToken: token,
                isFormData: true
            });
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
            const token = await this.getAuthToken();
            
            const requestData: ILovePDFProcessRequest = {
                task,
                tool,
                files,
                ...options
            };

            return await this.callProxy('/v1/process', 'POST', requestData, {
                server: server,
                authToken: token
            });
        }, `processFiles(${tool})`);
    }

    /**
     * Stáhne zpracovaný soubor
     */
    private static async downloadFile(server: string, task: string): Promise<File> {
        return await this.retryRequest(async () => {
            const token = await this.getAuthToken();
            const response = await this.callProxy(`/v1/download/${task}`, 'GET', undefined, {
                server: server,
                authToken: token
            });

            // Proxy vrací file jako base64
            if (response.success && response.file) {
                const binaryString = atob(response.file);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                return new File([blob], 'processed.pdf', { type: 'application/pdf' });
            }

            throw new Error('Download failed: No file data received');
        }, 'downloadFile');
    }

    /**
     * Smaže task z iLovePDF serveru
     */
    private static async deleteTask(server: string, task: string): Promise<void> {
        try {
            const token = await this.getAuthToken();
            await this.callProxy(`/v1/task/${task}`, 'DELETE', undefined, {
                server: server,
                authToken: token
            });
            console.log(`✅ Task ${task} byl úspěšně smazán z iLovePDF serveru`);
        } catch (error) {
            console.warn(`⚠️ Nepodařilo se smazat task ${task}:`, error);
        }
    }

    /**
     * Mapuje jazyk z aplikace na iLovePDF kód
     */
    private static mapLanguageToCode(language: string): string {
        return this.LANGUAGE_MAPPING[language] || 'eng';
    }

    /**
     * Provede OCR zpracování PDF souboru
     */
    public static async performOCR(file: File, language: string): Promise<File> {
        console.log(`🔍 Spouštím OCR zpracování pro ${file.name} v jazyce ${language}`);
        
        let taskInfo: ILovePDFStartResponse | null = null;
        
        try {
            // 1. Vytvoříme OCR task
            taskInfo = await this.startTask('pdfocr');
            console.log(`📝 OCR task vytvořen: ${taskInfo.task}`);

            // 2. Nahrajeme soubor
            const uploadResult = await this.uploadFile(taskInfo.server, taskInfo.task, file);
            console.log(`📤 Soubor nahrán: ${uploadResult.server_filename}`);

            // 3. Spustíme OCR zpracování
            const ocrLanguage = this.mapLanguageToCode(language);
            await this.processFiles(taskInfo.server, taskInfo.task, 'pdfocr', [{
                server_filename: uploadResult.server_filename,
                filename: file.name
            }], {
                ocrLanguages: [ocrLanguage]
            });
            console.log(`🔍 OCR zpracování spuštěno pro jazyk ${ocrLanguage}`);

            // 4. Čekáme na dokončení zpracování
            await this.waitForProcessingComplete(taskInfo.server, taskInfo.task);

            // 5. Stáhneme zpracovaný soubor
            const processedFile = await this.downloadFile(taskInfo.server, taskInfo.task);
            console.log(`✅ OCR soubor stažen úspěšně`);

            return processedFile;

        } catch (error: any) {
            console.error('❌ Chyba při OCR zpracování:', error);
            throw new Error(`OCR selhalo: ${error.message}`);
        } finally {
            // Vždy smažeme task
            if (taskInfo) {
                await this.deleteTask(taskInfo.server, taskInfo.task);
            }
        }
    }

    /**
     * Provede kompresi PDF souboru
     */
    public static async compressPDF(file: File, compressionLevel: string = 'recommended'): Promise<File> {
        console.log(`🗜️ Spouštím kompresi pro ${file.name} s úrovní ${compressionLevel}`);
        
        let taskInfo: ILovePDFStartResponse | null = null;
        
        try {
            // 1. Vytvoříme compression task
            taskInfo = await this.startTask('compress');
            console.log(`📦 Compression task vytvořen: ${taskInfo.task}`);

            // 2. Nahrajeme soubor
            const uploadResult = await this.uploadFile(taskInfo.server, taskInfo.task, file);
            console.log(`📤 Soubor nahrán: ${uploadResult.server_filename}`);

            // 3. Spustíme kompresi
            await this.processFiles(taskInfo.server, taskInfo.task, 'compress', [{
                server_filename: uploadResult.server_filename,
                filename: file.name
            }], {
                compressionLevel: compressionLevel
            });
            console.log(`🗜️ Komprese spuštěna s úrovní ${compressionLevel}`);

            // 4. Čekáme na dokončení zpracování
            await this.waitForProcessingComplete(taskInfo.server, taskInfo.task);

            // 5. Stáhneme zpracovaný soubor
            const compressedFile = await this.downloadFile(taskInfo.server, taskInfo.task);
            console.log(`✅ Komprimovaný soubor stažen úspěšně`);

            return compressedFile;

        } catch (error: any) {
            console.error('❌ Chyba při kompresi:', error);
            throw new Error(`Komprese selhala: ${error.message}`);
        } finally {
            // Vždy smažeme task
            if (taskInfo) {
                await this.deleteTask(taskInfo.server, taskInfo.task);
            }
        }
    }

    /**
     * Provede kombinované zpracování: NEJDŘÍVE komprese, pak OCR
     * Tato metoda nahradí původní soubor komprimovanou verzí a pak přidá OCR
     */
    public static async processWithCompressionThenOCR(
        file: File, 
        language: string, 
        compressionLevel: string = 'recommended',
        onProgress?: (step: string, progress: number) => void
    ): Promise<{ compressedFile: File; ocrFile: File }> {
        console.log(`🔄 Spouštím dvoustupňové zpracování: Komprese → OCR pro ${file.name}`);
        
        try {
            // Krok 1: Komprese
            onProgress?.('Komprese souboru...', 25);
            const compressedFile = await this.compressPDF(file, compressionLevel);
            
            const originalSizeMB = file.size / 1024 / 1024;
            const compressedSizeMB = compressedFile.size / 1024 / 1024;
            const savedPercent = ((originalSizeMB - compressedSizeMB) / originalSizeMB * 100);
            
            console.log(`✅ Komprese dokončena: ${originalSizeMB.toFixed(2)} MB → ${compressedSizeMB.toFixed(2)} MB (ušetřeno ${savedPercent.toFixed(1)}%)`);
            
            // Kontrola velikosti po kompresi - limit 50MB pro Supabase Free Tier
            const MAX_SIZE_MB = 50;
            if (compressedSizeMB > MAX_SIZE_MB) {
                const compressionLevelText = {
                    'low': 'Low (minimální)',
                    'recommended': 'Recommended (optimální)', 
                    'extreme': 'Extreme (maximální)'
                }[compressionLevel] || compressionLevel;
                
                throw new Error(
                    `Soubor je stále příliš velký pro OCR zpracování!\n\n` +
                    `Původní velikost: ${originalSizeMB.toFixed(2)} MB\n` +
                    `Po kompresi (${compressionLevelText}): ${compressedSizeMB.toFixed(2)} MB\n` +
                    `Maximální povolená velikost: ${MAX_SIZE_MB} MB\n\n` +
                    `💡 Doporučení:\n` +
                    `${compressionLevel !== 'extreme' ? '• Zkuste silnější kompresi (Extreme)\n' : ''}` +
                    `• Rozdělte dokument na menší části\n` +
                    `• Použijte externí nástroj pro kompresi\n\n` +
                    `Můžete pokračovat pouze s kompresí bez OCR.`
                );
            }
            
            onProgress?.('Komprese dokončena, spouštím OCR...', 50);
            
            // Krok 2: OCR na komprimovaném souboru
            const ocrFile = await this.performOCR(compressedFile, language);
            console.log(`✅ OCR dokončeno na komprimovaném souboru`);
            
            onProgress?.('Zpracování dokončeno', 100);
            
            return {
                compressedFile,
                ocrFile
            };
            
        } catch (error: any) {
            console.error('❌ Chyba při kombinovaném zpracování:', error);
            throw new Error(`Kombinované zpracování selhalo: ${error.message}`);
        }
    }

    /**
     * Zkontroluje dostupnost iLovePDF API
     */
    public static async checkAPIStatus(): Promise<{ available: boolean; message: string; credits?: number }> {
        try {
            console.log('🔍 Kontroluji stav iLovePDF API...');
            
            // Test autentizace
            const token = await this.getAuthToken();
            
            // Test vytvoření tasku
            const taskInfo = await this.startTask('compress');
            
            // Smažeme test task
            await this.deleteTask(taskInfo.server, taskInfo.task);
            
            return {
                available: true,
                message: 'iLovePDF API je dostupné a funkční',
                credits: taskInfo.remaining_credits
            };
            
        } catch (error: any) {
            console.error('❌ API status check selhal:', error);
            return {
                available: false,
                message: `API kontrola selhala: ${error.message}`
            };
        }
    }

    /**
     * Získá nejlepší shodu jazyka pro OCR
     */
    public static getBestLanguageMatch(detectedLanguage: string): string {
        const normalizedInput = detectedLanguage.toLowerCase();
        
        // Přímá shoda
        for (const [appLang, _] of Object.entries(this.LANGUAGE_MAPPING)) {
            if (appLang.toLowerCase() === normalizedInput) {
                return appLang;
            }
        }
        
        // Částečná shoda
        for (const [appLang, _] of Object.entries(this.LANGUAGE_MAPPING)) {
            if (appLang.toLowerCase().includes(normalizedInput) || 
                normalizedInput.includes(appLang.toLowerCase())) {
                return appLang;
            }
        }
        
        // Výchozí jazyk
        return 'Angličtina';
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
     * Alias pro checkAPIStatus pro zpětnou kompatibilitu
     */
    public static async checkApiStatus(): Promise<{ available: boolean; message: string; credits?: number }> {
        return await this.checkAPIStatus();
    }
}
