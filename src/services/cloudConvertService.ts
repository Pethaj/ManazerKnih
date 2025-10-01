/**
 * CloudConvert API Service pro konverzi EPUB/MOBI a dalších formátů do PDF
 * Mnohem lepší než GroupDocs - má správnou CORS podporu a specializuje se na e-knihy
 */

interface ConversionResult {
    success: boolean;
    data?: Blob;
    error?: string;
}

interface CloudConvertTask {
    id: string;
    status: 'waiting' | 'processing' | 'finished' | 'error';
    result?: {
        files?: Array<{
            filename: string;
            url: string;
            size: number;
        }>;
    };
    message?: string;
}

export class CloudConvertService {
    private static readonly API_BASE_URL = 'https://api.cloudconvert.com/v2';
    private static readonly API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiOTVmZDVmMGZmOTU1NWE4YmRiYjFjN2IxNjI3YWRiZDIzZTIyYmRmZGQ5MWQ1ZDFjMWY2NzBkYzIyZTZlNzUxMmMxMzhlZDZmMzQzZDJkYjgiLCJpYXQiOjE3NTg3OTQ4MDguMTEzMzkyLCJuYmYiOjE3NTg3OTQ4MDguMTEzMzkzLCJleHAiOjQ5MTQ0Njg0MDguMTA5NTU2LCJzdWIiOiI3MzAxMDk0NyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.OY3B-nZJmlyrqdj766A0GRr_qr_FNgIX1RrTEUl12jl4x52fuxMSny13MCLfp_GwAwMPLVO4v-6ZPJ97EC25A5tE4q-DEKVza_bvkzd98EhDNoUdCBhSdmc_KCmmXm2FGWJOBc8NOL8VJvDRcmTZsKyL53Hwxe1VPj_E5_lwpxB31pAQJldaVGpCrP89njTrfvaQv36lxIkPrj8i5pLpqdk7K90NQnmwEaUv9Z-eaoeUjMMz0fu6FTyny4GwcR5GmKH97Qv45IhqyMtVy9PpP4DGcJN5mSszS2EnfNFLBTCz9_iiKl3WmXs_d0qU01njF0VXYZXaF20DAwSHaMvzfW_yoNZo7qYGukz7q3kxiWlExUKxr55c9zrSSwENh8dVxuwjaHf7CXkQaOZ8nwsmYQ2e3ExvW_qmSAMiF9GRTQnG4Fxq-Yc_9g_-y4PTZPlvaGyV4lcrX-BfNg4CKSi1Z9d3Zxf7lnCSFqYrt-8hzC_0e47zD4xYd1iF3jRHe6gQzDW4MG3DeaVH5G2to2R8KG9bHlct_8w59P2TNep0wVhpS7XLCUK4Uf1bo8LWgKUdmEGH61uwwzApYccd77BLsMDKDNjGWOnvrsrgQynpThdeGF3Cw4738bDSbtwyRt-kUmPe3utEFt1pQrD75GTQbukK31qrmaGkDFRFw_RZcSQ';

