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

import { supabase } from '../lib/supabase';

export class CloudConvertService {
    // Supabase Edge Function URL pro proxy
    private static readonly PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://modopafybeslbcqjxsve.supabase.co'}/functions/v1/cloudconvert-proxy`;
    private static readonly SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

    /**
     * Zavolá CloudConvert API přes bezpečnou Supabase Edge Function
     */
    private static async callProxy(endpoint: string, method: string = 'GET', body?: any, isFormData: boolean = false): Promise<any> {
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
                isFormData
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Proxy error: ${response.status} - ${errorData?.error?.message || response.statusText}`);
        }

        return await response.json();
    }

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
        const job = await this.callProxy('/jobs', 'POST', jobData);
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
            const jobData = await this.callProxy(`/jobs/${jobId}`, 'GET');
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
            const userData = await this.callProxy('/users/me', 'GET');
            console.log('✅ CloudConvert API test úspěšný:', userData.data);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
}

export default CloudConvertService;
