// Patch pro opravu kombinovaného zpracování v index.tsx
// Nahradit řádky 3346-3360

                try {
                    if (options.performOCR && options.performCompression) {
                        // Nové kombinované zpracování: NEJDŘÍVE komprese, pak OCR
                        console.log('🔄 Spouštím dvoustupňové zpracování: Komprese → OCR...');
                        
                        const result = await ILovePDFService.processWithCompressionThenOCR(
                            file, 
                            ocrLanguage, 
                            compressionLevel,
                            (step, progress) => {
                                console.log(`📊 ${step} (${progress}%)`);
                            }
                        );
                        
                        // Použijeme finální OCR soubor
                        finalFile = result.ocrFile;
                        hasOCRAfterProcessing = true;
                        console.log(`✅ Dvoustupňové zpracování dokončeno (komprese + OCR)`);
                        
                    } else if (options.performOCR) {
                        // Pouze OCR
                        finalFile = await ILovePDFService.performOCR(file, ocrLanguage);
                        hasOCRAfterProcessing = true;
                        console.log('✅ OCR zpracování dokončeno');
                    } else if (options.performCompression) {
                        // Pouze komprese
                        finalFile = await ILovePDFService.compressPDF(file, compressionLevel);
                        console.log(`✅ Komprese (${compressionLevel}) dokončena`);
                    }
                    
                    // Vytvoříme nový File objekt se správným názvem
                    finalFile = new File([finalFile], file.name, { type: file.type });
                    
                } catch (ilovepdfError: any) {