    /**
     * Hlavní funkce pro konverzi souboru do PDF
     */
    static async convertToPDF(file: File): Promise<ConversionResult> {
        console.log('🚀 CloudConvert: Spouštím konverzi do PDF...');
        console.log(`📄 Zdrojový soubor: ${file.name} (${file.type}, ${file.size} bytes)`);

        // Kontrola podporovaných formátů
        const supportedFormats = ['epub', 'mobi', 'docx', 'doc', 'txt', 'rtf', 'html'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        
        if (!supportedFormats.includes(fileExtension)) {
            return {
                success: false,
                error: `Nepodporovaný formát souboru: ${fileExtension}. Podporované formáty: ${supportedFormats.join(', ')}`
            };
        }

        try {
            // Použijeme synchronní workflow - vytvoříme job s definovanými závislostmi
            console.log('🔧 Vytváření kompletního job workflow...');
            const jobResult = await this.createCompleteJob(file, fileExtension);
            
            console.log('✅ CloudConvert: Konverze do PDF úspěšně dokončena');
            return jobResult;

        } catch (error) {
            console.error('❌ CloudConvert chyba:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Neznámá chyba při konverzi'
            };
        }
    }

    /**
     * Vytvoří kompletní job s propojenými tasky
     */
    private static async createCompleteJob(file: File, fileExtension: string): Promise<ConversionResult> {
        // Vytvoříme job s definovaným workflow
        const jobData = {
            tasks: {
                'import-my-file': {
                    operation: 'import/upload'
                },
                'convert-my-file': {
                    operation: 'convert',
                    input: 'import-my-file',
                    input_format: fileExtension,
                    output_format: 'pdf',
                    engine: 'calibre',
                    engine_version: 'latest'
                },
                'export-my-file': {
                    operation: 'export/url',
                    input: 'convert-my-file'
                }
            }
        };

        console.log('📤 Vytváření job s definovaným workflow...');
        const jobResponse = await fetch(`${this.API_BASE_URL}/jobs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobData)
        });

        if (!jobResponse.ok) {
            const errorText = await jobResponse.text();
            throw new Error(`Job creation failed: ${jobResponse.status} - ${errorText}`);
        }

        const job = await jobResponse.json();
        console.log('✅ Job vytvořen:', job.data.id);

        // Najdeme import task a nahrajeme soubor
        const importTask = job.data.tasks.find((task: any) => task.name === 'import-my-file');
        if (!importTask) {
            throw new Error('Import task not found in job');
        }

        console.log('📤 Nahrávám soubor...');
        await this.uploadFileToTask(importTask, file);

        // Čekáme na dokončení
        console.log('⏳ Čekám na dokončení konverze...');
        return await this.waitForJobCompletion(job.data.id);
    }

    /**
     * Nahraje soubor na import task
     */
    private static async uploadFileToTask(importTask: any, file: File): Promise<void> {
        if (!importTask.result || !importTask.result.form) {
            throw new Error('Import task nemá upload form');
        }

        const formData = new FormData();
        
        // Přidáme všechny form parametry
        Object.entries(importTask.result.form.parameters).forEach(([key, value]) => {
            formData.append(key, value as string);
        });
        
        // Přidáme soubor
        formData.append('file', file);

        const uploadResponse = await fetch(importTask.result.form.url, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`File upload failed: ${uploadResponse.status}`);
        }

        console.log('✅ Soubor úspěšně nahrán na import task');
    }

    /**
     * Čeká na dokončení celého job workflow
     */
    private static async waitForJobCompletion(jobId: string, maxWaitTime: number = 300000): Promise<ConversionResult> {
        const startTime = Date.now();
        const pollInterval = 3000; // 3 sekundy

        while (Date.now() - startTime < maxWaitTime) {
            const response = await fetch(`${this.API_BASE_URL}/jobs/${jobId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error(`Job status check failed: ${response.status}`);
            }

            const jobData = await response.json();
            const job = jobData.data;

            console.log(`⏳ Job status: ${job.status}`);

            if (job.status === 'finished') {
                // Najdeme export task s výsledkem
                const exportTask = job.tasks.find((task: any) => task.name === 'export-my-file');
                
                if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files.length > 0) {
                    const fileUrl = exportTask.result.files[0].url;
                    
                    console.log('📥 Stahuji konvertovaný soubor...');
                    const fileResponse = await fetch(fileUrl);
                    
                    if (fileResponse.ok) {
                        const blob = await fileResponse.blob();
                        return {
                            success: true,
                            data: blob
                        };
                    } else {
                        throw new Error('Failed to download converted file');
                    }
                } else {
                    throw new Error('No output files found in export task');
                }
            } else if (job.status === 'error') {
                // Najdeme první failed task pro detailní chybu
                const failedTask = job.tasks.find((task: any) => task.status === 'error');
                const errorMessage = failedTask ? failedTask.message : 'Job failed';
                throw new Error(errorMessage);
            }

            // Čekání před dalším pollováním
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Job timeout - conversion took too long');
    }


    /**
     * Získá seznam podporovaných formátů pro konverzi do PDF
     */
    static getSupportedFormats(): Array<{ extension: string; description: string; mimeTypes: string[] }> {
        return [
            {
                extension: 'epub',
                description: 'EPUB e-kniha',
                mimeTypes: ['application/epub+zip']
            },
            {
                extension: 'mobi',
                description: 'MOBI e-kniha (Kindle)',
                mimeTypes: ['application/x-mobipocket-ebook']
            },
            {
                extension: 'docx',
                description: 'Microsoft Word dokument',
                mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            },
            {
                extension: 'doc',
                description: 'Microsoft Word dokument (starší)',
                mimeTypes: ['application/msword']
            },
            {
                extension: 'txt',
                description: 'Textový soubor',
                mimeTypes: ['text/plain']
            },
            {
                extension: 'rtf',
                description: 'Rich Text Format',
                mimeTypes: ['application/rtf', 'text/rtf']
            },
            {
                extension: 'html',
                description: 'HTML dokument',
                mimeTypes: ['text/html']
            }
        ];
    }

    /**
     * Kontrola zda je soubor podporován pro konverzi
     */
    static isSupportedForConversion(file: File): boolean {
        const supportedFormats = this.getSupportedFormats();
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        
        return supportedFormats.some(format => 
            format.extension === fileExtension || 
            format.mimeTypes.includes(file.type)
        );
    }

    /**
     * Test API dostupnosti
     */
    static async testAPI(): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('✅ CloudConvert API test úspěšný:', userData.data);
                return { success: true };
            } else {
                const errorText = await response.text();
                return { 
                    success: false, 
                    error: `API test failed: ${response.status} - ${errorText}` 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
}

export default CloudConvertService;
