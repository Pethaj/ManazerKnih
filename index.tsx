import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Removed GoogleGenAI import - using direct fetch API calls instead
// PDF.js je načten globálně z HTML (legacy build) - není třeba importovat
import ChatWidget from './src/components/SanaChat/ChatWidget';
import ChatbotManagement from './src/components/ChatbotManagement';
import FilteredSanaChatWithSettings from './src/components/ChatbotSettings/FilteredSanaChatWithSettings';
import { ILovePDFService } from './src/services/ilovepdfService';
// OpenRouter Intelligent Metadata Service - inteligentní extrakce metadat (auto-detekce OCR)
import * as openRouterMetadataService from './src/services/openRouterMetadataService';
// Auth components
import { AuthGuard } from './src/components/Auth/AuthGuard';
import UserManagement from './src/components/UserManagement/UserManagement';
import { ProfileSettings } from './src/components/ProfileSettings';
import { logout, User } from './src/services/customAuthService';
// Import centrálního Supabase klienta
import { supabase as supabaseClient, supabaseUrl, supabaseKey } from './src/lib/supabase';
// Feed Agent
import FeedAgentPage from './src/pages/FeedAgentPage';
import type { Database } from './src/types/database';

// PDF.js worker je již nastaven v index.html - neměníme ho zde

// Declare PDFLib and pdfjsLib from CDN
declare global {
    interface Window {
        PDFLib?: {
            PDFDocument: any;
        };
        pdfjsLib?: any; // PDF.js library loaded from HTML
    }
}

// Helper funkce pro získání pdfjsLib - počká až bude dostupný
function getPdfjsLib(): any {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        return (window as any).pdfjsLib;
    }
    console.warn('⚠️ pdfjsLib ještě není dostupný na window');
    return null;
}

// --- TYPES AND MOCK DATA ---

const MONTH_NAMES_CS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

interface Book {
    id: string; // uuid from supabase
    title: string;
    author: string;
    publicationYear: number | null;
    publisher: string;
    summary: string;
    keywords: string[];
    language: string;
    format: string;
    fileSize: number; // in KB
    coverImageUrl: string;
    publicationTypes: string[];
    labels: string[];
    categories: string[];
    releaseVersion: string; // verze vydání originálu
    dateAdded: string; // ISO string, maps to created_at
    hasOCR: boolean; // indikuje zda dokument obsahuje OCR text
    content: string;
    filePath: string; // path in supabase storage
    vectorStatus: 'pending' | 'success' | 'error'; // Status nahrání do vektorové databáze (celkový)
    vectorAddedAt?: string; // ISO string, datum úspěšného přidání do vektorové databáze
    metadataSnapshot?: string; // JSON snapshot metadat v době přidání do VDB
    // Nové sloupce pro tracking jednotlivých databází
    qdrantLocalStatus?: 'none' | 'success' | 'error';
    qdrantCloudStatus?: 'none' | 'success' | 'error';
    qdrantCloudCollection?: string; // Název kolekce v Qdrant Cloud (prázdné = není nahráno)
    supabaseVectorStatus?: 'none' | 'success' | 'error';
    vectorUploadDetails?: any;
    lastVectorUploadAt?: string;
}

// --- ICONS ---
const IconMagic = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3L12 2z"></path><path d="M22 12l-3 3-3-3"></path><path d="M12 22l3-3 3 3"></path></svg>;
const IconGrid = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconList = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconUpload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const IconDelete = ({size = 16}: {size?:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const IconTestWebhook = ({size = 16}: {size?:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line><circle cx="18" cy="18" r="3" fill="#3b82f6"></circle><path d="M16.5 18l1 1 2-2" stroke="white" strokeWidth="1.5" fill="none"></path></svg>;
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2 2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const IconMoreVertical = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const IconTag = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const IconWarning = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconExport = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconAdd = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconChatbot = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path><circle cx="9" cy="10" r="1"></circle><circle cx="15" cy="10" r="1"></circle></svg>;
const IconVideo = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const IconUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const IconDatabase = ({status = 'pending', isLoading = false}: {status?: 'pending' | 'success' | 'error', isLoading?: boolean}) => {
    const getColor = () => {
        if (isLoading) return '#3b82f6'; // modrá pro loading
        switch(status) {
            case 'success': return '#22c55e'; // zelená
            case 'error': return '#ef4444'; // červená  
            case 'pending':
            default: return '#6b7280'; // šedá
        }
    };
    
    const spinAnimation = isLoading ? {
        animation: 'spin 2s linear infinite',
        transformOrigin: 'center'
    } : {};
    
    return (
        <>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={getColor()} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={spinAnimation}
            >
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
        </>
    );
};




// --- HELPERS & API ---

const getFlagEmoji = (language: string) => {
    if (!language) return '🏳️';
    const lang = language.toLowerCase();
    
    // Mapa jazyků na vlajky
    const languageFlags: { [key: string]: string } = {
        // Hlavní jazyky
        'čeština': '🇨🇿',
        'slovenština': '🇸🇰', 
        'němčina': '🇩🇪',
        'angličtina': '🇬🇧',
        'francouzština': '🇫🇷',
        'španělština': '🇪🇸',
        'italština': '🇮🇹',
        'portugalština': '🇵🇹',
        'ruština': '🇷🇺',
        'polština': '🇵🇱',
        'holandština': '🇳🇱',
        'švédština': '🇸🇪',
        'norština': '🇳🇴',
        'dánština': '🇩🇰',
        'finština': '🇫🇮',
        
        // Asijské jazyky
        'čínština': '🇨🇳',
        'japonština': '🇯🇵',
        'korejština': '🇰🇷',
        'thajština': '🇹🇭',
        'vietnamština': '🇻🇳',
        'hindština': '🇮🇳',
        'arabština': '🇸🇦',
        'hebrejština': '🇮🇱',
        'turečtina': '🇹🇷',
        'perština': '🇮🇷',
        'indonéština': '🇮🇩',
        'bengálština': '🇧🇩',
        'mongolština': '🇲🇳',
        'nepálština': '🇳🇵',
        
        // Evropské jazyky
        'maďarština': '🇭🇺',
        'rumunština': '🇷🇴',
        'bulharština': '🇧🇬',
        'chorvatština': '🇭🇷',
        'srbština': '🇷🇸',
        'slovinština': '🇸🇮',
        'bosenština': '🇧🇦',
        'makedonština': '🇲🇰',
        'albánština': '🇦🇱',
        'řečtina': '🇬🇷',
        'lotyština': '🇱🇻',
        'litevština': '🇱🇹',
        'estonština': '🇪🇪',
        'islandština': '🇮🇸',
        'irština': '🇮🇪',
        'velština': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
        'maltština': '🇲🇹',
        'lucemburština': '🇱🇺',
        'ukrajinština': '🇺🇦',
        'běloruština': '🇧🇾',
        'moldavština': '🇲🇩',
        
        // Kavkazské a středoasijské
        'gruzínština': '🇬🇪',
        'arménština': '🇦🇲',
        'ázerbájdžánština': '🇦🇿',
        'kazaština': '🇰🇿',
        'kyrgyzština': '🇰🇬',
        'uzbečtina': '🇺🇿',
        'tádžičtina': '🇹🇯',
        'tatarština': '🇷🇺', // Tatarstan nemá vlastní vlajku emoji
        
        // Regionální jazyky
        'katalánština': '🇪🇸', // Katalánsko
        'baskičtina': '🇪🇸', // Baskicko
        'galicijština': '🇪🇸', // Galicie
        'bretonština': '🇫🇷', // Bretaň
        'sardínština': '🇮🇹', // Sardinie
        'latinčina': '🇻🇦', // Vatikán
        'jidiš': '🇮🇱'
    };
    
    // Přímé vyhledání
    if (languageFlags[lang]) {
        return languageFlags[lang];
    }
    
    // Fallback pro podobné názvy
    for (const [key, flag] of Object.entries(languageFlags)) {
        if (lang.includes(key.substring(0, 4)) || key.includes(lang.substring(0, 4))) {
            return flag;
        }
    }
    
    return '🏳️'; // Defaultní vlajka
};

const formatDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('cs-CZ');
};

const formatFileSize = (kb: number) => {
    if (!kb) return '0 KB';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
};

// Environment variables loaded from .env file or localStorage
// Try to load API key from multiple sources
// Gemini API byl odstraněn - už se nepoužívá

const sanitizeFilePath = (filename: string): string => {
    const sanitized = filename
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .replace(/[^\w.-]/g, '_') // Replace non-word characters (except ., -) with _
        .replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
    return sanitized;
};


// --- Supabase Client Setup ---
// POUŽÍVÁME CENTRÁLNÍ INSTANCI ze /src/lib/supabase.ts
// supabaseClient je importován jako alias "supabase as supabaseClient"

const parseSupabaseArray = (value: string[] | string | null): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        // Handle JSON array format e.g., '["tag1", "tag2"]' or '[]'
        if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmedValue);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error('Failed to parse JSON array string:', value, e);
                return [];
            }
        }
        // Handle Supabase's text array format e.g., '{tag1,tag2}'
        if (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) {
            const content = trimmedValue.slice(1, -1);
            if (content === '') return [];
            // This simple split won't handle commas within quoted values, but should work for simple tags.
            return content.split(',').map(item => item.trim().replace(/^"|"$/g, ''));
        }
    }
    // If it's a string but not in a recognized array format, it's ambiguous.
    // Returning an empty array is the safest option to prevent crashes.
    return [];
};

const mapSupabaseToBook = (data: Database['public']['Tables']['books']['Row']): Book => {
    return {
        id: data.id,
        title: data.title,
        author: data.author || 'Neznámý',
        publicationYear: data.publication_year,
        publisher: data.publisher || '',
        summary: data.summary || '',
        keywords: parseSupabaseArray(data.keywords),
        language: data.language || 'čeština',
        format: data.format,
        fileSize: data.file_size,
        coverImageUrl: data.cover_image_url,
        publicationTypes: parseSupabaseArray(data.publication_types),
        labels: parseSupabaseArray(data.labels),
        categories: parseSupabaseArray(data.categories),
        releaseVersion: (data as any).releaseVersion || '', // verze vydání originálu
        dateAdded: data.created_at,
        filePath: data.file_path,
        content: '', // Content will be loaded on demand
        vectorStatus: (data.Vdtb as 'pending' | 'success' | 'error') || 'pending',
        hasOCR: data.OCR || false,
        vectorAddedAt: (data as any).vector_added_at || undefined,
        metadataSnapshot: (data as any).metadata_snapshot || undefined,
        // Nové sloupce pro tracking jednotlivých databází
        qdrantLocalStatus: ((data as any).qdrant_local_status as 'none' | 'success' | 'error') || 'none',
        qdrantCloudStatus: ((data as any).qdrant_cloud_status as 'none' | 'success' | 'error') || 'none',
        qdrantCloudCollection: ((data as any).qdrant_cloud_collection as string) || undefined,
        supabaseVectorStatus: ((data as any).supabase_vector_status as 'none' | 'success' | 'error') || 'none',
        vectorUploadDetails: (data as any).vector_upload_details || undefined,
        lastVectorUploadAt: (data as any).last_vector_upload_at || undefined,
    };
};

const api = {
    async getBooks(): Promise<Book[]> {
        const callId = Math.random().toString(36).substring(7);
        
        try {
            const startTime = Date.now();
            
            // Zkusíme nejdřív přímý REST API call
            const response = await fetch(`${supabaseUrl}/rest/v1/books?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const endTime = Date.now();
            console.log(`[${callId}] ✅ REST API odpověď za ${endTime - startTime}ms, status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`[${callId}] ✅ Načteno ${data.length} knih z databáze`);
            
            if (data.length > 0) {
                console.log(`[${callId}] První kniha:`, { id: data[0].id, title: data[0].title });
            }
            
            const mappedBooks = data.map(mapSupabaseToBook);
            
            return mappedBooks;
        } catch (err: any) {
            console.error(`[${callId}] ❌ Chyba při načítání knih:`, {
                name: err.name,
                message: err.message,
                stack: err.stack?.substring(0, 200)
            });
            throw err;
        }
    },

    // Funkce pro volání N8N webhooků při mazání knih
    async callDeleteWebhook(bookId: string): Promise<{success: boolean, message: string}> {
        const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/e871e7d6-ca10-4b9d-adc4-3b58ee2f8279';
        
        try {
            console.log(`🔗 Volám N8N webhook pro smazání knihy: ${bookId}`);
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_id: bookId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.text();
            console.log('✅ N8N webhook úspěšně zavolán:', responseData);
            
            return {
                success: true,
                message: 'N8N webhook úspěšně zavolán'
            };
            
        } catch (error) {
            console.error('❌ Chyba při volání N8N webhooků:', error);
            return {
                success: false,
                message: `Chyba při volání N8N webhooků: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
            };
        }
    },

    // Funkce pro hromadné volání N8N webhooků při mazání více knih
    async callBulkDeleteWebhooks(bookIds: string[]): Promise<{success: boolean, message: string, successCount: number, failureCount: number}> {
        const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/ae6f98d7-53a8-40b2-9d24-ca2ddf7c82de';
        
        console.log(`🔗 Volám N8N webhooky pro hromadné smazání ${bookIds.length} knih`);
        
        const webhookPromises = bookIds.map(async (bookId) => {
            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: bookId,
                        action: 'delete',
                        timestamp: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                console.log(`✅ N8N webhook úspěšně zavolán pro knihu: ${bookId}`);
                return { bookId, success: true, error: null };
                
            } catch (error) {
                console.error(`❌ Chyba při volání N8N webhooků pro knihu ${bookId}:`, error);
                return { 
                    bookId, 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Neznámá chyba' 
                };
            }
        });

        try {
            const results = await Promise.allSettled(webhookPromises);
            
            let successCount = 0;
            let failureCount = 0;
            
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                } else {
                    failureCount++;
                }
            });

            const message = `Hromadné volání webhooků dokončeno: ${successCount} úspěšných, ${failureCount} neúspěšných`;
            console.log(`🔗 ${message}`);
            
            return {
                success: failureCount === 0,
                message,
                successCount,
                failureCount
            };
            
        } catch (error) {
            console.error('❌ Neočekávaná chyba při hromadném volání webhooků:', error);
            return {
                success: false,
                message: `Neočekávaná chyba při hromadném volání webhooků: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
                successCount: 0,
                failureCount: bookIds.length
            };
        }
    },
    async updateBook(book: Book): Promise<Book> {
        const updateData: Database['public']['Tables']['books']['Update'] = {
            title: book.title, author: book.author, publication_year: book.publicationYear,
            publisher: book.publisher, summary: book.summary, keywords: book.keywords, language: book.language,
            format: book.format, file_size: book.fileSize, cover_image_url: book.coverImageUrl,
            publication_types: book.publicationTypes, labels: book.labels, categories: book.categories, file_path: book.filePath,
            OCR: book.hasOCR,
            Vdtb: book.vectorStatus,
            ...(book.releaseVersion && { releaseVersion: book.releaseVersion }),
            ...(book.vectorAddedAt !== undefined && { vector_added_at: book.vectorAddedAt }),
            ...(book.metadataSnapshot !== undefined && { metadata_snapshot: book.metadataSnapshot }),
        };
        const { data, error } = await supabaseClient.from('books').update(updateData).eq('id', book.id).select().single();
        if (error) { console.error('Error updating book:', error.message, error); throw error; }
        if (!data) { throw new Error("Book not found after update."); }
        return mapSupabaseToBook(data);
    },
    async deleteBook(bookId: string, filePath: string, coverImageUrl: string, bookTitle?: string): Promise<void> {
        const errors: string[] = [];
        
        // Step 1: Delete cover image from Books/covers/covers/ (podle požadavků)
        if (filePath) {
            try {
                console.log(`🖼️ Mazání cover obrázku pro knihu: ${bookId}`);
                console.log(`File path: ${filePath}`);
                
                // Cover má stejný název jako soubor knihy, ale s .jpg příponou
                // Např. book_1759489721872_axaum1w9k.pdf -> book_1759489721872_axaum1w9k.jpg
                const fileNameWithoutExt = filePath.replace(/\.[^/.]+$/, ""); // odstraní příponu
                const coverPath = `covers/covers/${fileNameWithoutExt}.jpg`;
                
                console.log(`Attempting to delete cover: ${coverPath} from Books bucket`);
                
                const { error: coverError } = await supabaseClient.storage.from('Books').remove([coverPath]);
                    
                    if (coverError) {
                        console.error('COVER DELETE FAILED:', coverError);
                        errors.push(`Nepodařilo se smazat cover obrázek: ${coverError.message}`);
                    } else {
                    console.log(`✅ Cover deleted successfully from Books bucket: ${coverPath}`);
                }
            } catch (e) {
                console.error("Could not delete cover image:", e);
                errors.push(`Chyba při mazání cover obrázku: ${e}`);
            }
        }

        // Step 2: Delete book file from Storage
        if (filePath) {
            try {
                const { error: storageError } = await supabaseClient.storage.from('Books').remove([filePath]);
                if (storageError) {
                    console.error('STORAGE DELETE FAILED:', storageError);
                    errors.push(`Nepodařilo se smazat soubor z úložiště: ${storageError.message}`);
                }
            } catch (e) {
                console.error('STORAGE DELETE ERROR:', e);
                errors.push(`Chyba při mazání souboru: ${e}`);
            }
        }
        
        // Step 3: Delete from Supabase vector database public.documents
        try {
            console.log('🗑️ Mazání z Supabase vektorové databáze public.documents pro knihu:', bookId);
            
            // Použijeme raw SQL dotaz pro mazání z documents tabulky
            const { error: documentsError } = await (supabaseClient as any).rpc('delete_documents_by_file_id', {
                file_id: bookId
            });
            
            if (documentsError) {
                console.error('SUPABASE DOCUMENTS DELETE FAILED:', documentsError);
                errors.push(`Nepodařilo se smazat z public.documents: ${documentsError.message}`);
            } else {
                console.log('✅ Úspěšně smazáno z Supabase public.documents');
            }
        } catch (e) {
            console.error('SUPABASE DOCUMENTS DELETE ERROR:', e);
            errors.push(`Chyba při mazání z Supabase documents: ${e}`);
        }
        
        // Step 4: Delete images from images/main/production/[bookId]/ folder
        try {
            console.log(`🖼️ Mazání obrázků pro knihu: ${bookId}`);
            
            // Složka má název podle UUID knihy
            const imageFolderPath = `main/production/${bookId}`;
            console.log(`🗂️ Attempting to delete image folder: ${imageFolderPath} from images bucket`);
            
            try {
                // Nejdříve získáme seznam všech souborů ve složce
                const { data: imageFiles, error: listError } = await supabaseClient.storage
                    .from('images')
                    .list(imageFolderPath, { limit: 1000 });
                
                console.log(`📋 List result - Error: ${listError?.message || 'none'}, Files found: ${imageFiles?.length || 0}`);
                
                if (!listError && imageFiles && imageFiles.length > 0) {
                    // Smažeme všechny soubory ve složce
                    const filesToDelete = imageFiles.map(file => `${imageFolderPath}/${file.name}`);
                    
                    console.log(`🗑️ Found ${filesToDelete.length} files to delete:`, filesToDelete);
                    
                    const { error: deleteError } = await supabaseClient.storage
                        .from('images')
                        .remove(filesToDelete);
                    
                    if (!deleteError) {
                        console.log(`✅ Successfully deleted ${filesToDelete.length} images from ${imageFolderPath}`);
                    } else {
                        console.error('❌ IMAGE FILES DELETE FAILED:', deleteError);
                        errors.push(`Nepodařilo se smazat obrázky: ${deleteError.message}`);
                    }
                } else if (listError) {
                    console.log(`📁 Folder not found or error: ${imageFolderPath} - ${listError.message}`);
                    // Nebudeme to považovat za chybu, složka prostě neexistuje
                } else {
                    console.log(`📁 No images found in folder: ${imageFolderPath}`);
                }
            } catch (folderError) {
                console.error(`📁 Error accessing folder ${imageFolderPath}:`, folderError);
                errors.push(`Chyba při přístupu ke složce obrázků: ${folderError}`);
            }
        } catch (e) {
            console.error("Could not delete image folder:", e);
            errors.push(`Chyba při mazání složky obrázků: ${e}`);
        }
        
        // Step 5: Delete record from Database (ALWAYS attempt this, even if file deletion failed)
        let databaseDeleteSuccessful = false;
        try {
            const { error: dbError } = await supabaseClient.from('books').delete().eq('id', bookId);
            if (dbError) {
                console.error('DATABASE DELETE FAILED:', dbError);
                errors.push(`Nepodařilo se smazat záznam z databáze: ${dbError.message}`);
            } else {
                console.log('Book record deleted successfully from database');
                databaseDeleteSuccessful = true;
            }
        } catch (e) {
            console.error('DATABASE DELETE ERROR:', e);
            errors.push(`Chyba při mazání záznamu z databáze: ${e}`);
        }
        
        // Step 6: Call N8N webhook if database deletion was successful
        if (databaseDeleteSuccessful) {
            try {
                const webhookResult = await api.callDeleteWebhook(bookId);
                if (!webhookResult.success) {
                    console.warn('N8N webhook se nepodařilo zavolat:', webhookResult.message);
                    errors.push(`Varování - N8N webhook: ${webhookResult.message}`);
                } else {
                    console.log('✅ N8N webhook úspěšně zavolán');
                }
            } catch (e) {
                console.error('N8N WEBHOOK ERROR:', e);
                errors.push(`Chyba při volání N8N webhooků: ${e}`);
            }
        }
        
        // If there were any errors, log them but don't throw - the UI should still update
        if (errors.length > 0) {
            console.warn('Delete operation completed with warnings:', errors);
            // Optionally show a warning to user, but don't prevent UI update
        }
    },
    async uploadFile(file: File, bucket: string = 'Books'): Promise<{ filePath: string, fileSize: number }> {
        const sanitizedFileName = sanitizeFilePath(file.name);
        const filePath = `${Date.now()}-${sanitizedFileName}`;
        const { error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
            upsert: true
        });
        if (error) { 
            console.error(`Error uploading file to bucket ${bucket}:`, error.message, error); 
            if (error.message.includes('Unauthorized') || error.message.includes('row-level security')) {
                throw new Error(`Problém s oprávněními pro nahrávání do ${bucket}. Kontaktujte administrátora.`);
            }
            throw error; 
        }
        // Zajistíme, že fileSize je minimálně 1 KB i pro malé soubory
        const fileSizeKB = Math.max(1, Math.round(file.size / 1024));
        return { filePath, fileSize: fileSizeKB };
    },
    async uploadFileWithId(file: File, bucket: string, bookId: string): Promise<{ filePath: string, fileSize: number }> {
        const fileExtension = file.name.split('.').pop() || '';
        let filePath: string;
        
        if (bucket === 'covers') {
            // Cover files always as JPG in covers bucket
            filePath = `${bookId}.jpg`;
        } else if (bucket === 'Books' && file.type.startsWith('image/')) {
            // Cover files in Books bucket subfolder
            filePath = `covers/${bookId}.jpg`;
        } else if (bookId.startsWith('covers/')) {
            // Fallback: covers in Books bucket subfolder
            const actualBookId = bookId.replace('covers/', '');
            filePath = `covers/${actualBookId}.jpg`;
        } else {
            // Regular book files
            filePath = `${bookId}.${fileExtension}`;
        }
        
        console.log(`Uploading to bucket '${bucket}' with path: ${filePath}`);
        
        const { error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
            upsert: true
        });
        
        if (error) { 
            console.error(`Error uploading file to bucket ${bucket}:`, error.message, error); 
            if (error.message.includes('Unauthorized') || error.message.includes('row-level security')) {
                throw new Error(`Problém s oprávněními pro nahrávání do ${bucket}. Kontaktujte administrátora.`);
            }
            throw error; 
        }
        
        console.log(`Successfully uploaded to ${bucket}/${filePath}`);
        // Zajistíme, že fileSize je minimálně 1 KB i pro malé soubory
        const fileSizeKB = Math.max(1, Math.round(file.size / 1024));
        return { filePath, fileSize: fileSizeKB };
    },
    async createBook(bookData: Omit<Book, 'id' | 'dateAdded' | 'content'>): Promise<Book> {
        console.log('💾 API createBook - vstupní OCR stav:', bookData.hasOCR);
        const supabaseData: Database['public']['Tables']['books']['Insert'] = {
            title: bookData.title, author: bookData.author, publication_year: bookData.publicationYear,
            publisher: bookData.publisher, summary: bookData.summary, keywords: bookData.keywords,
            language: bookData.language, format: bookData.format, file_size: bookData.fileSize,
            cover_image_url: bookData.coverImageUrl, publication_types: bookData.publicationTypes,
            labels: bookData.labels, categories: bookData.categories, file_path: bookData.filePath,
            OCR: bookData.hasOCR,
            Vdtb: bookData.vectorStatus || 'pending',
            ...(bookData.releaseVersion && { releaseVersion: bookData.releaseVersion }),
            ...(bookData.vectorAddedAt && { vector_added_at: bookData.vectorAddedAt }),
            ...(bookData.metadataSnapshot && { metadata_snapshot: bookData.metadataSnapshot }),
        };
        console.log('💾 Ukládám do Supabase s OCR:', supabaseData.OCR);
        const { data, error } = await supabaseClient.from('books').insert(supabaseData).select().single();
        if (error) { 
            console.error('Error creating book:', error.message, error); 
            if (error.message.includes('row-level security') || error.message.includes('violates')) {
                throw new Error("Problém s databázovými oprávněními. Aplikace potřebuje správné nastavení RLS politik v Supabase.");
            }
            throw error; 
        }
        if (!data) { throw new Error("Failed to create book."); }
        return mapSupabaseToBook(data);
    },
    async getFileContent(filePath: string): Promise<string> {
        if (!filePath) return "Soubor pro tuto knihu nebyl nalezen.";
        
        try {
            const { data, error } = await supabaseClient.storage.from("Books").download(filePath);
            if (error) {
                console.error("Error downloading file content:", error.message, error);
                throw error;
            }
            
            if (!data) {
                return "Nepodařilo se načíst obsah souboru: soubor je prázdný.";
            }

            // Detekce typu souboru
            const fileExtension = filePath.toLowerCase().split(".").pop();
            
            if (fileExtension === "pdf") {
                console.log("🔍 Detekován PDF soubor - spouštím inteligentní analýzu...");
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

    // FUNKCE PRO DETEKCI OCR Z NAHRANÉHO SOUBORU
    async detectOCRFromStorage(filePath: string): Promise<boolean> {
        if (!filePath) return false;
        
        try {
            console.log('🔍 Detekuji OCR ze storage pro soubor:', filePath);
            
            // Stáhneme soubor ze storage
            const { data, error } = await supabaseClient.storage.from("Books").download(filePath);
            if (error) {
                console.error("❌ Chyba při stahování souboru pro OCR detekci:", error);
                return false;
            }
            
            if (!data) {
                console.error("❌ Soubor je prázdný");
                return false;
            }

            // Detekce typu souboru
            const fileExtension = filePath.toLowerCase().split(".").pop();
            
            if (fileExtension === "pdf") {
                console.log("📄 Analyzuji PDF soubor pro OCR...");
                return await this.detectOCRFromPDF(data);
            } else if (fileExtension === "epub") {
                console.log("📚 EPUB soubory obvykle obsahují text");
                return true; // EPUB obvykle obsahuje text
            } else if (['txt', 'doc', 'docx', 'rtf'].includes(fileExtension || '')) {
                console.log("📝 Textové soubory obsahují text");
                return true; // Textové soubory obsahují text
            } else {
                console.log("❓ Neznámý formát, předpokládám že neobsahuje OCR");
                return false;
            }
            
        } catch (e: any) {
            console.error("❌ Chyba při detekci OCR:", e.message);
            return false;
        }
    },

    async detectOCRFromPDF(fileData: Blob): Promise<boolean> {
        try {
            const fileBuffer = await fileData.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(fileBuffer);
            const pdf = await loadingTask.promise;
            
            console.log(`📄 PDF má ${pdf.numPages} stránek, kontroluji OCR...`);
            
            // Zkontrolujeme první 3 stránky
            const numPagesToCheck = Math.min(pdf.numPages, 3);
            let totalTextLength = 0;
            let allExtractedText = '';
            
            for (let pageNum = 1; pageNum <= numPagesToCheck; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    console.log(`📄 Stránka ${pageNum}: Nalezeno ${textContent.items.length} textových objektů`);
                    
                    // Detailní analýza každé textové položky
                    let pageText = '';
                    textContent.items.forEach((item: any, index: number) => {
                        let itemText = '';
                        
                        // Zkusíme všechny možné způsoby získání textu
                        if (item.str !== undefined) {
                            itemText = String(item.str);
                        } else if (item.text !== undefined) {
                            itemText = String(item.text);
                        } else if (item.chars !== undefined) {
                            itemText = String(item.chars);
                        } else if (typeof item === 'string') {
                            itemText = item;
                        }
                        
                        if (itemText && itemText.trim().length > 0) {
                            pageText += itemText + ' ';
                            console.log(`   Položka ${index + 1}: "${itemText.substring(0, 50)}${itemText.length > 50 ? '...' : ''}"`);
                        }
                    });
                    
                    pageText = pageText.trim();
                    allExtractedText += pageText + ' ';
                    totalTextLength += pageText.length;
                    
                    console.log(`📝 Stránka ${pageNum} celkem: ${pageText.length} znaků`);
                    if (pageText.length > 0) {
                        console.log(`📝 Text stránky ${pageNum}: "${pageText.substring(0, 200)}${pageText.length > 200 ? '...' : ''}"`);
                    }
                    
                } catch (pageError) {
                    console.warn(`⚠️ Chyba při zpracování stránky ${pageNum}:`, pageError);
                }
            }
            
            // Ještě zkusíme alternativní metodu - getOperatorList
            if (totalTextLength === 0) {
                console.log('🔄 Žádný text nenalezen standardní metodou, zkouším alternativní přístup...');
                try {
                    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 2); pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const ops = await page.getOperatorList();
                        
                        console.log(`📄 Stránka ${pageNum}: Nalezeno ${ops.fnArray.length} operací`);
                        
                        // Hledáme textové operace
                        for (let i = 0; i < ops.fnArray.length; i++) {
                            const fn = ops.fnArray[i];
                            const args = ops.argsArray[i];
                            
                            // Textové operace v PDF
                            if (fn === 84 || fn === 85 || fn === 82) { // TJ, Tj, ' operátory
                                if (args && args.length > 0 && typeof args[0] === 'string') {
                                    console.log(`🔤 Nalezen text operátorem: "${args[0].substring(0, 50)}"`);
                                    allExtractedText += args[0] + ' ';
                                    totalTextLength += args[0].length;
                                }
                            }
                        }
                    }
                } catch (altError) {
                    console.warn('⚠️ Alternativní metoda selhala:', altError);
                }
            }
            
            const cleanText = allExtractedText.trim();
            const hasOCR = cleanText.length > 10; // Alespoň 10 znaků
            
            console.log(`✅ OCR detekce dokončena: ${hasOCR ? 'NALEZEN' : 'NENALEZEN'}`);
            console.log(`📊 Celkem extrahováno: ${totalTextLength} znaků`);
            if (cleanText.length > 0) {
                console.log(`📝 Ukázka extrahovaného textu: "${cleanText.substring(0, 300)}${cleanText.length > 300 ? '...' : ''}"`);
            }
            
            return hasOCR;
            
        } catch (error) {
            console.error("❌ Chyba při analýze PDF pro OCR:", error);
            return false;
        }
    },
    
    // PŘEPSANÁ ROBUSTNĚJŠÍ FUNKCE PRO EXTRAKCI TEXTU Z PDF
    async extractPdfTextContent(fileData: Blob): Promise<string> {
        console.log("🚀 SPOUŠTÍM NOVÝ OCR PROCES...");
        
        try {
            // Převedeme Blob na ArrayBuffer
            const arrayBuffer = await fileData.arrayBuffer();
            console.log("📦 PDF načten, velikost:", Math.round(arrayBuffer.byteLength / 1024), "KB");
            
            // Načteme PDF pomocí PDF.js
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            
            console.log(`📄 PDF úspěšně načten - ${pdf.numPages} stránek`);
            
            // Nastavení limitů
            const MAX_PAGES = 50;
            const MAX_CHARS = 150000;
            const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES);
            
            let allText = "";
            let totalChars = 0;
            
            console.log(`🔄 Začínám extrakci textu z ${pagesToProcess} stránek...`);
            
            // Projdeme všechny stránky a extrahujeme text
            for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    // Extrahujeme všechny textové položky
                    const pageTextItems = textContent.items
                        .filter(item => 'str' in item && item.str.trim().length > 0)
                        .map(item => (item as any).str);
                    
                    const pageText = pageTextItems.join(' ').trim();
                    
                    if (pageText.length > 0) {
                        allText += `\n\n=== STRÁNKA ${pageNum} ===\n${pageText}`;
                        totalChars += pageText.length;
                        
                        console.log(`📃 Stránka ${pageNum}: ${pageText.length} znaků (celkem: ${totalChars})`);
                        
                        // Omezení na maximální počet znaků
                        if (totalChars > MAX_CHARS) {
                            allText = allText.substring(0, MAX_CHARS) + "\n\n... [TEXT ZKRÁCEN] ...";
                            console.log(`✂️ Text zkrácen na ${MAX_CHARS} znaků na stránce ${pageNum}`);
                            break;
                        }
                    } else {
                        console.log(`📃 Stránka ${pageNum}: prázdná nebo bez textu`);
                    }
                    
                } catch (pageError) {
                    console.error(`❌ Chyba při zpracování stránky ${pageNum}:`, pageError);
                    continue; // Pokračujeme s další stránkou
                }
            }
            
            // Vyhodnotíme výsledek
            const finalText = allText.trim();
            
            if (finalText.length > 50) { // Velmi nízký práh - pokud máme alespoň 50 znaků
                console.log(`✅ ÚSPĚCH! Extrahováno ${finalText.length} znaků z ${pagesToProcess} stránek`);
                console.log(`📊 První 200 znaků: "${finalText.substring(0, 200)}..."`);
                return finalText;
            } else {
                console.log(`❌ NEÚSPĚCH! Extrahováno pouze ${finalText.length} znaků`);
                return this.createNoTextResponse(pdf, finalText.length);
            }
            
        } catch (error) {
            console.error("💥 KRITICKÁ CHYBA při OCR:", error);
            return `CHYBA při zpracování PDF: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    
    // Pomocná funkce pro vytvoření odpovědi když není text
    createNoTextResponse(pdf: any, foundChars: number): string {
        console.log("📋 Vytvářím strukturální odpověď - PDF neobsahuje dostatek textu");
        
        return `❌ PDF NEOBSAHUJE DOSTATEČNÝ TEXT PRO AI ANALÝZU

📊 Informace o dokumentu:
• Počet stránek: ${pdf.numPages}
• Nalezeno znaků: ${foundChars}
• Požadováno: minimálně 50 znaků

🔧 Možná řešení:
1. PDF je naskenovaný obrázek bez OCR vrstvy
2. Použijte OCR nástroj pro převod obrázků na text
3. Nahrajte PDF s textovou vrstvou
4. Zkontrolujte kvalitu skenování

⚠️ Bez čitelného textu nelze provést AI analýzu obsahu.`;
    },
    
    // Funkce pro odesílání dat do n8n webhook pro vektorovou databázi
    async sendToVectorDatabase(book: Book, waitForResponse: boolean = false, skipPageCheck: boolean = false): Promise<{success: boolean, message: string, details?: any}> {
        const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58';
        
        try {
            // Nejdříve aktualizujeme status na pending
            await api.updateBook({...book, vectorStatus: 'pending'});
            
            console.log('📤 Stahuji soubor z Supabase storage...');
            
            // Stáhneme soubor z Supabase storage
            const { data: fileData, error: downloadError } = await supabaseClient.storage
                .from('Books')
                .download(book.filePath);
                
            if (downloadError || !fileData) {
                throw new Error(`Nepodařilo se stáhnout soubor: ${downloadError?.message}`);
            }
            
            console.log('✅ Soubor stážen, velikost:', fileData.size, 'bytes');
            
            // ⚠️ KONTROLA POČTU STRÁNEK PDF - VAROVÁNÍ PRO VELKÉ SOUBORY
            if (book.format.toLowerCase() === 'pdf' && !skipPageCheck) {
                console.log('📄 Kontroluji počet stránek PDF před odesláním do VDB...');
                
                try {
                    const pdfLib = getPdfjsLib();
                    if (!pdfLib) {
                        console.warn('⚠️ PDF.js není dostupný, přeskakuji kontrolu počtu stránek');
                    } else {
                        const fileBuffer = await fileData.arrayBuffer();
                        const loadingTask = pdfLib.getDocument(fileBuffer);
                        const pdf = await loadingTask.promise;
                        const pageCount = pdf.numPages;
                    
                        console.log(`📊 PDF má ${pageCount} stránek`);
                        
                        // Varování pro velké PDF soubory (více než 1000 stránek)
                        if (pageCount > 1000) {
                            console.warn(`⚠️ PDF má ${pageCount} stránek, což je více než doporučený limit 1000 stránek!`);
                            
                            // Resetujeme status zpět na none před zobrazením modalu
                            await api.updateBook({...book, vectorStatus: 'none'});
                            
                            // Vyhazujeme speciální error s informací o počtu stránek
                            // Ten bude zachycen v App komponentě a otevře modal
                            const error: any = new Error('LARGE_PDF_WARNING');
                            error.pageCount = pageCount;
                            error.book = book;
                            throw error;
                        }
                    }
                } catch (pdfError: any) {
                    // Pokud je to náš speciální error pro velké PDF, přehodíme ho dál
                    if (pdfError.message === 'LARGE_PDF_WARNING') {
                        throw pdfError;
                    }
                    
                    console.warn('⚠️ Nepodařilo se zkontrolovat počet stránek PDF:', pdfError);
                    // Pokračujeme i při jiných chybách kontroly stránek
                }
            }
            
            // Vytvoříme FormData s binárním souborem a strukturovanými metadaty
            const formData = new FormData();
            formData.append('file', fileData, book.filePath.split('/').pop() || 'unknown.pdf');
            formData.append('bookId', book.id);
            formData.append('fileName', book.filePath.split('/').pop() || 'unknown.pdf');
            formData.append('fileType', book.format.toLowerCase());
            
            // Metadata jako samostatná pole - každé pole zvlášť pro správnou strukturu v n8n
            formData.append('id', book.id);
            formData.append('title', book.title);
            formData.append('author', book.author);
            formData.append('publicationYear', book.publicationYear?.toString() || '');
            formData.append('publisher', book.publisher || '');
            formData.append('summary', book.summary || '');
            formData.append('language', book.language || '');
            formData.append('releaseVersion', book.releaseVersion || '');
            formData.append('format', book.format);
            formData.append('fileSize', book.fileSize?.toString() || '0');
            
            // Pole (arrays) - každý prvek zvlášť aby n8n viděl strukturu pole
            if (book.keywords && book.keywords.length > 0) {
                book.keywords.forEach(keyword => {
                    formData.append('keywords[]', keyword);
                });
            }
            
            if (book.categories && book.categories.length > 0) {
                book.categories.forEach(category => {
                    formData.append('categories[]', category);
                });
            }
            
            if (book.labels && book.labels.length > 0) {
                book.labels.forEach(label => {
                    formData.append('labels[]', label);
                });
            }
            
            if (book.publicationTypes && book.publicationTypes.length > 0) {
                book.publicationTypes.forEach(type => {
                    formData.append('publicationTypes[]', type);
                });
            }
            
            console.log('📦 FormData připraven s binárním souborem a strukturovanými metadaty:', {
                bookId: book.id,
                fileName: book.filePath.split('/').pop(),
                fileType: book.format.toLowerCase(),
                fileSize: fileData.size,
                title: book.title,
                author: book.author,
                'keywords[]': book.keywords,
                'categories[]': book.categories,
                'labels[]': book.labels,
                'publicationTypes[]': book.publicationTypes
            });
            
            if (waitForResponse) {
                // Režim s čekáním na odpověď - s timeoutem 5 minut
                console.log('⏳ Odesílám webhook a čekám na odpověď (timeout 5 minut)...');
                
                // Vytvoříme AbortController pro timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, 5 * 60 * 1000); // 5 minut timeout
                
                try {
                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        // Neposíláme Content-Type header - browser ho nastaví automaticky s boundary pro FormData
                        body: formData,
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                    }
                    
                    // Zkusíme parsovat odpověď jako JSON
                    let result: any = null;
                    const responseText = await response.text();
                    console.log('📥 Webhook raw odpověď:', responseText);
                    
                    if (responseText && responseText.trim().length > 0) {
                        try {
                            result = JSON.parse(responseText);
                            console.log('✅ Webhook odpověď parsována:', result);
                            console.log('📊 Typ odpovědi:', typeof result, 'Array?', Array.isArray(result), 'Délka:', result?.length);
                        } catch (parseError) {
                            console.warn('⚠️ Nepodařilo se parsovat JSON odpověď:', parseError);
                            console.warn('⚠️ Raw text:', responseText);
                        }
                    } else {
                        console.log('⚠️ Webhook vrátil prázdnou odpověď');
                    }
                    
                    // ====================
                    // PARSOVÁNÍ N8N ODPOVĚDI - DETEKCE JEDNOTLIVÝCH DATABÁZÍ
                    // ====================
                    // Očekávaný formát: [
                    //   { "qdrant_ok": true, "qdrant_error": "" },
                    //   { "qdrant_ok": true, "qdrant_error": "" },
                    //   { "supabase_ok": true, "supabase_error": "" }
                    // ]
                    
                    let qdrantLocalStatus: 'none' | 'success' | 'error' = 'none';
                    let qdrantCloudStatus: 'none' | 'success' | 'error' = 'none';
                    let supabaseVectorStatus: 'none' | 'success' | 'error' = 'none';
                    let qdrantLocalError = '';
                    let qdrantCloudError = '';
                    let supabaseVectorError = '';
                    let newStatus: 'success' | 'error' | 'pending' = 'error';
                    let message = '';
                    
                    // Pokud webhook vrátil prázdnou odpověď, je to chyba (očekáváme validní JSON)
                    if (!result || responseText.trim().length === 0) {
                        newStatus = 'error';
                        message = '❌ Webhook vrátil prázdnou odpověď. Zkontrolujte n8n workflow a ujistěte se, že vrací validní JSON odpověď.';
                    } else if (Array.isArray(result) && result.length >= 2) {
                        console.log('🔍 Parsování pole objektů z N8N...');
                        
                        // Najdi všechny Qdrant odpovědi (očekáváme 2)
                        const qdrantResults = result.filter(item => item.hasOwnProperty('qdrant_ok'));
                        const supabaseResult = result.find(item => item.hasOwnProperty('supabase_ok'));
                        
                        console.log('🗄️ Qdrant results:', qdrantResults);
                        console.log('🗄️ Supabase result:', supabaseResult);
                        
                        // První Qdrant = Local, druhý = Cloud (podle pořadí v odpovědi)
                        if (qdrantResults.length >= 1) {
                            qdrantLocalStatus = qdrantResults[0].qdrant_ok === true ? 'success' : 'error';
                            qdrantLocalError = qdrantResults[0].qdrant_error || '';
                            console.log('✅ Qdrant Local status:', qdrantLocalStatus, 'Error:', qdrantLocalError);
                        }
                        
                        if (qdrantResults.length >= 2) {
                            qdrantCloudStatus = qdrantResults[1].qdrant_ok === true ? 'success' : 'error';
                            qdrantCloudError = qdrantResults[1].qdrant_error || '';
                            console.log('✅ Qdrant Cloud status:', qdrantCloudStatus, 'Error:', qdrantCloudError);
                        }
                        
                        if (supabaseResult) {
                            supabaseVectorStatus = supabaseResult.supabase_ok === true ? 'success' : 'error';
                            supabaseVectorError = supabaseResult.supabase_error || '';
                            console.log('✅ Supabase Vector status:', supabaseVectorStatus, 'Error:', supabaseVectorError);
                        }
                        
                        // Celkový status: success pouze pokud OBA Qdranty jsou OK
                        // (Supabase je považován za méně důležitý)
                        const bothQdrantsOk = qdrantLocalStatus === 'success' && qdrantCloudStatus === 'success';
                        newStatus = bothQdrantsOk ? 'success' : 'error';
                        
                        console.log('🔍 Vyhodnocení celkového statusu:');
                        console.log('  - Qdrant Local:', qdrantLocalStatus);
                        console.log('  - Qdrant Cloud:', qdrantCloudStatus);
                        console.log('  - Supabase Vector:', supabaseVectorStatus);
                        console.log('  - Obě Qdranty OK:', bothQdrantsOk);
                        console.log('  - Celkový vectorStatus:', newStatus);
                        
                        if (bothQdrantsOk) {
                            message = `✅ Soubor úspěšně nahrán do obou Qdrantů`;
                        } else {
                            message = `❌ Nahrání do některé databáze selhalo:\n`;
                            if (qdrantLocalStatus === 'error') {
                                message += `- Qdrant Local: ${qdrantLocalError || 'Chyba'}\n`;
                            }
                            if (qdrantCloudStatus === 'error') {
                                message += `- Qdrant Cloud: ${qdrantCloudError || 'Chyba'}\n`;
                            }
                        }
                    } else {
                        // Fallback pro starší formáty
                        console.log('⚠️ Neočekávaný formát odpovědi, používám fallback. result.success:', result.success);
                        newStatus = result.success ? 'success' : 'error';
                        message = result.message || (result.success ? 'Úspěšně nahráno do vektorové databáze' : 'Chyba při nahrávání do vektorové databáze');
                    }
                    
                    // Aktualizujeme vectorStatus a při úspěchu vytvoříme snapshot metadat
                    let updatedBook = {...book, vectorStatus: newStatus};
                    
                    // Pokud bylo nahrání úspěšné, vytvoříme snapshot metadat
                    if (newStatus === 'success') {
                        const snapshotData = {
                            title: book.title,
                            author: book.author,
                            publicationYear: book.publicationYear,
                            publisher: book.publisher,
                            summary: book.summary,
                            keywords: book.keywords,
                            language: book.language,
                            format: book.format,
                            fileSize: book.fileSize,
                            coverImageUrl: book.coverImageUrl,
                            publicationTypes: book.publicationTypes,
                            labels: book.labels,
                            categories: book.categories,
                            releaseVersion: book.releaseVersion
                        };
                        
                        const metadataSnapshot = JSON.stringify(snapshotData);
                        
                        updatedBook = {
                            ...updatedBook,
                            vectorAddedAt: new Date().toISOString(),
                            metadataSnapshot: metadataSnapshot
                        };
                        
                        console.log('📸 Vytvořen snapshot metadat pro detekci změn:', snapshotData);
                        console.log('📸 Snapshot JSON:', metadataSnapshot);
                    }
                    
                    try {
                        // AKTUALIZUJ STATUSY JEDNOTLIVÝCH DATABÁZÍ
                        console.log('🔄 Aktualizuji statusy jednotlivých databází v books tabulce...');
                        
                        const updateData: any = {
                            Vdtb: newStatus,
                            qdrant_local_status: qdrantLocalStatus,
                            qdrant_cloud_status: qdrantCloudStatus,
                            supabase_vector_status: supabaseVectorStatus,
                            vector_upload_details: result,
                            last_vector_upload_at: new Date().toISOString()
                        };
                        
                        // Pokud bylo nahrání úspěšné, přidáme snapshot metadat
                        if (newStatus === 'success') {
                            const snapshotData = {
                                title: book.title,
                                author: book.author,
                                publicationYear: book.publicationYear,
                                publisher: book.publisher,
                                summary: book.summary,
                                keywords: book.keywords,
                                language: book.language,
                                format: book.format,
                                fileSize: book.fileSize,
                                coverImageUrl: book.coverImageUrl,
                                publicationTypes: book.publicationTypes,
                                labels: book.labels,
                                categories: book.categories,
                                releaseVersion: book.releaseVersion
                            };
                            
                            updateData.vector_added_at = new Date().toISOString();
                            updateData.metadata_snapshot = JSON.stringify(snapshotData);
                            
                            console.log('📸 Vytvořen snapshot metadat pro detekci změn');
                        }
                        
                        const { data: dbData, error: dbError } = await supabaseClient
                            .from('books')
                            .update(updateData)
                            .eq('id', book.id)
                            .select()
                            .single();
                        
                        if (dbError) {
                            console.error('❌ Chyba při aktualizaci statusů v databázi:', dbError);
                            throw dbError;
                        }
                        
                        console.log('✅ Statusy úspěšně aktualizovány v databázi');
                        console.log('✅ Aktualizovaná data:', dbData);
                        
                        // Aktualizuj také local state
                        updatedBook = mapSupabaseToBook(dbData);
                    } catch (updateError) {
                        console.warn('⚠️ Webhook byl úspěšný, ale nepodařilo se aktualizovat status v databázi:', updateError);
                        // Webhook byl úspěšný, takže nebudeme měnit návratovou hodnotu
                    }
                    
                    return {
                        success: newStatus === 'success',
                        message,
                        details: result
                    };
                    
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                        throw new Error('⏰ Timeout: Webhook neodpověděl do 5 minut. Zkuste to později nebo kontaktujte administrátora.');
                    }
                    
                    throw fetchError;
                }
                
            } else {
                // Režim fire-and-forget (bez čekání na odpověď)
                console.log('🚀 Odesílám webhook bez čekání na odpověď (fire-and-forget)...');
                
                fetch(webhookUrl, {
                    method: 'POST',
                    // Neposíláme Content-Type header - browser ho nastaví automaticky s boundary pro FormData
                    body: formData
                }).catch(err => {
                    console.error('⚠️ Chyba při odesílání fire-and-forget webhoku (ignorováno):', err);
                });
                
                return {
                    success: true,
                    message: 'Požadavek odeslán do fronty na zpracování'
                };
            }
            
        } catch (error: any) {
            // Pokud je to náš speciální error pro velké PDF, přehodíme ho dál
            if (error.message === 'LARGE_PDF_WARNING') {
                throw error; // Přehodíme error dál do confirmVectorDatabaseAction
            }
            
            console.error('Chyba při odesílání do vektorové databáze:', error);
            
            // Aktualizujeme status na error
            try {
                await api.updateBook({...book, vectorStatus: 'error'});
            } catch (updateError) {
                console.error('Chyba při aktualizaci statusu:', updateError);
            }
            
            return {
                success: false,
                message: `Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
            };
        }
    },

    // Funkce pro odesílání pouze textu do n8n webhook pro vektorovou databázi
    async sendTextOnlyToVectorDatabase(book: Book, waitForResponse: boolean = false): Promise<{success: boolean, message: string, details?: any}> {
        const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58';
        
        try {
            // Nejdříve aktualizujeme status na pending
            await api.updateBook({...book, vectorStatus: 'pending'});
            
            console.log('📄 Připravuji text-only data pro vektorovou databázi...');
            
            // KROK 1: Získání extrahovaného textu
            // Nejdříve zkusíme načíst z mezipaměti
            const cacheKey = `extracted_text_${book.id}`;
            let extractedText = localStorage.getItem(cacheKey);
            
            if (!extractedText || extractedText.trim().length === 0) {
                console.log('📥 Text není v mezipaměti, spouštím LOKÁLNÍ extrakci z PDF...');
                
                try {
                    // Stáhneme PDF soubor z Supabase storage
                    const { data: fileData, error: downloadError } = await supabaseClient.storage
                        .from('Books')
                        .download(book.filePath);
                        
                    if (downloadError || !fileData) {
                        throw new Error(`Nepodařilo se stáhnout soubor: ${downloadError?.message}`);
                    }
                    
                    console.log('📄 PDF staženo, velikost:', fileData.size, 'bytes');
                    console.log('🔍 DEBUG fileData:', {
                        size: fileData.size,
                        type: fileData.type,
                        constructor: fileData.constructor.name
                    });
                    
                    // Vytvoříme File objekt z Blob
                    const pdfFile = new File([fileData], book.filePath.split('/').pop() || 'document.pdf', { type: 'application/pdf' });
                    
                    console.log('🔍 DEBUG pdfFile před extrakcí:', {
                        name: pdfFile.name,
                        size: pdfFile.size,
                        type: pdfFile.type
                    });
                    
                    // Lokální extrakce textu pomocí PDF.js
                    const txtFile = await extractTextLocallyFromPDF(pdfFile);
                    
                    console.log('🔍 DEBUG txtFile po extrakci:', {
                        name: txtFile.name,
                        size: txtFile.size,
                        type: txtFile.type
                    });
                    
                    // Načteme text ze souboru
                    extractedText = await txtFile.text();
                    
                    console.log('✅ Text extrahován lokálně:', extractedText.length, 'znaků');
                    console.log('🔍 DEBUG prvních 500 znaků textu:');
                    console.log(extractedText.substring(0, 500));
                    
                    // Uložíme do mezipaměti
                    localStorage.setItem(cacheKey, extractedText);
                    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
                    console.log('💾 Text uložen do mezipaměti');
                    
                } catch (extractError) {
                    throw new Error(`Nepodařilo se extrahovat text: ${extractError instanceof Error ? extractError.message : 'Neznámá chyba'}`);
                }
            } else {
                console.log('✅ Používám text z mezipaměti:', extractedText.length, 'znaků');
            }
            
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('Extrahovaný text je prázdný. PDF pravděpodobně neobsahuje čitelný text.');
            }
            
            // KROK 2: Vytvoření TXT Blob souboru
            const txtBlob = new Blob([extractedText], { type: 'text/plain; charset=utf-8' });
            const txtFileName = book.filePath.split('/').pop()?.replace(/\.(pdf|PDF)$/i, '.txt') || `${book.title}.txt`;
            
            console.log('📄 Vytvořen TXT soubor:', txtFileName, 'Velikost:', txtBlob.size, 'bytes');
            console.log('🔍 DEBUG txtBlob:', {
                size: txtBlob.size,
                type: txtBlob.type
            });
            
            // Kontrola prvních 200 bajtů txtBlob
            const txtBlobPreview = await txtBlob.slice(0, 200).text();
            console.log('🔍 DEBUG prvních 200 bajtů txtBlob:');
            console.log(txtBlobPreview);
            
            // KROK 3: Vytvoříme FormData s TXT souborem a metadaty
            const formData = new FormData();
            formData.append('file', txtBlob, txtFileName);
            formData.append('bookId', book.id);
            formData.append('fileName', txtFileName);
            formData.append('fileType', 'txt'); // Označíme jako TXT
            formData.append('contentType', 'text'); // 🆕 PARAMETR PRO N8N: Rozlišení PDF vs TXT
            
            // Metadata jako samostatná pole
            formData.append('id', book.id);
            formData.append('title', book.title);
            formData.append('author', book.author);
            formData.append('publicationYear', book.publicationYear?.toString() || '');
            formData.append('publisher', book.publisher || '');
            formData.append('summary', book.summary || '');
            formData.append('language', book.language || '');
            formData.append('releaseVersion', book.releaseVersion || '');
            formData.append('format', 'TXT'); // Označíme jako TXT formát
            formData.append('fileSize', txtBlob.size.toString());
            
            // Pole (arrays) - každý prvek zvlášť
            if (book.keywords && book.keywords.length > 0) {
                book.keywords.forEach(keyword => {
                    formData.append('keywords[]', keyword);
                });
            }
            
            if (book.categories && book.categories.length > 0) {
                book.categories.forEach(category => {
                    formData.append('categories[]', category);
                });
            }
            
            if (book.labels && book.labels.length > 0) {
                book.labels.forEach(label => {
                    formData.append('labels[]', label);
                });
            }
            
            if (book.publicationTypes && book.publicationTypes.length > 0) {
                book.publicationTypes.forEach(type => {
                    formData.append('publicationTypes[]', type);
                });
            }
            
            console.log('📦 FormData připraven s TXT souborem a metadaty:', {
                bookId: book.id,
                fileName: txtFileName,
                fileType: 'txt',
                contentType: 'text', // 🔑 Klíčový parametr
                fileSize: txtBlob.size,
                title: book.title,
                author: book.author
            });
            
            if (waitForResponse) {
                // Režim s čekáním na odpověď - s timeoutem 5 minut
                console.log('⏳ Odesílám webhook (text-only) a čekám na odpověď (timeout 5 minut)...');
                
                // Vytvoříme AbortController pro timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, 5 * 60 * 1000); // 5 minut timeout
                
                try {
                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        body: formData,
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                    }
                    
                    // Zkusíme parsovat odpověď jako JSON
                    let result: any = null;
                    const responseText = await response.text();
                    console.log('📥 Webhook raw odpověď (text-only):', responseText);
                    
                    if (responseText && responseText.trim().length > 0) {
                        try {
                            result = JSON.parse(responseText);
                            console.log('✅ Webhook odpověď parsována:', result);
                        } catch (parseError) {
                            console.warn('⚠️ Nepodařilo se parsovat JSON odpověď:', parseError);
                        }
                    } else {
                        console.log('⚠️ Webhook vrátil prázdnou odpověď');
                    }
                    
                    // Parsování statusů (stejně jako u PDF verze)
                    let qdrantLocalStatus: 'none' | 'success' | 'error' = 'none';
                    let qdrantCloudStatus: 'none' | 'success' | 'error' = 'none';
                    let supabaseVectorStatus: 'none' | 'success' | 'error' = 'none';
                    let qdrantLocalError = '';
                    let qdrantCloudError = '';
                    let supabaseVectorError = '';
                    let newStatus: 'success' | 'error' | 'pending' = 'error';
                    let message = '';
                    
                    if (!result || responseText.trim().length === 0) {
                        newStatus = 'error';
                        message = '❌ Webhook vrátil prázdnou odpověď. Zkontrolujte n8n workflow a ujistěte se, že vrací validní JSON odpověď.';
                    } else if (Array.isArray(result) && result.length >= 2) {
                        console.log('🔍 Parsování pole objektů z N8N...');
                        
                        const qdrantResults = result.filter(item => item.hasOwnProperty('qdrant_ok'));
                        const supabaseResult = result.find(item => item.hasOwnProperty('supabase_ok'));
                        
                        if (qdrantResults.length >= 1) {
                            qdrantLocalStatus = qdrantResults[0].qdrant_ok === true ? 'success' : 'error';
                            qdrantLocalError = qdrantResults[0].qdrant_error || '';
                        }
                        
                        if (qdrantResults.length >= 2) {
                            qdrantCloudStatus = qdrantResults[1].qdrant_ok === true ? 'success' : 'error';
                            qdrantCloudError = qdrantResults[1].qdrant_error || '';
                        }
                        
                        if (supabaseResult) {
                            supabaseVectorStatus = supabaseResult.supabase_ok === true ? 'success' : 'error';
                            supabaseVectorError = supabaseResult.supabase_error || '';
                        }
                        
                        const bothQdrantsOk = qdrantLocalStatus === 'success' && qdrantCloudStatus === 'success';
                        newStatus = bothQdrantsOk ? 'success' : 'error';
                        
                        if (bothQdrantsOk) {
                            message = `✅ Text úspěšně nahrán do obou Qdrantů`;
                        } else {
                            message = `❌ Nahrání do některé databáze selhalo:\n`;
                            if (qdrantLocalStatus === 'error') {
                                message += `- Qdrant Local: ${qdrantLocalError || 'Chyba'}\n`;
                            }
                            if (qdrantCloudStatus === 'error') {
                                message += `- Qdrant Cloud: ${qdrantCloudError || 'Chyba'}\n`;
                            }
                        }
                    } else {
                        console.log('⚠️ Neočekávaný formát odpovědi, používám fallback. result.success:', result.success);
                        newStatus = result.success ? 'success' : 'error';
                        message = result.message || (result.success ? 'Úspěšně nahráno do vektorové databáze (text-only)' : 'Chyba při nahrávání do vektorové databáze');
                    }
                    
                    // Aktualizujeme vectorStatus a vytvoříme snapshot metadat
                    let updatedBook = {...book, vectorStatus: newStatus};
                    
                    if (newStatus === 'success') {
                        const snapshotData = {
                            title: book.title,
                            author: book.author,
                            publicationYear: book.publicationYear,
                            publisher: book.publisher,
                            summary: book.summary,
                            keywords: book.keywords,
                            language: book.language,
                            format: book.format,
                            fileSize: book.fileSize,
                            coverImageUrl: book.coverImageUrl,
                            publicationTypes: book.publicationTypes,
                            labels: book.labels,
                            categories: book.categories,
                            releaseVersion: book.releaseVersion
                        };
                        
                        const metadataSnapshot = JSON.stringify(snapshotData);
                        
                        updatedBook = {
                            ...updatedBook,
                            vectorAddedAt: new Date().toISOString(),
                            metadataSnapshot: metadataSnapshot
                        };
                        
                        console.log('📸 Vytvořen snapshot metadat pro detekci změn');
                    }
                    
                    try {
                        console.log('🔄 Aktualizuji statusy jednotlivých databází v books tabulce...');
                        
                        const updateData: any = {
                            Vdtb: newStatus,
                            qdrant_local_status: qdrantLocalStatus,
                            qdrant_cloud_status: qdrantCloudStatus,
                            supabase_vector_status: supabaseVectorStatus,
                            vector_upload_details: result,
                            last_vector_upload_at: new Date().toISOString()
                        };
                        
                        if (newStatus === 'success') {
                            const snapshotData = {
                                title: book.title,
                                author: book.author,
                                publicationYear: book.publicationYear,
                                publisher: book.publisher,
                                summary: book.summary,
                                keywords: book.keywords,
                                language: book.language,
                                format: book.format,
                                fileSize: book.fileSize,
                                coverImageUrl: book.coverImageUrl,
                                publicationTypes: book.publicationTypes,
                                labels: book.labels,
                                categories: book.categories,
                                releaseVersion: book.releaseVersion
                            };
                            
                            updateData.vector_added_at = new Date().toISOString();
                            updateData.metadata_snapshot = JSON.stringify(snapshotData);
                        }
                        
                        const { data: dbData, error: dbError } = await supabaseClient
                            .from('books')
                            .update(updateData)
                            .eq('id', book.id)
                            .select()
                            .single();
                        
                        if (dbError) {
                            console.error('❌ Chyba při aktualizaci statusů v databázi:', dbError);
                            throw dbError;
                        }
                        
                        console.log('✅ Statusy úspěšně aktualizovány v databázi');
                        
                        updatedBook = mapSupabaseToBook(dbData);
                    } catch (updateError) {
                        console.warn('⚠️ Webhook byl úspěšný, ale nepodařilo se aktualizovat status v databázi:', updateError);
                    }
                    
                    return {
                        success: newStatus === 'success',
                        message,
                        details: result
                    };
                    
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                        throw new Error('⏰ Timeout: Webhook neodpověděl do 5 minut. Zkuste to později nebo kontaktujte administrátora.');
                    }
                    
                    throw fetchError;
                }
                
            } else {
                // Režim fire-and-forget (bez čekání na odpověď)
                console.log('🚀 Odesílám webhook (text-only) bez čekání na odpověď (fire-and-forget)...');
                
                fetch(webhookUrl, {
                    method: 'POST',
                    body: formData
                }).catch(err => {
                    console.error('⚠️ Chyba při odesílání fire-and-forget webhoku (ignorováno):', err);
                });
                
                return {
                    success: true,
                    message: 'Požadavek odeslán do fronty na zpracování (text-only)'
                };
            }
            
        } catch (error) {
            console.error('Chyba při odesílání text-only dat do vektorové databáze:', error);
            
            // Aktualizujeme status na error
            try {
                await api.updateBook({...book, vectorStatus: 'error'});
            } catch (updateError) {
                console.error('Chyba při aktualizaci statusu:', updateError);
            }
            
            return {
                success: false,
                message: `Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
            };
        }
    },

    // Funkce pro mazání z Supabase vektorové databáze
    async deleteFromSupabaseVectorDB(bookId: string): Promise<{success: boolean, message: string}> {
        try {
            console.log('🗑️ Mazání z Supabase vektorové databáze, bookId:', bookId);
            
            // Použijeme fetch API pro přímé volání Supabase REST API pro tabulku documents
            // Protože documents tabulka není v naší TypeScript definici
            const response = await fetch(`${supabaseUrl}/rest/v1/documents?metadata->>file_id=eq.${bookId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Chyba při mazání z Supabase vektorové DB:', response.status, errorText);
                return {
                    success: false,
                    message: `Chyba při mazání z Supabase vektorové databáze: ${response.status} ${errorText}`
                };
            }
            
            console.log('✅ Úspěšně smazáno z Supabase vektorové databáze');
            return {
                success: true,
                message: 'Úspěšně smazáno z Supabase vektorové databáze'
            };
            
        } catch (error) {
            console.error('❌ Chyba při mazání z Supabase vektorové DB:', error);
            return {
                success: false,
                message: `Neočekávaná chyba při mazání z Supabase: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
            };
        }
    },

    // Funkce pro mazání z Qdrant vektorové databáze
    async deleteFromQdrantVectorDB(bookId: string): Promise<{success: boolean, message: string}> {
        // Zkusíme různé varianty URL pro Qdrant
        const qdrantUrls = [
            'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io:6333',
            'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io',
            'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io/api'
        ];
        const qdrantApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ls9vPmwrlvxTco80TUsQBMPg0utIzNTYgk25x9__Vbo';
        
        for (const qdrantUrl of qdrantUrls) {
            try {
                console.log(`🗑️ Zkouším mazání z Qdrant s URL: ${qdrantUrl}, bookId:`, bookId);
                
                // Smazání všech points s daným file_id v metadata z Qdrant kolekce "documents"
                const deleteResponse = await fetch(`${qdrantUrl}/collections/documents/points/delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': qdrantApiKey
                    },
                    body: JSON.stringify({
                        filter: {
                            must: [
                                {
                                    key: "file_id",
                                    match: {
                                        value: bookId
                                    }
                                }
                            ]
                        }
                    })
                });

                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    console.warn(`❌ Chyba s URL ${qdrantUrl}:`, deleteResponse.status, errorText);
                    continue; // Zkusíme další URL
                }

                const result = await deleteResponse.json();
                console.log('✅ Úspěšná odpověď z Qdrant s URL', qdrantUrl, ':', result);
                
                return {
                    success: true,
                    message: 'Úspěšně smazáno z Qdrant vektorové databáze'
                };
                
            } catch (error) {
                console.warn(`❌ Chyba s URL ${qdrantUrl}:`, error instanceof Error ? error.message : 'Neznámá chyba');
                continue; // Zkusíme další URL
            }
        }
        
        // Pokud všechny URL selhaly
        return {
            success: false,
            message: `Neočekávaná chyba při mazání z Qdrant: Všechny URL varianty selhaly (CORS nebo nedostupnost)`
        };
    },

    // Funkce pro mazání z obou vektorových databází
    async deleteFromVectorDatabases(bookId: string): Promise<{success: boolean, message: string, details?: any}> {
        console.log('🗑️ Zahajuji mazání z obou vektorových databází pro knihu:', bookId);
        
        const results = {
            supabase: { success: false, message: '' },
            qdrant: { success: false, message: '' }
        };
        
        // Paralelně mažeme z obou databází
        const [supabaseResult, qdrantResult] = await Promise.allSettled([
            this.deleteFromSupabaseVectorDB(bookId),
            this.deleteFromQdrantVectorDB(bookId)
        ]);
        
        // Zpracujeme výsledky z Supabase
        if (supabaseResult.status === 'fulfilled') {
            results.supabase = supabaseResult.value;
        } else {
            results.supabase = {
                success: false,
                message: `Chyba při mazání z Supabase: ${supabaseResult.reason}`
            };
        }
        
        // Zpracujeme výsledky z Qdrant
        if (qdrantResult.status === 'fulfilled') {
            results.qdrant = qdrantResult.value;
        } else {
            results.qdrant = {
                success: false,
                message: `Chyba při mazání z Qdrant: ${qdrantResult.reason}`
            };
        }
        
        // Vyhodnotíme celkový výsledek
        const bothSuccessful = results.supabase.success && results.qdrant.success;
        const someSuccessful = results.supabase.success || results.qdrant.success;
        
        let overallMessage = '';
        if (bothSuccessful) {
            overallMessage = '✅ Úspěšně smazáno z obou vektorových databází (Supabase + Qdrant)';
        } else if (someSuccessful) {
            if (results.supabase.success) {
                overallMessage = `⚠️ Smazáno pouze z Supabase. Qdrant chyba: ${results.qdrant.message}`;
            } else {
                overallMessage = `⚠️ Smazáno pouze z Qdrant. Supabase chyba: ${results.supabase.message}`;
            }
        } else {
            overallMessage = `❌ Nepodařilo se smazat z žádné vektorové databáze.\nSupabase: ${results.supabase.message}\nQdrant: ${results.qdrant.message}`;
        }
        
        console.log('📊 Celkový výsledek mazání z vektorových databází:', overallMessage);
        
        return {
            success: bothSuccessful,
            message: overallMessage,
            details: results
        };
    },

    // === METADATA MANAGEMENT API ===

    // Štítky (Labels)
    async getLabels(): Promise<string[]> {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/labels?select=name&order=name.asc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((item: any) => item.name);
        } catch (error) {
            console.error('Error fetching labels:', error);
            return [];
        }
    },

    async addLabel(name: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('labels')
            .insert({ name: name.trim() });
        if (error) { 
            console.error('Error adding label:', error.message, error); 
            return false;
        }
        return true;
    },

    async deleteLabel(name: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('labels')
            .delete()
            .eq('name', name.trim());
        if (error) { 
            console.error('Error deleting label:', error.message, error); 
            return false;
        }
        return true;
    },

    // Kategorie (Categories)
    async getCategories(): Promise<string[]> {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=name&order=name.asc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((item: any) => item.name);
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    async addCategory(name: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('categories')
            .insert({ name: name.trim() });
        if (error) { 
            console.error('Error adding category:', error.message, error); 
            return false;
        }
        return true;
    },

    async deleteCategory(name: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('categories')
            .delete()
            .eq('name', name.trim());
        if (error) { 
            console.error('Error deleting category:', error.message, error); 
            return false;
        }
        return true;
    },

    // Jazyky (Languages)  
    async getLanguages(): Promise<string[]> {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/languages?select=name&order=name.asc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((item: any) => item.name);
        } catch (error) {
            console.error('Error fetching languages:', error);
            return [];
        }
    },

    async addLanguage(name: string, code?: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('languages')
            .insert({ name: name.trim(), code: code?.trim() || null });
        if (error) { 
            console.error('Error adding language:', error.message, error); 
            return false;
        }
        return true;
    },

    async deleteLanguage(name: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('languages')
            .delete()
            .eq('name', name.trim());
        if (error) { 
            console.error('Error deleting language:', error.message, error); 
            return false;
        }
        return true;
    },

    // Typy publikací (Publication Types)
    async getPublicationTypes(): Promise<string[]> {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/publication_types?select=name&order=name.asc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((item: any) => item.name);
        } catch (error) {
            console.error('Error fetching publication types:', error);
            return [];
        }
    },

    async addPublicationType(name: string, description?: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('publication_types')
            .insert({ name: name.trim(), description: description?.trim() || null });
        if (error) { 
            console.error('Error adding publication type:', error.message, error); 
            return false;
        }
        return true;
    },

    async deletePublicationType(name: string): Promise<boolean> {
        if (!name || name.trim() === '') return false;
        const { error } = await supabaseClient
            .from('publication_types')
            .delete()
            .eq('name', name.trim());
        if (error) { 
            console.error('Error deleting publication type:', error.message, error); 
            return false;
        }
        return true;
    },

    // Audit Qdrant Cloud - projde všechny knihy, zkontroluje přítomnost v Qdrant Cloud, zapíše výsledek
    async auditQdrantCloud(
        onProgress?: (current: number, total: number, bookTitle: string) => void
    ): Promise<{checked: number, found: number, notFound: number, errors: number}> {
        const edgeUrl = `${supabaseUrl}/functions/v1/qdrant-proxy`;

        const { data: allBooks, error } = await supabaseClient
            .from('books')
            .select('id, title')
            .order('title');

        if (error || !allBooks) {
            console.error('❌ Chyba při načítání knih:', error);
            return { checked: 0, found: 0, notFound: 0, errors: 1 };
        }

        let found = 0, notFound = 0, errors = 0;

        for (let i = 0; i < allBooks.length; i++) {
            const book = allBooks[i];
            onProgress?.(i + 1, allBooks.length, book.title);

            try {
                const response = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                    },
                    body: JSON.stringify({
                        operation: 'count',
                        filter: { must: [{ key: 'file_id', match: { value: book.id } }] }
                    })
                });

                const data = await response.json();
                const count = data?.result?.count ?? 0;

                if (count > 0) {
                    found++;
                    await supabaseClient
                        .from('books')
                        .update({ qdrant_cloud_status: 'success' })
                        .eq('id', book.id);
                    console.log(`✅ ${book.title}: ${count} vektorů v Qdrant Cloud`);
                } else {
                    notFound++;
                    console.log(`⬜ ${book.title}: není v Qdrant Cloud`);
                }
            } catch (err) {
                console.error(`❌ Chyba pro knihu ${book.title}:`, err);
                errors++;
            }
        }

        return { checked: allBooks.length, found, notFound, errors };
    },

    // Funkce pro aktualizaci metadata v Qdrant přes n8n webhook
    async updateQdrantMetadata(bookId: string, book: Book): Promise<{success: boolean, message: string}> {
        // Použijeme n8n webhook pro aktualizaci metadata
        const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/822e584e-0836-4d1d-aef1-5c4dce6573c0';

        try {
            console.log('🔄 Odesílám požadavek na aktualizaci Qdrant metadata přes n8n webhook');
            console.log('📂 Kniha ID:', bookId);
            console.log('📂 Nové categories:', book.categories);
            console.log('📂 Nové labels:', book.labels);
            console.log('📂 Nové publicationTypes:', book.publicationTypes);

            // Vytvoříme kompletní metadata stejně jako v updateMetadataWebhook
            const metadata = {
                title: book.title,
                author: book.author,
                publicationYear: book.publicationYear,
                publisher: book.publisher,
                summary: book.summary,
                keywords: book.keywords,
                language: book.language,
                format: book.format,
                fileSize: book.fileSize,
                coverImageUrl: book.coverImageUrl,
                publicationTypes: book.publicationTypes,
                labels: book.labels,
                categories: book.categories,
                releaseVersion: book.releaseVersion
            };

            // Vytvoříme payload pro n8n webhook
            const payload = {
                action: "update_metadata",
                bookId: bookId,
                metadata: metadata
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('📡 HTTP Status:', response.status);
            console.log('📡 Response OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Chyba při volání n8n webhook:', response.status, errorText);
                return {
                    success: false,
                    message: `Chyba při volání webhook: ${response.status} ${errorText}`
                };
            }

            const responseText = await response.text();
            console.log('📡 Raw response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('✅ Parsed odpověď z n8n webhook:', result);
            } catch (parseError) {
                console.error('❌ Chyba při parsování JSON odpovědi:', parseError);
                console.error('📡 Response text:', responseText);
                return {
                    success: false,
                    message: `Chyba při parsování odpovědi z webhooku: ${parseError instanceof Error ? parseError.message : 'Neznámá chyba'}`
                };
            }
            
            // Zpracujeme odpověď - pokud má status 'ok', považujeme za úspěch
            if (result.status === 'ok') {
                return {
                    success: true,
                    message: '✅ Metadata úspěšně aktualizována v databázi'
                };
            } else if (Array.isArray(result)) {
                const qdrantResult = result.find(item => item.hasOwnProperty('qdrant_ok'));
                if (qdrantResult?.qdrant_ok === true) {
                    return {
                        success: true,
                        message: '✅ Metadata v Qdrant úspěšně aktualizována'
                    };
                } else {
                    return {
                        success: false,
                        message: `❌ Chyba při aktualizaci Qdrant: ${qdrantResult?.qdrant_error || 'Neznámá chyba'}`
                    };
                }
            } else if (result.success) {
                return {
                    success: true,
                    message: result.message || '✅ Metadata v Qdrant úspěšně aktualizována'
                };
            } else {
                return {
                    success: false,
                    message: result.message || '❌ Chyba při aktualizaci metadata'
                };
            }

        } catch (error) {
            console.error('❌ Neočekávaná chyba při volání n8n webhook:', error);
            return {
                success: false,
                message: `Neočekávaná chyba při aktualizaci metadata: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
            };
        }
    },
};

// Gemini AI byla odstraněna - už se nepoužívá

const generateMetadataWithAI = async (field: keyof Book, book: Book): Promise<string> => {
    alert("AI generování bylo odstraněno. Použijte prosím automatickou extrakci metadat při nahrávání souboru.");
    return "AI není k dispozici.";
    
    console.log("🔍 Načítám obsah dokumentu pro AI analýzu...");
    console.log("📁 FilePath:", book.filePath);
    console.log("📖 Kniha:", book.title, "od", book.author);
    
    // KLÍČOVÁ ZMĚNA: Preferujeme text z mezipaměti (OCR webhook)
    let documentContent = "";
    try {
        // Nejdříve zkusíme načíst text z mezipaměti (OCR webhook)
        const cachedText = getTextFromCache(book.id);
        if (cachedText) {
            console.log("✅ Používám text z OCR webhook mezipaměti:", cachedText.length, "znaků");
            documentContent = cachedText;
        } else if (book.filePath) {
            console.log("⬇️ Stahuju PDF soubor z databáze (fallback)...");
            documentContent = await api.getFileContent(book.filePath);
            console.log("✅ Obsah dokumentu načten (fallback):", documentContent.length, "znaků");
            
            // Zkontrolujeme, jestli obsahuje OCR text nebo strukturální info
            if (documentContent.includes("NEOBSAHUJE DOSTATEČNÝ TEXT PRO AI ANALÝZU") || 
                documentContent.includes("PDF dokument neobsahuje dostatečný čitelný text") ||
                documentContent.includes("CHYBA při zpracování PDF")) {
                console.log("❌ PDF NEOBSAHUJE OCR TEXT - AI dostane chybovou zprávu");
                console.log("📄 Obsah:", documentContent.substring(0, 300) + "...");
            } else if (documentContent.includes("=== STRÁNKA") && documentContent.length > 100) {
                console.log("✅ PDF OBSAHUJE OCR TEXT - AI dostane skutečný obsah");
                console.log("📊 Nalezeno stránek s textem:", (documentContent.match(/=== STRÁNKA/g) || []).length);
            } else {
                console.log("⚠️ NEOČEKÁVANÝ FORMÁT - kontroluji obsah");
                console.log("📄 Začátek obsahu:", documentContent.substring(0, 200) + "...");
            }
            
            // Omezíme obsah na prvních 50 stránek (přibližně 25 000 slov/150 000 znaků)
            const maxChars = 150000; // Přibližně 25 000 slov = 50 stránek
            if (documentContent.length > maxChars) {
                documentContent = documentContent.substring(0, maxChars) + "...";
                console.log("📝 Obsah zkrácen na prvních 50 stránek (150 000 znaků)");
            }
        } else {
            console.warn("⚠️ Kniha nemá filePath - použiji pouze název");
            documentContent = `Název souboru: ${book.title}`;
        }
    } catch (error) {
        console.error("❌ Chyba při načítání obsahu dokumentu:", error);
        documentContent = `Název souboru: ${book.title}`;
    }
    
    const bookInfo = `kniha "${book.title}" od ${book.author || "neznámého autora"}`;
    let prompt = "";
    
    // Přidáme obsah dokumentu do každého promptu
    const contentContext = documentContent.length > 50 
        ? `\n\nObsah dokumentu (prvních 50 stránek):\n${documentContent}\n\n` 
        : "\n\n";
    
    switch (field) {
        case "title":
            prompt = `Na základě obsahu dokumentu najdi správný název publikace.  "${book.title}". Odpověz pouze názvem bez uvozovek.${contentContext}`;
            break;
        case "author":
            prompt = `Na základě obsahu dokumentu urči, kdo je autor této knihy. Pokud je více autorů, odděl je čárkou. Odpověz pouze jménem/jmény.${contentContext}`;
            break;
        case "publicationYear":
            prompt = `Na základě obsahu dokumentu urči, v jakém roce byla tato kniha poprvé vydána. Odpověz pouze číslem roku.${contentContext}`;
            break;
        case "publisher":
            prompt = `Na základě obsahu dokumentu urči, které nakladatelství vydalo tuto knihu. Odpověz pouze názvem nakladatelství, Popřípadě názvem instituce, která ${contentContext}`;
            break;
        case "summary":
            prompt = `Na základě obsahu dokumentu napiš krátkou, výstižnou sumarizaci v češtině. Sumarizace by měla být konkrétní a informativní - po přečtení musí být jasné, o čem kniha je a co se v ní čtenář dozví. 
            Musí obsahovat jasnou sumarizaci obsahu. Nezminuj zde ze sumarizace je delana z prvnich 50 stran. ROvněž nezačínej frázemi jako "Tato kniha je o..." Jdi rovnou k věci a neplýtvej zbytečnými frázemi.  ${contentContext}`;
            break;
        case "keywords":
            prompt = `Na základě obsahu dokumentu vygeneruj 5-7 relevantních klíčových slov v češtině. Klíčová slova musí být zaměřena na obsah knihy Vrať je jako seznam oddělený čárkami.${contentContext}`;
            break;
        case "language":
            prompt = `Na základě obsahu dokumentu urči, v jakém jazyce je tato kniha napsána. Odpověz pouze názvem jazyka v češtině (např. čeština, angličtina, němčina, francouzština). Nikdy neodpovídej "neznámý" - vždy vyber konkrétní jazyk na základě dostupných informací.${contentContext}`;
            break;
        case "releaseVersion":
            prompt = `Na základě obsahu dokumentu najdi jaká je toto verze vydání originálu (např. "1. vydání", "2. vydání", "revidované vydání", "rozšířené vydání"). Hledej informace o tom, kolikáté vydání to je nebo jaký typ vydání. Pokud informaci nenajdeš, odpověz "1. vydání". Odpověz pouze označením verze bez dalšího textu.${contentContext}`;
            break;
        default:
            return "Toto pole není podporováno pro AI generování.";
    }
    
    console.log("⚠️ AI generování bylo vypnuto");
    return "AI není k dispozici.";
};


// NOVÁ FUNKCE: Inteligentní generování metadat (auto-detekce OCR)
const generateMetadataIntelligent = async (book: Book): Promise<Partial<Book>> => {
    console.log("🤖 Generuji metadata pomocí inteligentní extrakce (auto-detekce OCR)...");
    console.log("📁 FilePath:", book.filePath);
    console.log("📖 Kniha:", book.title, "od", book.author);
    console.log("📄 Formát:", book.format);

    try {
        const format = book.format.toLowerCase();
        
        // Pro TXT soubory použijeme jiný přístup
        if (format === 'txt') {
            console.log('📝 Zpracovávám TXT soubor...');
            
            // Stáhneme TXT soubor
            console.log('📥 Stahuji TXT soubor...');
            const { data: fileData, error: downloadError } = await supabaseClient.storage
                .from("Books")
                .download(book.filePath);

            if (downloadError || !fileData) {
                console.error('❌ Chyba při stahování TXT souboru:', downloadError);
                throw new Error(`Nepodařilo se stáhnout TXT soubor: ${downloadError?.message || 'Neznámá chyba'}`);
            }

            // Přečteme text ze souboru
            const fullText = await fileData.text();
            console.log('📊 Celková délka textu:', fullText.length, 'znaků');

            // Vezmeme prvních 5000 slov
            const words = fullText.split(/\s+/);
            const first5000Words = words.slice(0, 5000).join(' ');
            console.log('📊 Vybraných slov:', Math.min(words.length, 5000), 'z', words.length);
            console.log('📊 Délka vzorku:', first5000Words.length, 'znaků');

            // Zavoláme AI pro analýzu textu
            console.log('🤖 Volám AI pro analýzu TXT obsahu...');
            const result = await openRouterMetadataService.extractMetadataFromText(
                first5000Words,
                book.title || 'dokument.txt',
                supabaseUrl,
                supabaseKey
            );

            if (!result.success) {
                throw new Error(result.error || 'Extrakce metadat z textu selhala bez zprávy');
            }

            if (!result.metadata) {
                throw new Error('Extrakce metadat nevrátila metadata');
            }

            console.log('✅ Metadata úspěšně extrahována z TXT:', result.metadata);

            // Převedeme metadata na formát Book
            const extractedMetadata: Partial<Book> = {};

            if (result.metadata.title) {
                extractedMetadata.title = result.metadata.title;
            }
            if (result.metadata.author) {
                extractedMetadata.author = result.metadata.author;
            }
            if (result.metadata.publicationYear) {
                extractedMetadata.publicationYear = result.metadata.publicationYear;
            }
            if (result.metadata.publisher) {
                extractedMetadata.publisher = result.metadata.publisher;
            }
            if (result.metadata.language) {
                extractedMetadata.language = result.metadata.language;
            }
            if (result.metadata.summary) {
                extractedMetadata.summary = result.metadata.summary;
            }
            if (result.metadata.keywords && result.metadata.keywords.length > 0) {
                extractedMetadata.keywords = result.metadata.keywords;
            }
            if (result.metadata.releaseVersion) {
                extractedMetadata.releaseVersion = result.metadata.releaseVersion;
            }

            console.log('✅ Metadata připravena k naplnění polí:', extractedMetadata);

            return extractedMetadata;
        }
        
        // Pro PDF soubory použijeme původní logiku
        if (format !== 'pdf') {
            throw new Error('Inteligentní extrakce metadat je podporována pouze pro PDF a TXT soubory');
        }

        // Vytvoříme signed URL pro PDF
        console.log('📥 Vytvářím signed URL pro PDF...');
        const { data: signedUrlData, error: urlError } = await supabaseClient.storage
            .from("Books")
            .createSignedUrl(book.filePath, 60);

        if (urlError || !signedUrlData || !signedUrlData.signedUrl) {
            console.error('❌ Chyba při vytváření signed URL:', urlError);
            throw new Error(`Nepodařilo se získat signed URL: ${urlError?.message || 'Neznámá chyba'}`);
        }

        console.log('✅ Signed URL vytvořena:', signedUrlData.signedUrl);

        // Zavoláme inteligentní extrakční službu
        console.log('🤖 Volám inteligentní extrakční službu...');
        const result = await openRouterMetadataService.extractMetadataIntelligent(
            signedUrlData.signedUrl,
            book.title || 'dokument.pdf',
            supabaseUrl,
            supabaseKey
        );

        if (!result.success) {
            throw new Error(result.error || 'Inteligentní extrakce selhala bez zprávy');
        }

        if (!result.metadata) {
            throw new Error('Inteligentní extrakce nevrátila metadata');
        }

        console.log('✅ Metadata úspěšně extrahována:', result.metadata);
        console.log(`📊 Použitý vstup: ${result.type} | Model: ${result.model}`);

        // Převedeme metadata na formát Book
        const extractedMetadata: Partial<Book> = {};

        if (result.metadata.title) {
            extractedMetadata.title = result.metadata.title;
        }
        if (result.metadata.author) {
            extractedMetadata.author = result.metadata.author;
        }
        if (result.metadata.publicationYear) {
            extractedMetadata.publicationYear = result.metadata.publicationYear;
        }
        if (result.metadata.publisher) {
            extractedMetadata.publisher = result.metadata.publisher;
        }
        if (result.metadata.language) {
            extractedMetadata.language = result.metadata.language;
        }
        if (result.metadata.summary) {
            extractedMetadata.summary = result.metadata.summary;
        }
        if (result.metadata.keywords && result.metadata.keywords.length > 0) {
            extractedMetadata.keywords = result.metadata.keywords;
        }
        if (result.metadata.releaseVersion) {
            extractedMetadata.releaseVersion = result.metadata.releaseVersion;
        }

        console.log('✅ Metadata připravena k naplnění polí:', extractedMetadata);

        return extractedMetadata;

    } catch (error) {
        console.error('❌ Chyba při inteligentní extrakci metadat:', error);
        console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : 'N/A'
        });
        throw error;
    }
};

const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};

const generateCoverFromPdf = async (fileData: ArrayBuffer): Promise<File | null> => {
    try {
        console.log('Loading PDF document, size:', fileData.byteLength, 'bytes');
        
        // Check if PDF.js is properly loaded
        if (!pdfjsLib || !pdfjsLib.getDocument) {
            console.error('PDF.js library is not properly loaded');
            return null;
        }
        
        const loadingTask = pdfjsLib.getDocument(fileData);
        console.log('PDF loading task created');
        
        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully, pages:', pdf.numPages);
        
        if (pdf.numPages === 0) {
            console.error('PDF has no pages');
            return null;
        }
        
        const page = await pdf.getPage(1); // Get the first page
        console.log('First page loaded successfully');

        const viewport = page.getViewport({ scale: 1.5 }); // Use scale for better quality
        console.log('Viewport created:', { width: viewport.width, height: viewport.height });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) {
            console.error("Could not get canvas context");
            return null;
        }

        console.log('Starting page render...');
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        console.log('Page rendered successfully to canvas');

        // Create a blob and then a file
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                if (blob) {
                    console.log('Canvas converted to blob, size:', blob.size, 'bytes');
                    const fileName = `cover-${Date.now()}.jpg`;
                    resolve(new File([blob], fileName, { type: 'image/jpeg' }));
                } else {
                    console.error('Failed to convert canvas to blob');
                    resolve(null);
                }
            }, 'image/jpeg', 0.9); // 90% quality
        });
    } catch (error) {
        console.error('Error generating cover from PDF:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return null;
    }
};

// Test function to debug PDF cover generation - can be called from browser console
(window as any).testPdfCoverGeneration = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
        console.error('Please provide a valid PDF file');
        return;
    }
    
    console.log('Testing PDF cover generation with file:', file.name);
    const buffer = await file.arrayBuffer();
    const coverFile = await generateCoverFromPdf(buffer);
    
    if (coverFile) {
        console.log('✅ Success! Generated cover:', {
            name: coverFile.name,
            type: coverFile.type,
            size: coverFile.size
        });
        
        // Create preview URL for testing
        const previewUrl = URL.createObjectURL(coverFile);
        console.log('Preview URL:', previewUrl);
        
        // Create an image element to show the result
        const img = document.createElement('img');
        img.src = previewUrl;
        img.style.maxWidth = '200px';
        img.style.border = '1px solid #ccc';
        img.style.margin = '10px';
        img.title = 'Generated PDF Cover';
        document.body.appendChild(img);
        
        return { success: true, file: coverFile, previewUrl };
    } else {
        console.error('❌ Failed to generate cover');
        return { success: false };
    }
};

// Test function to verify bucket structure - can be called from browser console
(window as any).testBucketStructure = () => {
    console.log('📁 Expected bucket structure:');
    console.log('Books bucket: book_[timestamp]_[id].pdf');
    console.log('Covers bucket: book_[timestamp]_[id].jpg');
    console.log('');
    console.log('Example:');
    console.log('Books/book_1735234567890_abc123def.pdf');
    console.log('Covers/book_1735234567890_abc123def.jpg');
    console.log('');
    console.log('Both files share the same ID for easy pairing!');
};

// Test function to check Supabase connection
(window as any).testSupabaseConnection = async () => {
    console.log('🧪 Testování připojení k Supabase...');
    console.log('URL:', supabaseUrl);
    console.log('Client:', !!supabaseClient);
    
    try {
        console.log('🔍 Začínám jednoduchý test dotaz...');
        
        const { data, error, count } = await supabaseClient
            .from('books')
            .select('id', { count: 'exact' })
            .limit(1);
        
        console.log('🔍 Test dotaz dokončen:', { data: !!data, error: !!error, count });
        
        if (error) {
            console.error('❌ Supabase connection failed:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return { success: false, error, details: 'Query returned error' };
        }
        
        console.log('✅ Supabase connection successful! Počet knih:', count);
        return { success: true, data, count, details: 'Connection OK' };
    } catch (err: any) {
        console.error('❌ Supabase connection exception:', {
            name: err.name,
            message: err.message,
            stack: err.stack?.substring(0, 200) + '...'
        });
        return { success: false, error: err, details: err.message || 'Unknown error' };
    }
};

// Test function to manually refresh books
(window as any).refreshBooks = async () => {
    console.log('🔄 Ručně obnovuji seznam knih...');
    try {
        const books = await api.getBooks();
        console.log(`✅ Načteno ${books.length} knih:`);
        if (books.length > 0) {
            console.log('Prvních 3 knihy:', books.slice(0, 3).map(b => ({ id: b.id, title: b.title })));
        }
        return books;
    } catch (err: any) {
        console.error('❌ Chyba při obnovování knih:', err);
        return null;
    }
};

// Alternativní funkce pro postupné načítání
(window as any).loadBooksSlowly = async () => {
    console.log('🐌 Postupné načítání knih...');
    try {
        // Nejdříve zkusíme jen počet
        console.log('1. Získávám počet knih...');
        const { count } = await supabaseClient
            .from('books')
            .select('*', { count: 'exact', head: true });
        
        console.log(`Počet knih v databázi: ${count}`);
        
        if (!count || count === 0) {
            console.log('⚠️ Databáze je prázdná!');
            return [];
        }
        
        // Pak načteme po menších dávkách
        console.log('2. Načítám knihy po dávkách...');
        const limit = 10;
        const allBooks: any[] = [];
        
        for (let offset = 0; offset < count; offset += limit) {
            console.log(`Načítám knihy ${offset + 1}-${Math.min(offset + limit, count)}...`);
            
            const { data, error } = await supabaseClient
                .from('books')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) {
                console.error(`Chyba při načítání dávky ${offset}:`, error);
                break;
            }
            
            if (data) {
                allBooks.push(...data);
                console.log(`✅ Načteno ${data.length} knih (celkem: ${allBooks.length})`);
            }
        }
        
        console.log(`📋 Celkem načteno: ${allBooks.length} knih`);
        return allBooks.map(mapSupabaseToBook);
        
    } catch (err: any) {
        console.error('❌ Chyba při postupném načítání:', err);
        return null;
    }
};

// Test function to check covers bucket access - can be called from browser console
(window as any).testCoversBucketAccess = async () => {
    console.log('🧪 Testing access to "covers" bucket...');
    
    // Create a test file
    const testContent = 'test';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
    
    try {
        console.log('1. Testing upload to covers bucket...');
        const { error } = await supabaseClient.storage.from('covers').upload('test-file.txt', testFile, {
            upsert: true
        });
        
        if (error) {
            console.error('❌ Upload to covers bucket failed:', error.message);
            console.error('Full error:', error);
            return { success: false, error: error.message };
        } else {
            console.log('✅ Upload to covers bucket successful!');
            
            // Test getting public URL
            console.log('2. Testing public URL from covers bucket...');
            const { data: urlData } = supabaseClient.storage.from('covers').getPublicUrl('test-file.txt');
            console.log('Public URL:', urlData.publicUrl);
            
            // Clean up test file
            console.log('3. Cleaning up test file...');
            await supabaseClient.storage.from('covers').remove(['test-file.txt']);
            console.log('✅ Test completed successfully!');
            
            return { success: true, publicUrl: urlData.publicUrl };
        }
    } catch (err: any) {
        console.error('❌ Unexpected error during covers bucket test:', err);
        return { success: false, error: err.message };
    }
};

// Gemini helper funkce byly odstraněny - už se nepoužívají



// Funkce pro získání textu z mezipaměti
const getTextFromCache = (bookId: string): string | null => {
    const cacheKey = `extracted_text_${bookId}`;
    const timestampKey = `${cacheKey}_timestamp`;
    
    const cachedText = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    
    if (cachedText && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hodin
        
        if (cacheAge < maxAge) {
            console.log('💾 Text načten z mezipaměti (věk:', Math.round(cacheAge / 1000 / 60), 'minut)');
            return cachedText;
        } else {
            console.log('⏰ Mezipaměť vypršela, mazání...');
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
        }
    }
    
    return null;
};

// Funkce pro kontrolu stavu mezipaměti
const checkCacheStatus = (bookId: string): { hasCache: boolean; size: number; age: string } => {
    const cacheKey = `extracted_text_${bookId}`;
    const timestampKey = `${cacheKey}_timestamp`;
    
    const cachedText = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    
    if (cachedText && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hodin
        
        if (cacheAge < maxAge) {
            const ageMinutes = Math.round(cacheAge / 1000 / 60);
            const ageText = ageMinutes < 60 ? `${ageMinutes} min` : `${Math.round(ageMinutes / 60)} hod`;
            
            return {
                hasCache: true,
                size: cachedText.length,
                age: ageText
            };
        }
    }
    
    return {
        hasCache: false,
        size: 0,
        age: ''
    };
};

// Funkce pro mazání mezipaměti
const clearTextCache = (bookId: string): void => {
    const cacheKey = `extracted_text_${bookId}`;
    const timestampKey = `${cacheKey}_timestamp`;
    
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
    console.log('🗑️ Mezipaměť pro knihu', bookId, 'vyčištěna');
};

// Funkce pro zobrazení všech klíčů v mezipaměti (pro debug)
(window as any).showTextCache = () => {
    console.log('🔍 STAV MEZIPAMĚTI TEXTU:');
    console.log('─'.repeat(50));
    
    const keys = Object.keys(localStorage);
    const textCacheKeys = keys.filter(key => key.startsWith('extracted_text_'));
    
    if (textCacheKeys.length === 0) {
        console.log('📭 Žádné texty v mezipaměti');
        return;
    }
    
    textCacheKeys.forEach(key => {
        const bookId = key.replace('extracted_text_', '');
        const timestampKey = `${key}_timestamp`;
        const timestamp = localStorage.getItem(timestampKey);
        
        if (timestamp) {
            const cacheAge = Date.now() - parseInt(timestamp);
            const ageMinutes = Math.round(cacheAge / 1000 / 60);
            const ageText = ageMinutes < 60 ? `${ageMinutes} min` : `${Math.round(ageMinutes / 60)} hod`;
            
            const text = localStorage.getItem(key);
            const size = text ? text.length : 0;
            
            console.log(`📖 ${bookId}: ${size} znaků (věk: ${ageText})`);
        }
    });
    
    console.log('─'.repeat(50));
};

// NOVÁ FUNKCE PRO TEST KOMUNIKACE S WEBHOOKU
const testWebhookConnection = async (): Promise<string> => {
    const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/79522dec-53ac-4f64-9253-1c5759aa8b45';
    
    try {
        console.log('📄 Odesílám binární soubor na webhook...');
        
        // Vytvoříme FormData s testovací zprávou
        const formData = new FormData();
        formData.append('test', 'ahoj');
        formData.append('message', 'Test komunikace s n8n webhook');
        formData.append('timestamp', new Date().toISOString());
        
        console.log('📤 Odesílám testovací zprávu "ahoj"...');
        
        // Odešleme testovací data na n8n webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Webhook chyba:', errorText);
            
            if (response.status === 404) {
                throw new Error(`Webhook není dostupný (404). Zkontrolujte, zda je n8n workflow aktivní a webhook zaregistrovaný. Chyba: ${errorText}`);
            }
            
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.text(); // Přijímáme jakoukoliv odpověď
        console.log('✅ Webhook odpověď:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Chyba při extrakci textu přes webhook:', error);
        throw error;
    }
};

// NOVÁ FUNKCE PRO EXTRACTION TEXTU PŘES WEBHOOK
const extractTextViaWebhook = async (book: Book): Promise<string> => {
    const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/79522dec-53ac-4f64-9253-1c5759aa8b45';
    
    try {
        console.log('🚀 Odesílám dokument na webhook pro extrakci textu...');
        console.log('📖 Kniha:', book.title);
        console.log('📁 FilePath:', book.filePath);
        
        // Stáhneme soubor z Supabase storage
        const { data: fileData, error: downloadError } = await supabaseClient.storage
            .from('Books')
            .download(book.filePath);
            
        if (downloadError || !fileData) {
            throw new Error(`Nepodařilo se stáhnout soubor: ${downloadError?.message}`);
        }
        
        console.log('📤 Odesílám binární soubor na webhook...');
        console.log('📊 Velikost souboru:', fileData.size, 'bajtů');
        
        // Vytvoříme FormData pro odeslání binárního souboru
        const formData = new FormData();
        formData.append('file', fileData, book.filePath.split('/').pop() || 'document.pdf');
        formData.append('bookId', book.id);
        formData.append('fileName', book.filePath.split('/').pop() || 'unknown.pdf');
        formData.append('fileType', book.format.toLowerCase());
        formData.append('metadata', JSON.stringify({
            title: book.title,
            author: book.author,
            publicationYear: book.publicationYear,
            language: book.language,
            releaseVersion: book.releaseVersion
        }));
        
        // Odešleme binární soubor na n8n webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData // FormData automaticky nastaví správný Content-Type s boundary
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Webhook chyba:', errorText);
            
            if (response.status === 404) {
                throw new Error(`Webhook není dostupný (404). Zkontrolujte, zda je n8n workflow aktivní a webhook zaregistrovaný. Chyba: ${errorText}`);
            }
            
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        // Nejdříve zkusíme JSON, pokud to selže, vezmeme to jako čistý text
        let extractedText;
        const responseText = await response.text();
        
        try {
            // Pokusíme se parsovat jako JSON
            const result = JSON.parse(responseText);
            console.log('✅ Webhook JSON odpověď:', result);
            
            if (result.success && result.extractedText) {
                extractedText = result.extractedText;
            } else if (result.extractedText) {
                extractedText = result.extractedText;
            } else {
                // JSON neobsahuje extractedText, použijeme celý text
                extractedText = responseText;
            }
        } catch (jsonError) {
            // Není to JSON, použijeme jako čistý text
            console.log('✅ Webhook vrátil čistý text (ne JSON):', responseText.substring(0, 200) + '...');
            extractedText = responseText;
        }
        
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Webhook vrátil prázdný text');
        }
        
        // Uložíme extrahovaný text do mezipaměti
        const cacheKey = `extracted_text_${book.id}`;
        localStorage.setItem(cacheKey, extractedText);
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        
        console.log('💾 Text uložen do mezipaměti:', extractedText.length, 'znaků');
        
        return extractedText;
        
    } catch (error) {
        console.error('❌ Chyba při extrakci textu přes webhook:', error);
        throw error;
    }
};

// NOVÁ FUNKCE PRO TEXT-ONLY EXTRACTION 2 - LOKÁLNÍ EXTRAKCE BEZ WEBHOOKU
const extractTextLocallyFromPDF = async (file: File): Promise<File> => {
    try {
        console.log('📄 Spouštím lokální extrakci textu z PDF...');
        console.log('📄 Soubor:', file.name, 'Velikost:', (file.size / 1024).toFixed(2), 'KB');
        
        // Načteme PDF jako ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Použijeme globální pdfjsLib z window
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
            throw new Error('PDF.js není načten. Zkuste obnovit stránku.');
        }
        
        console.log('📚 Načítám PDF dokument...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        console.log(`📄 PDF má ${pdf.numPages} stránek`);
        
        // Extrahujeme text ze všech stránek
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Spojíme textové položky z stránky
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            
            fullText += `\n\n--- Stránka ${pageNum} ---\n\n${pageText}`;
            
            if (pageNum % 10 === 0) {
                console.log(`📄 Zpracováno ${pageNum}/${pdf.numPages} stránek`);
            }
        }
        
        console.log('✅ Extrakce textu dokončena');
        console.log('📊 Celková délka textu:', fullText.length, 'znaků');
        
        // Vytvoříme textový soubor
        const textFileName = file.name.replace(/\.pdf$/i, '.txt');
        const textBlob = new Blob([fullText], { type: 'text/plain; charset=utf-8' });
        const textFile = new File([textBlob], textFileName, { type: 'text/plain' });
        
        console.log('✅ Vytvořen textový soubor:', {
            name: textFileName,
            size: textFile.size,
            sizeKB: (textFile.size / 1024).toFixed(2),
            type: textFile.type
        });
        
        return textFile;
        
    } catch (error) {
        console.error('❌ Chyba při lokální extrakci textu z PDF:', error);
        throw error;
    }
};

// NOVÁ FUNKCE PRO TEXT-ONLY EXTRACTION PŘES WEBHOOK (pro upload)
const extractTextOnlyViaWebhook = async (file: File): Promise<File> => {
    const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/3fac3a7f-9e76-4441-901b-1c69e339fe97';
    
    try {
        console.log('📤 Odesílám PDF na N8N webhook pro extrakci textu...');
        console.log('📄 Soubor:', file.name, 'Velikost:', (file.size / 1024).toFixed(2), 'KB');
        
        // N8N webhook očekává multipart/form-data s binárním souborem
        const formData = new FormData();
        formData.append('data', file, file.name);  // 'data' je klíč který N8N webhook očekává
        
        console.log('📤 POST request na:', webhookUrl);
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData
            // Neposíláme Content-Type header - browser ho nastaví automaticky s boundary
        });
        
        console.log('✅ Response status:', response.status);
        console.log('✅ Response ok:', response.ok);
        console.log('📋 Response headers:', {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error:', errorText);
            throw new Error(`Webhook vrátil chybu (${response.status}): ${errorText}`);
        }
        
        // N8N vrátí textový soubor jako blob
        const blob = await response.blob();
        console.log('✅ Přijat blob:', {
            size: blob.size,
            sizeKB: (blob.size / 1024).toFixed(2),
            type: blob.type
        });
        
        if (blob.size === 0) {
            throw new Error('Webhook vrátil prázdný soubor (0 bajtů). Zkontrolujte konfiguraci N8N workflow.');
        }
        
        // Pokusíme se přečíst malý vzorek obsahu pro validaci (jen pro kontrolu, malé soubory jsou OK)
        const previewSize = Math.min(100, blob.size);
        const textPreview = await blob.slice(0, previewSize).text();
        console.log('📝 Preview prvních znaků:', textPreview.substring(0, Math.min(100, textPreview.length)));
        
        // Poznámka: Malé soubory jsou v pořádku, nevalidujeme velikost
        
        // Vytvoříme File objekt s .txt příponou
        const textFileName = file.name.replace(/\.pdf$/i, '.txt');
        const textFile = new File([blob], textFileName, { type: 'text/plain' });
        
        console.log('✅ Vytvořen textový soubor:', {
            name: textFileName,
            size: textFile.size,
            sizeKB: (textFile.size / 1024).toFixed(2),
            type: textFile.type
        });
        
        return textFile;
        
    } catch (error) {
        console.error('❌ Chyba při volání N8N webhook:', error);
        throw error;
    }
};

// NOVÁ FUNKCE PRO LLM KONTEXT WEBHOOK S LIMITEM 50 STRÁNEK
const sendToLLMContextWebhook = async (book: Book): Promise<string> => {
    const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/c2d2f94f-1be3-4d68-a2ec-12f23b3580e1';
    const MAX_PAGES = 50; // Limit na 50 stránek
    
    try {
        console.log('🚀 Odesílám dokument na LLM kontext webhook s limitem', MAX_PAGES, 'stránek...');
        console.log('📖 Kniha:', book.title);
        console.log('📁 FilePath:', book.filePath);
        
        // Testujeme dostupnost PDFLib
        console.log('🔍 Testování PDFLib dostupnosti:', {
            windowPDFLib: !!window.PDFLib,
            PDFDocument: !!(window.PDFLib && window.PDFLib.PDFDocument)
        });
        
        // Stáhneme soubor ze storage
        const { data, error: downloadError } = await supabaseClient.storage
            .from("Books")
            .download(book.filePath);
        
        if (downloadError || !data) {
            throw new Error(`Nepodařilo se stáhnout soubor: ${downloadError?.message}`);
        }
        
        // Zkontrolujeme počet stránek PDF a ořežeme na 50 stránek pokud je potřeba
        let processedFileData = data;
        
        if (book.format.toLowerCase() === 'pdf') {
            console.log('📄 Kontroluji počet stránek PDF...');
            const fileBuffer = await data.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(fileBuffer);
            const pdf = await loadingTask.promise;
            
            console.log(`📊 PDF má ${pdf.numPages} stránek`);
            
            if (pdf.numPages > MAX_PAGES) {
                console.log(`✂️ PDF má více než ${MAX_PAGES} stránek, ořezávám na prvních ${MAX_PAGES} stránek...`);
                
                try {
                    // Zkusíme různé způsoby přístupu k PDFLib
                    let PDFDocument = null;
                    
                    if (window.PDFLib && window.PDFLib.PDFDocument) {
                        PDFDocument = window.PDFLib.PDFDocument;
                        console.log('📚 Používám window.PDFLib.PDFDocument');
                    } else if ((window as any).PDFLib && (window as any).PDFLib.PDFDocument) {
                        PDFDocument = (window as any).PDFLib.PDFDocument;
                        console.log('📚 Používám (window as any).PDFLib.PDFDocument');
                    } else if ((globalThis as any).PDFLib && (globalThis as any).PDFLib.PDFDocument) {
                        PDFDocument = (globalThis as any).PDFLib.PDFDocument;
                        console.log('📚 Používám globalThis.PDFLib.PDFDocument');
                    }
                    
                    if (!PDFDocument) {
                        console.warn('⚠️ PDFLib není dostupné, posílám celé PDF s upozorněním');
                        console.warn('🔍 Dostupné objekty:', Object.keys(window).filter(key => key.includes('PDF')));
                        console.log(`📤 Posílám celé PDF (${pdf.numPages} stránek) - webhook musí ořezat na ${MAX_PAGES} stránek`);
                    } else {
                        console.log('📝 Vytvářím nové PDF s prvními', MAX_PAGES, 'stránkami...');
                        
                        // Načteme původní PDF
                        const originalPdf = await PDFDocument.load(fileBuffer);
                        
                        // Vytvoříme nové PDF
                        const newPdf = await PDFDocument.create();
                        
                        // Zkopírujeme pouze prvních MAX_PAGES stránek
                        const pageIndices = Array.from({length: Math.min(MAX_PAGES, pdf.numPages)}, (_, i) => i);
                        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
                        
                        // Přidáme stránky do nového PDF
                        copiedPages.forEach((page) => newPdf.addPage(page));
                        
                        // Převedeme na bytes
                        const pdfBytes = await newPdf.save();
                        
                        // Vytvoříme nový Blob s ořezaným PDF
                        processedFileData = new Blob([pdfBytes], { type: 'application/pdf' });
                        
                        console.log(`✅ PDF úspěšně ořezáno z ${pdf.numPages} na ${MAX_PAGES} stránek`);
                        console.log(`📦 Nová velikost: ${Math.round(processedFileData.size / 1024)} KB (původní: ${Math.round(data.size / 1024)} KB)`);
                    }
                } catch (trimError) {
                    console.error('❌ Chyba při ořezávání PDF pomocí PDFLib:', trimError);
                    console.log(`⚠️ Pokusím se o alternativní řešení...`);
                    
                    // Alternativní řešení: informujeme webhook o nutnosti ořezání
                    console.log(`⚠️ Posílám celé PDF s explicitní instrukcí pro ořezání na ${MAX_PAGES} stránek`);
                    
                    // Přidáme flag do FormData později, že PDF nebylo ořezáno na frontendu
                    (processedFileData as any).__needsTrimming = true;
                    (processedFileData as any).__originalPages = pdf.numPages;
                }
            } else {
                console.log(`✅ PDF má ${pdf.numPages} stránek, což je v limitu ${MAX_PAGES} stránek`);
            }
        }
        
        // Zjistíme aktuální počet stránek pro metadata
        let actualPages = MAX_PAGES;
        if (book.format.toLowerCase() === 'pdf') {
            try {
                const checkBuffer = await processedFileData.arrayBuffer();
                const checkTask = pdfjsLib.getDocument(checkBuffer);
                const checkPdf = await checkTask.promise;
                actualPages = checkPdf.numPages;
                console.log(`📋 Skutečný počet stránek v odesílaném PDF: ${actualPages}`);
            } catch (e) {
                console.warn('⚠️ Nepodařilo se zjistit počet stránek ořezaného PDF, používám MAX_PAGES');
            }
        }
        
        console.log('📤 Odesílám soubor na LLM kontext webhook...');
        console.log('📊 Velikost souboru:', processedFileData.size, 'bajtů');
        console.log('🌐 Webhook URL:', webhookUrl);
        
        // Vytvoříme FormData pro odeslání binárního souboru
        const formData = new FormData();
        formData.append('file', processedFileData, book.filePath.split('/').pop() || 'document.pdf');
        formData.append('bookId', book.id);
        formData.append('fileName', book.filePath.split('/').pop() || 'unknown.pdf');
        formData.append('fileType', book.format.toLowerCase());
        formData.append('maxPages', MAX_PAGES.toString());
        formData.append('actualPages', actualPages.toString());
        formData.append('isLLMContext', 'true');
        
        // Přidáme informaci o tom, jestli PDF bylo ořezáno nebo potřebuje ořezání
        const needsTrimming = (processedFileData as any).__needsTrimming || false;
        const originalPages = (processedFileData as any).__originalPages || actualPages;
        formData.append('needsTrimming', needsTrimming.toString());
        formData.append('originalPages', originalPages.toString());
        formData.append('metadata', JSON.stringify({
            title: book.title,
            author: book.author,
            publicationYear: book.publicationYear,
            language: book.language,
            releaseVersion: book.releaseVersion,
            requestedMaxPages: MAX_PAGES,
            actualPages: actualPages
        }));
        
        console.log('📋 FormData obsahuje:', {
            fileName: book.filePath.split('/').pop(),
            bookId: book.id,
            fileType: book.format.toLowerCase(),
            maxPages: MAX_PAGES,
            actualPages: actualPages,
            needsTrimming: needsTrimming,
            originalPages: originalPages,
            isLLMContext: true
        });
        
        // Odešleme soubor na LLM kontext webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData // FormData automaticky nastaví správný Content-Type s boundary
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ LLM kontext webhook chyba:', errorText);
            
            if (response.status === 404) {
                throw new Error(`LLM kontext webhook není dostupný (404). Zkontrolujte, zda je n8n workflow aktivní a webhook zaregistrovaný. Chyba: ${errorText}`);
            }
            
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.text();
        console.log('✅ LLM kontext webhook odpověď:', result.length, 'znaků');
        
        // Uložíme extrahovaný text do mezipaměti (přepíše stávající OCR text)
        const cacheKey = `extracted_text_${book.id}`;
        localStorage.setItem(cacheKey, result);
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        
        console.log('💾 LLM kontext text uložen do mezipaměti a přepsal stávající OCR:', result.length, 'znaků');
        
        return result;
        
    } catch (error) {
        console.error('❌ Chyba při odesílání na LLM kontext webhook:', error);
        throw error;
    }
};

// --- COMPONENTS ---

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
const Modal = ({ isOpen, onClose, title, children }: ModalProps): React.ReactNode => {
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3>{title}</h3>
                    <button style={styles.modalCloseButton} onClick={onClose}><IconClose /></button>
                </div>
                <div style={styles.modalBody}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const TagSelector = ({ selectedTags, allTags, onChange, onAddNewTag, onDeleteTag, promptText, creationText }: {selectedTags: string[], allTags: string[], onChange: (tags: string[]) => void, onAddNewTag: (tag: string) => void, onDeleteTag?: (tag: string) => void, promptText: string, creationText: string}) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [newTagValue, setNewTagValue] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; tag: string | null }>({ isOpen: false, tag: null });
    const availableTags = allTags.filter(t => !selectedTags.includes(t));
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleRemoveTag = (tagToRemove: string) => {
        onChange(selectedTags.filter(t => t !== tagToRemove));
    };

    const handleAddTag = (tagToAdd: string) => {
        if (!selectedTags.includes(tagToAdd)) {
            onChange([...selectedTags, tagToAdd]);
        }
        setDropdownOpen(false);
    };

    const handleOpenAddModal = () => {
        setDropdownOpen(false);
        setNewTagValue('');
        setAddModalOpen(true);
    };

    const handleCreateNewTag = () => {
        const trimmedName = newTagValue.trim();
        if (trimmedName) {
            onAddNewTag(trimmedName);
            if (!selectedTags.includes(trimmedName)) {
                onChange([...selectedTags, trimmedName]);
            }
        }
        setAddModalOpen(false);
        setNewTagValue('');
    };

    const handleDeleteTag = (tagToDelete: string) => {
        setDeleteConfirmation({ isOpen: true, tag: tagToDelete });
        setDropdownOpen(false);
        setIsManageModalOpen(false);
    };

    const confirmDeleteTag = () => {
        if (deleteConfirmation.tag && onDeleteTag) {
            onDeleteTag(deleteConfirmation.tag);
        }
        setDeleteConfirmation({ isOpen: false, tag: null });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div style={styles.tagInputContainer}>
                    {selectedTags.map(tag => (
                        <span key={tag} style={{...styles.tag, display: 'flex', alignItems: 'center' }}>
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} style={styles.tagRemoveButton}>&times;</button>
                        </span>
                    ))}
                     <button onClick={() => setDropdownOpen(o => !o)} style={styles.tagInputAddButton}>
                        <IconAdd/> Přidat
                    </button>
                </div>
                {isDropdownOpen && (
                    <div style={styles.tagDropdown}>
                        {availableTags.map(tag => (
                            <a key={tag} onClick={() => handleAddTag(tag)} style={styles.dropdownMenuLink}>{tag}</a>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }}></div>
                        <a onClick={handleOpenAddModal} style={{...styles.dropdownMenuLink, ...styles.addNewTagLink}}>
                            <IconAdd/> {creationText}
                        </a>
                        {onDeleteTag && allTags.length > 0 && (
                            <a onClick={() => { setDropdownOpen(false); setIsManageModalOpen(true); }} style={{...styles.dropdownMenuLink, color: 'var(--danger-color)'}}>
                                <IconDelete size={14}/> Spravovat položky
                            </a>
                        )}
                    </div>
                )}
            </div>
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
                title={promptText}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        value={newTagValue}
                        onChange={(e) => setNewTagValue(e.target.value)}
                        style={styles.input}
                        placeholder="Zadejte název..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNewTag(); }}
                        autoFocus
                    />
                    <button onClick={handleCreateNewTag} style={{ ...styles.button, alignSelf: 'flex-end' }}>
                        <IconAdd/> Přidat
                    </button>
                </div>
            </Modal>
            <Modal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                title="Spravovat položky"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                    <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)', margin: 0 }}>
                        Kliknutím na položku ji smazáte ze systému. Tato akce je nevratná.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {allTags.map(tag => (
                            <div key={tag} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--surface)'
                            }}>
                                <span style={{ flex: 1 }}>{tag}</span>
                                <button 
                                    onClick={() => handleDeleteTag(tag)} 
                                    style={{
                                        background: 'var(--danger-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title={`Smazat ${tag}`}
                                >
                                    <IconDelete size={12}/> Smazat
                                </button>
                            </div>
                        ))}
                        {allTags.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '20px 0' }}>
                                Žádné položky k zobrazení.
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, tag: null })}
                title="Potvrzení smazání"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p>Opravdu chcete smazat položku "{deleteConfirmation.tag}"?</p>
                    <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                        Tato akce je nevratná. Položka bude odebrána ze všech knih.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={() => setDeleteConfirmation({ isOpen: false, tag: null })} 
                            style={{ ...styles.button, background: 'var(--surface)', color: 'var(--text)' }}
                        >
                            Zrušit
                        </button>
                        <button 
                            onClick={confirmDeleteTag} 
                            style={{ ...styles.button, background: 'var(--danger-color)', color: 'white' }}
                        >
                            <IconDelete size={16}/> Smazat
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

const App = ({ currentUser }: { currentUser: User }) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isUserManagementOpen, setUserManagementOpen] = useState(false);
    const [isProfileSettingsOpen, setProfileSettingsOpen] = useState(false);
    
    // Filters
    const [filter, setFilter] = useState('');
    const [labelFilter, setLabelFilter] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [langFilter, setLangFilter] = useState<string[]>([]);
    const [versionFilter, setVersionFilter] = useState<string[]>([]);

    const [vdbFilter, setVdbFilter] = useState<'all' | 'success' | 'error' | 'pending'>('all');
    const [yearRange, setYearRange] = useState<{from: number|null, to: number|null}>({from: null, to: null});
    const [dateAddedRange, setDateAddedRange] = useState({ from: 0, to: 0 });

    // Modals
    const [isConvertModalOpen, setConvertModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; book: Book | null }>({ isOpen: false, book: null });
    const [isBulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [bulkVectorUpload, setBulkVectorUpload] = useState<{
        isOpen: boolean;
        isRunning: boolean;
        current: number;
        total: number;
        currentBookTitle: string;
        results: { bookId: string; title: string; success: boolean; message: string }[];
        isDone: boolean;
        mode: 'selection' | 'processing'; // 'selection' = vybírá typ, 'processing' = běží nahrávání
        uploadType: 'pdf' | 'text' | 'metadata' | null; // Typ nahrávání
        selectedBooks: Book[]; // Knihy které se nahrávají
    }>({ isOpen: false, isRunning: false, current: 0, total: 0, currentBookTitle: '', results: [], isDone: false, mode: 'selection', uploadType: null, selectedBooks: [] });
    const [vectorDbConfirmation, setVectorDbConfirmation] = useState<{ isOpen: boolean; book: Book | null; missingFields: string[] }>({ isOpen: false, book: null, missingFields: [] });
    const [largePdfWarning, setLargePdfWarning] = useState<{ isOpen: boolean; book: Book | null; pageCount: number }>({ isOpen: false, book: null, pageCount: 0 });
    const [vectorProcessingBooks, setVectorProcessingBooks] = useState<Set<string>>(new Set()); // Sleduje, které knihy se právě zpracovávají
    const [isChatbotManagementOpen, setChatbotManagementOpen] = useState(false);
    const [activeChatbot, setActiveChatbot] = useState<{id: string, features: any} | null>(null);
    const [isAddVideoModalOpen, setAddVideoModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [isVideoUploading, setIsVideoUploading] = useState(false);
    
    // Upload processing modal
    const [isUploadProcessingModalOpen, setUploadProcessingModalOpen] = useState(false);
    const [uploadOptions, setUploadOptions] = useState({ performOCR: false, performCompression: false, textOnly: false, textOnly2: false });
    const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
    const [selectedOCRLanguage, setSelectedOCRLanguage] = useState<string>('Angličtina');
    const [selectedCompressionLevel, setSelectedCompressionLevel] = useState<string>('recommended');
    
    const [allLabels, setAllLabels] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>(['Aromaterapie', 'Masáže', 'Akupunktura', 'Diagnostika']);
    const [allPublicationTypes, setAllPublicationTypes] = useState<string[]>(['public', 'students', 'internal_bewit']);
    const [allVersions, setAllVersions] = useState<string[]>([]); // Všechny verze vydání nalezené v knihách
    const [allLanguages, setAllLanguages] = useState<string[]>([]); // Pro filtraci (pouze používané jazyky)
    const [allAvailableLanguages, setAllAvailableLanguages] = useState<string[]>([]); // Všechny jazyky z databáze pro dropdown
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        
        // Načteme všechna data paralelně
        Promise.all([
            api.getBooks(),
            api.getLabels(),
            api.getCategories(),
            api.getLanguages(),
            api.getPublicationTypes()
        ]).then(([books, labels, categories, allLanguagesFromDB, publicationTypes]) => {
            if (!isMounted) {
                return;
            }
            
            setBooks(books);
            setAllLabels(labels);
            setAllCategories(categories);
            setAllAvailableLanguages(allLanguagesFromDB); // Všechny jazyky z databáze pro dropdown
            setAllPublicationTypes(publicationTypes);
            
            // Pro filtraci zobrazíme pouze jazyky, které mají přiřazené nějaké knihy
            const usedLanguages = new Set<string>();
            const usedVersions = new Set<string>();
            books.forEach(book => {
                if (book.language) {
                    usedLanguages.add(book.language);
                }
                if (book.releaseVersion && book.releaseVersion.trim() !== '') {
                    usedVersions.add(book.releaseVersion.trim());
                }
            });
            
            // Odfiltrujeme duplicity a seřadíme
            const uniqueUsedLanguages = Array.from(usedLanguages).sort();
            const uniqueUsedVersions = Array.from(usedVersions).sort();
            setAllLanguages(uniqueUsedLanguages);
            setAllVersions(uniqueUsedVersions);
            
            if (books.length > 0 && !selectedBookId) {
                setSelectedBookId(books[0].id);
            }
        }).catch(err => {
            if (!isMounted) {
                console.log('⚠️ Chyba v odmountované komponentě, ignoruji');
                return;
            }
            
            console.error("❌ KRITICKÁ CHYBA - Failed to fetch data:", err.message, err);
            console.error("🔍 Detaily chyby:", {
                name: err.name,
                message: err.message,
                stack: err.stack,
                supabaseUrl,
                timestamp: new Date().toISOString()
            });
            
            // Zkusíme test připojení k Supabase
            console.log('🧪 Testuji připojení k Supabase...');
            supabaseClient.from('books').select('count').then(testResult => {
                console.log('✅ Test připojení úspěšný:', testResult);
            }, testErr => {
                console.error('❌ Test připojení selhal:', testErr);
            });
            
            alert(`Nepodařilo se načíst data z databáze: ${err.message}\n\nZkontrolujte konzoli pro více detailů.`);
        }).finally(() => {
            if (isMounted) {
                console.log('🏁 Načítání dokončeno, nastavuji isLoading na false');
                setIsLoading(false);
            }
        });
        
        return () => {
            isMounted = false;
        };
    }, []);
    
    const availableMonths = useMemo(() => {
        if (books.length === 0) return [];
        const monthSet = new Set<string>();
        books.forEach(b => {
            const d = new Date(b.dateAdded);
            monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(monthSet).sort();
    }, [books]);

    useEffect(() => {
        if (availableMonths.length > 0) {
            setDateAddedRange({ from: 0, to: availableMonths.length - 1 });
        }
    }, [availableMonths]);

    // Funkce pro automatické extrahování metadat z dokumentů
    const extractMetadataFromFile = async (file: File): Promise<Partial<Book>> => {
        console.log('🔍 extractMetadataFromFile - typ souboru:', file.type, 'název:', file.name);
        try {
            if (file.type === 'application/pdf') {
                console.log('📄 Zpracovávám PDF soubor...');
                const result = await extractPdfMetadata(file);
                console.log('📄 PDF metadata extrahována');
                return result;
            } else if (file.name.toLowerCase().endsWith('.epub')) {
                console.log('📚 Zpracovávám EPUB soubor...');
                const result = await extractEpubMetadata(file);
                console.log('📚 EPUB metadata extrahována');
                return result;
            }
            // Pro ostatní formáty vrátíme základní info z názvu souboru
            console.log('📝 Zpracovávám textový formát');
            return {
                title: file.name.replace(/\.[^/.]+$/, ""),
                releaseVersion: '',
                format: file.name.split('.').pop()?.toUpperCase() || 'N/A'
            };
        } catch (error) {
            console.error("❌ Chyba při extrakci metadat:", error);
            return {
                title: file.name.replace(/\.[^/.]+$/, ""),
                releaseVersion: '',
                format: file.name.split('.').pop()?.toUpperCase() || 'N/A'
            };
        }
    };

    const extractPdfMetadata = async (file: File): Promise<Partial<Book>> => {
        try {
            const fileBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(fileBuffer);
            const pdf = await loadingTask.promise;
            
            const metadata = await pdf.getMetadata();
            const info = metadata.info;
            
            // Název souboru = název knihy (dle požadavku)
            const bookTitle = file.name.replace(/\.[^/.]+$/, "");
            
            // Filtrování nakladatelství - vyloučíme software nástroje
            const filterPublisher = (publisher: string): string => {
                if (!publisher || publisher.trim() === '') return '';
                const publisherLower = publisher.toLowerCase();
                
                // Vyloučíme běžné encoding software nástroje
                const excludedTerms = [
                    'encoding software', 'pdf creator', 'microsoft word', 'libreoffice',
                    'openoffice', 'adobe acrobat', 'pdfmaker', 'ghostscript', 'latex',
                    'tex', 'pdflatex', 'xelatex', 'pandoc', 'prince xml', 'weasyprint'
                ];
                
                if (excludedTerms.some(term => publisherLower.includes(term))) {
                    return '';
                }
                
                return publisher.trim();
            };
            
            // OCR detekce se nyní provádí po uploadu ze storage

            return {
                title: bookTitle,
                author: (info as any)?.Author && (info as any).Author.trim() !== '' ? (info as any).Author : 'Neznámý',
                publisher: filterPublisher((info as any)?.Producer || ''),
                publicationYear: (info as any)?.CreationDate ? extractYearFromDate((info as any).CreationDate) : null,
                language: detectLanguageFromMetadata((info as any)?.Language) || 'Neznámý',
                releaseVersion: '', // Bude vyplněno až AI generováním
                format: 'PDF'
            };
        } catch (error) {
            console.error("Failed to extract PDF metadata:", error);
            return {
                title: file.name.replace(/\.[^/.]+$/, ""),
                author: 'Neznámý',
                language: 'Neznámý',
                releaseVersion: '',
                format: 'PDF'
            };
        }
    };

    const extractEpubMetadata = async (file: File): Promise<Partial<Book>> => {
        // Pro EPUB bychom potřebovali speciální knihovnu
        // Zatím vrátíme základní info
        return {
            title: file.name.replace(/\.[^/.]+$/, ""),
            author: 'Neznámý',
            language: 'Neznámý',
            releaseVersion: '',
            format: 'EPUB'
        };
    };

    const extractYearFromDate = (dateString: string): number | null => {
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            return year > 1900 && year <= new Date().getFullYear() ? year : null;
        } catch {
            return null;
        }
    };

    const detectLanguageFromMetadata = (lang?: string): string => {
        if (!lang || lang.trim() === '') return 'Neznámý';
        const langLower = lang.toLowerCase();
        if (langLower.includes('cs') || langLower.includes('czech') || langLower.includes('čeština')) return 'Čeština';
        if (langLower.includes('en') || langLower.includes('english') || langLower.includes('angličtina')) return 'Angličtina';
        if (langLower.includes('sk') || langLower.includes('slovak') || langLower.includes('slovenština')) return 'Slovenština';
        if (langLower.includes('de') || langLower.includes('german') || langLower.includes('němčina')) return 'Němčina';
        if (langLower.includes('fr') || langLower.includes('french') || langLower.includes('francouzština')) return 'Francouzština';
        if (langLower.includes('es') || langLower.includes('spanish') || langLower.includes('španělština')) return 'Španělština';
        return lang;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Pro PDF soubory zobrazíme modal s možnostmi zpracování
        if (file.type === 'application/pdf') {
            setPendingUploadFile(file);
            setUploadOptions({ performOCR: false, performCompression: false, textOnly: false, textOnly2: false });
            
            // Pokusíme se detekovat jazyk z názvu souboru a nastavit nejlepší shodu
            const extractedMetadata = await extractMetadataFromFile(file);
            const detectedLanguage = extractedMetadata.language || 'Neznámý';
            const bestLanguageMatch = ILovePDFService.getBestLanguageMatch(detectedLanguage);
            setSelectedOCRLanguage(bestLanguageMatch);
            
            setUploadProcessingModalOpen(true);
            return;
        }

        // Pro ostatní formáty pokračujeme přímo s uplodem
        await processFileUpload(file, { performOCR: false, performCompression: false, textOnly: false, textOnly2: false }, 'Angličtina');
    };

    const processFileUpload = async (file: File, options: { performOCR: boolean; performCompression: boolean; textOnly: boolean; textOnly2: boolean }, ocrLanguage: string, compressionLevel: string = 'recommended') => {
        setIsLoading(true);
        try {
            // 1. Extract metadata from the file FIRST
            const extractedMetadata = await extractMetadataFromFile(file);
            console.log('📊 Extrahovaná metadata:', {
                title: extractedMetadata.title,
                hasOCR: extractedMetadata.hasOCR,
                format: extractedMetadata.format
            });
            
            // 2. Zpracovat soubor - buď textOnly, textOnly2 nebo iLovePDF
            let finalFile = file;
            let hasOCRAfterProcessing = extractedMetadata.hasOCR;
            
            // 2a. Text-only režim - extrahovat pouze text přes webhook
            if (file.type === 'application/pdf' && options.textOnly) {
                console.log('📄 Spouštím text-only extrakci přes N8N webhook...');
                
                try {
                    finalFile = await extractTextOnlyViaWebhook(file);
                    hasOCRAfterProcessing = true; // Textový soubor má "OCR" (extrahovaný text)
                    console.log('✅ Text-only extrakce dokončena:', finalFile.name);
                } catch (textOnlyError: any) {
                    console.error('❌ Text-only extrakce selhala:', textOnlyError.message);
                    
                    const dialogMessage = [
                        `Extrakce textu pomocí N8N webhook se nezdařila:`,
                        ``,
                        `${textOnlyError.message}`,
                        ``,
                        `Můžete:`,
                        `• ZRUŠIT nahrání a zkusit to později`,
                        `• POKRAČOVAT a nahrát původní PDF bez extrakce`,
                        ``,
                        `Chcete pokračovat s nahráním PDF bez extrakce textu?`
                    ].join('\n');
                    
                    const userWantsToContinue = confirm(dialogMessage);
                    
                    if (!userWantsToContinue) {
                        throw new Error(`Upload zrušen uživatelem. Původní chyba: ${textOnlyError.message}`);
                    }
                    
                    console.log('📁 Pokračuji s nahráváním původního PDF...');
                    alert(`✅ Pokračuji s nahráním PDF\n\nSoubor bude nahrán jako PDF bez extrakce textu.\nExtrakci můžete zkusit později.`);
                    
                    // finalFile zůstává původní PDF
                    hasOCRAfterProcessing = extractedMetadata.hasOCR;
                }
            }
            // 2b. Text-only 2 režim - lokální extrakce textu bez webhooku
            else if (file.type === 'application/pdf' && options.textOnly2) {
                console.log('📄 Spouštím lokální text-only 2 extrakci...');
                
                try {
                    finalFile = await extractTextLocallyFromPDF(file);
                    hasOCRAfterProcessing = true; // Textový soubor má "OCR" (extrahovaný text)
                    console.log('✅ Text-only 2 extrakce dokončena:', finalFile.name);
                } catch (textOnly2Error: any) {
                    console.error('❌ Text-only 2 extrakce selhala:', textOnly2Error.message);
                    
                    const dialogMessage = [
                        `Lokální extrakce textu se nezdařila:`,
                        ``,
                        `${textOnly2Error.message}`,
                        ``,
                        `Můžete:`,
                        `• ZRUŠIT nahrání a zkusit to později`,
                        `• POKRAČOVAT a nahrát původní PDF bez extrakce`,
                        ``,
                        `Chcete pokračovat s nahráním PDF bez extrakce textu?`
                    ].join('\n');
                    
                    const userWantsToContinue = confirm(dialogMessage);
                    
                    if (!userWantsToContinue) {
                        throw new Error(`Upload zrušen uživatelem. Původní chyba: ${textOnly2Error.message}`);
                    }
                    
                    console.log('📁 Pokračuji s nahráváním původního PDF...');
                    alert(`✅ Pokračuji s nahráním PDF\n\nSoubor bude nahrán jako PDF bez extrakce textu.\nExtrakci můžete zkusit později.`);
                    
                    // finalFile zůstává původní PDF
                    hasOCRAfterProcessing = extractedMetadata.hasOCR;
                }
            }
            // 2b. iLovePDF zpracování (OCR/komprese)
            else if (file.type === 'application/pdf' && (options.performOCR || options.performCompression)) {
                const operationsText = [];
                if (options.performOCR) operationsText.push('OCR');
                if (options.performCompression) operationsText.push('komprese');
                
                console.log(`🔄 Spouštím zpracování pomocí iLovePDF (${operationsText.join(' + ')})...`);
                
                try {
                    if (options.performOCR && options.performCompression) {
                        // Nové kombinované zpracování: NEJDŘÍVE OCR, pak komprese
                        console.log('🔄 Spouštím dvoustupňové zpracování: OCR → Komprese...');
                        
                        const result = await ILovePDFService.processWithOCRThenCompression(
                            file, 
                            ocrLanguage, 
                            compressionLevel,
                            (step, progress) => {
                                console.log(`📊 ${step} (${progress}%)`);
                            }
                        );
                        
                        // Použijeme finální komprimovaný soubor (který už má OCR)
                        finalFile = result.compressedFile;
                        hasOCRAfterProcessing = true;
                        console.log(`✅ Dvoustupňové zpracování dokončeno (OCR + komprese)`);
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
                    console.error('❌ iLovePDF zpracování selhalo:', ilovepdfError.message);
                    
                    // Standardní error handling pro iLovePDF chyby
                    const operationsText = [];
                    if (options.performOCR) operationsText.push('OCR rozpoznání textu');
                    if (options.performCompression) operationsText.push('komprese souboru');
                    
                    const dialogMessage = [
                        `Zpracování pomocí iLovePDF se nezdařilo:`,
                        ``,
                        `${ilovepdfError.message}`,
                        ``,
                        `Zvolené operace: ${operationsText.join(' a ')}`,
                        ``,
                        `Můžete:`,
                        `• ZRUŠIT nahrání a zkusit to později`,
                        `• POKRAČOVAT a nahrát soubor bez zpracování`,
                        ``,
                        `Chcete pokračovat s nahráním bez zpracování?`
                    ].join('\n');
                    
                    const userWantsToContinue = confirm(dialogMessage);
                    
                    if (!userWantsToContinue) {
                        throw new Error(`Upload zrušen uživatelem. Původní chyba: ${ilovepdfError.message}`);
                    }
                    
                    console.log('📁 Pokračuji s nahráváním bez iLovePDF zpracování...');
                    console.log(`ℹ️  Soubor bude nahrán s původními metadaty bez ${operationsText.join(' a ')}`);
                    
                    // Zobrazíme uživatelskou zprávu o tom, že pokračujeme s fallback
                    alert(`✅ Pokračuji s nahráním bez zpracování\n\nSoubor bude nahrán s původními metadaty.\nZpracování ${operationsText.join(' a ')} můžete zkusit později.`);
                    
                    // finalFile zůstává původní soubor
                    // hasOCRAfterProcessing zůstává false pro komprese, původní hodnota pro OCR
                    if (!options.performOCR) {
                        hasOCRAfterProcessing = extractedMetadata.hasOCR;
                    }
                }
            }
            
            // 3. Generate unique ID for this book (will be used for both book and cover)
            const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 4. Upload the processed book file with the unique ID
            console.log(`📊 Velikost souboru před nahráním: ${(finalFile.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`📄 Název souboru: ${finalFile.name}`);
            console.log(`📋 Typ souboru: ${finalFile.type}`);
            
            const { filePath, fileSize } = await api.uploadFileWithId(finalFile, 'Books', bookId);

            // 5. Určit formát souboru PŘED generováním coveru
            const bookFormat = (options.textOnly || options.textOnly2) && finalFile.name.endsWith('.txt')
                ? 'TXT'
                : (extractedMetadata.format || file.name.split('.').pop()?.toUpperCase() || 'N/A');

            // 6. Generate and upload cover if it's a PDF.
            let coverImageUrl = `https://placehold.co/150x225/f3eee8/4a4a4a?text=${bookFormat}`;
            if (finalFile.type === 'application/pdf') {
                try {
                    console.log('Starting PDF cover generation...');
                    const fileBuffer = await finalFile.arrayBuffer();
                    console.log('PDF file buffer created, size:', fileBuffer.byteLength);
                    
                    const coverImageFile = await generateCoverFromPdf(fileBuffer);
                    console.log('Cover generation result:', coverImageFile ? 'Success' : 'Failed');
    
                    if (coverImageFile) {
                        console.log('Generated cover file:', {
                            name: coverImageFile.name,
                            type: coverImageFile.type,
                            size: coverImageFile.size
                        });
                        
                        // Upload cover to 'covers' bucket with the same ID as the book
                        console.log('🚀 Attempting to upload cover to "covers" bucket...');
                        console.log('Cover file details:', {
                            name: coverImageFile.name,
                            type: coverImageFile.type,
                            size: coverImageFile.size,
                            bookId: bookId
                        });
                        
                        try {
                            const coverResult = await api.uploadFileWithId(coverImageFile, 'covers', bookId);
                            console.log('✅ Successfully uploaded to covers bucket:', coverResult.filePath);
                            
                            // Get public URL from covers bucket
                            const { data: publicUrlData } = supabaseClient.storage.from('covers').getPublicUrl(coverResult.filePath);
                            
                            if (publicUrlData && publicUrlData.publicUrl) {
                                coverImageUrl = publicUrlData.publicUrl;
                                console.log('✅ Successfully got public URL from covers bucket:', coverImageUrl);
                            } else {
                                console.warn(`❌ Cover was uploaded to ${coverResult.filePath}, but could not get a public URL.`);
                            }
                        } catch (uploadError: any) {
                            console.error('❌ FAILED to upload to covers bucket:', uploadError.message);
                            console.error('Full upload error:', uploadError);
                            
                            // FALLBACK: Upload to Books bucket in covers/ subfolder
                            console.log('🔄 Trying fallback: uploading to Books bucket in covers/ subfolder...');
                            try {
                                const fallbackCoverResult = await api.uploadFileWithId(coverImageFile, 'Books', `covers/${bookId}`);
                                console.log('✅ Fallback successful - uploaded to Books/covers/:', fallbackCoverResult.filePath);
                                
                                // Get public URL from Books bucket
                                const { data: fallbackUrlData } = supabaseClient.storage.from('Books').getPublicUrl(fallbackCoverResult.filePath);
                                
                                if (fallbackUrlData && fallbackUrlData.publicUrl) {
                                    coverImageUrl = fallbackUrlData.publicUrl;
                                    console.log('✅ Successfully got public URL from Books bucket:', coverImageUrl);
                                } else {
                                    console.warn(`❌ Cover was uploaded to ${fallbackCoverResult.filePath}, but could not get a public URL.`);
                                }
                            } catch (fallbackError: any) {
                                console.error('❌ FALLBACK ALSO FAILED:', fallbackError.message);
                                console.error('Proceeding with placeholder image');
                                // Keep the placeholder URL in this case
                            }
                        }
                    } else {
                        console.error('generateCoverFromPdf returned null');
                    }
                } catch (coverError: any) {
                    console.error("Failed to process cover image, proceeding with placeholder. Error:", coverError.message);
                    console.error("Full error:", coverError);
                    // If cover upload fails, we still continue with the book upload
                }
            }

            // 7. Create book record with extracted metadata
            // bookFormat už byl určen výše (před generováním coveru)
            
            const newBookData: Omit<Book, 'id' | 'dateAdded' | 'content'> = {
                title: extractedMetadata.title || file.name.replace(/\.[^/.]+$/, ""),
                author: extractedMetadata.author || 'Neznámý',
                publicationYear: extractedMetadata.publicationYear || null,
                publisher: extractedMetadata.publisher || '',
                summary: extractedMetadata.summary || '',
                keywords: extractedMetadata.keywords || [],
                language: extractedMetadata.language || 'Neznámý',
                format: bookFormat,
                fileSize: fileSize,
                coverImageUrl: coverImageUrl,
                publicationTypes: extractedMetadata.publicationTypes || [],
                labels: extractedMetadata.labels || [],
                categories: extractedMetadata.categories || [],
                releaseVersion: extractedMetadata.releaseVersion || '',
                filePath: filePath,
                vectorStatus: 'pending',
                hasOCR: hasOCRAfterProcessing || false,
            };
            
            console.log('📚 Vytvářím knihu s předběžným OCR stavem:', newBookData.hasOCR);
            const createdBook = await api.createBook(newBookData);
            console.log('✅ Kniha vytvořena, nyní detekuji skutečný OCR stav...');

            // 6. Pokud jsme neprovádeli OCR pomocí iLovePDF a není to textOnly nebo textOnly2, detekujeme OCR ze storage
            if (!options.performOCR && !options.textOnly && !options.textOnly2) {
                try {
                    const realOCRStatus = await api.detectOCRFromStorage(filePath);
                    console.log('🔍 Skutečný OCR stav:', realOCRStatus);
                    
                    if (realOCRStatus !== createdBook.hasOCR) {
                        console.log('📝 Aktualizuji OCR stav v databázi...');
                        const updatedBook = await api.updateBook({
                            ...createdBook,
                            hasOCR: realOCRStatus
                        });
                        console.log('✅ OCR stav aktualizován:', updatedBook.hasOCR);
                        
                        // Aktualizujeme lokální stav
                        const finalBooks = [updatedBook, ...books];
                        setBooks(finalBooks);
                    } else {
                        // OCR stav se nezměnil, použijeme původní seznam
                        const finalBooks = [createdBook, ...books];
                        setBooks(finalBooks);
                    }
                } catch (ocrError) {
                    console.error('❌ Chyba při detekci OCR:', ocrError);
                    // Pokud detekce OCR selže, pokračujeme s původní knihou
                    const finalBooks = [createdBook, ...books];
                    setBooks(finalBooks);
                }
            } else {
                // OCR jsme provedli pomocí iLovePDF, takže již víme správný stav
                const finalBooks = [createdBook, ...books];
                setBooks(finalBooks);
            }

            // Reset filters to ensure the new book is visible
            setFilter(''); 
            setLabelFilter([]); 
            setCategoryFilter([]); 
            setTypeFilter([]); 
            setLangFilter([]);

            setVdbFilter('all');
            setYearRange({ from: null, to: null });
            
            // availableMonths se přepočítá automaticky díky useMemo závislosti na books
            
            // Nastavíme ID nové knihy jako vybranou
            setSelectedBookId(createdBook.id);

        } catch (error: any) {
            console.error("Failed to upload book:", error.message, error);
            alert(`Nahrání knihy se nezdařilo: ${error.message}`);
        } finally {
            setIsLoading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleUploadProcessingConfirm = async () => {
        if (!pendingUploadFile) return;
        
        setUploadProcessingModalOpen(false);
        await processFileUpload(pendingUploadFile, uploadOptions, selectedOCRLanguage, selectedCompressionLevel);
        setPendingUploadFile(null);
    };

    const handleUploadProcessingCancel = () => {
        setUploadProcessingModalOpen(false);
        setPendingUploadFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUpdateBook = (updatedBook: Book) => {
        const originalBooks = [...books];
        setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
        
        const newLabels = new Set(allLabels);
        updatedBook.labels.forEach(t => newLabels.add(t));
        setAllLabels(Array.from(newLabels).sort());

        const newCategories = new Set(allCategories);
        updatedBook.categories.forEach(c => newCategories.add(c));
        setAllCategories(Array.from(newCategories).sort());

        const newPubTypes = new Set(allPublicationTypes);
        updatedBook.publicationTypes.forEach(t => newPubTypes.add(t));
        setAllPublicationTypes(Array.from(newPubTypes).sort());

        api.updateBook(updatedBook).catch((error: any) => {
            console.error("Failed to update book:", error.message, error);
            alert(`Uložení změn se nezdařilo: ${error.message}`);
            setBooks(originalBooks); // Rollback on error
        });
    };

    const handleDeleteBook = (bookId: string) => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            setDeleteConfirmation({ isOpen: true, book });
        }
    };

    const handleDownloadBook = async (bookId: string) => {
        const book = books.find(b => b.id === bookId);
        if (!book) {
            alert('❌ Kniha nebyla nalezena');
            return;
        }

        try {
            console.log('📥 Stahování knihy:', book.title);
            
            // Stáhneme soubor z Supabase storage
            const { data: fileData, error: downloadError } = await supabaseClient.storage
                .from('Books')
                .download(book.filePath);
                
            if (downloadError || !fileData) {
                throw new Error(`Nepodařilo se stáhnout soubor: ${downloadError?.message}`);
            }

            // Vytvoříme URL pro stažení
            const url = URL.createObjectURL(fileData);
            
            // Vytvoříme název souboru - pokud není k dispozici, použijeme původní název s extensí
            const fileName = book.filePath.split('/').pop() || 
                             `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.${book.format.toLowerCase()}`;
            
            // Vytvoříme dočasný link element pro stažení
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // Vyčistíme
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('✅ Soubor byl úspěšně stažen:', fileName);
            
        } catch (error) {
            console.error('Chyba při stahování knihy:', error);
            alert(`❌ Chyba při stahování knihy: ${error.message}`);
        }
    };

    const handleBulkDownload = async () => {
        const selectedBooks = books.filter(book => selectedBookIds.has(book.id));
        
        if (selectedBooks.length === 0) {
            alert('❌ Nejsou vybrané žádné knihy pro stažení');
            return;
        }

        if (selectedBooks.length === 1) {
            // Pro jednu knihu použijeme standard stahování
            await handleDownloadBook(selectedBooks[0].id);
            return;
        }

        // Pro více knih vytvoříme ZIP archiv
        try {
            console.log(`📥 Stahování ${selectedBooks.length} knih...`);
            
            // Dynamicky importujeme JSZip
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            
            let successCount = 0;
            let errorCount = 0;
            
            // Stáhneme všechny soubory paralelně
            const downloadPromises = selectedBooks.map(async (book) => {
                try {
                    console.log(`📥 Stahování: ${book.title}`);
                    
                    const { data: fileData, error: downloadError } = await supabaseClient.storage
                        .from('Books')
                        .download(book.filePath);
                        
                    if (downloadError || !fileData) {
                        console.error(`❌ Chyba při stahování ${book.title}:`, downloadError?.message);
                        errorCount++;
                        return null;
                    }

                    // Vytvoříme název souboru
                    const fileName = book.filePath.split('/').pop() || 
                                   `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.${book.format.toLowerCase()}`;
                    
                    // Přidáme soubor do ZIP
                    zip.file(fileName, fileData);
                    successCount++;
                    console.log(`✅ Úspěšně přidáno do ZIP: ${fileName}`);
                    
                    return fileName;
                } catch (error) {
                    console.error(`❌ Chyba při zpracování ${book.title}:`, error);
                    errorCount++;
                    return null;
                }
            });
            
            // Počkáme na dokončení všech stahování
            await Promise.all(downloadPromises);
            
            if (successCount === 0) {
                alert('❌ Nepodařilo se stáhnout žádnou knihu');
                return;
            }
            
            console.log(`📦 Vytváření ZIP archivu s ${successCount} soubory...`);
            
            // Vytvoříme ZIP archiv
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Stáhneme ZIP soubor
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `knihy_${selectedBooks.length}_souboru.zip`;
            document.body.appendChild(link);
            link.click();
            
            // Vyčistíme
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Informujeme uživatele o výsledku
            if (errorCount === 0) {
                alert(`✅ Úspěšně staženo ${successCount} knih do ZIP archivu`);
            } else {
                alert(`⚠️ Staženo ${successCount} knih, ${errorCount} se nepodařilo stáhnout`);
            }
            
            console.log('✅ Hromadné stahování dokončeno');
            
        } catch (error) {
            console.error('Chyba při hromadném stahování:', error);
            alert(`❌ Chyba při vytváření ZIP archivu: ${error.message}`);
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirmation.book) return;

        const bookToDelete = deleteConfirmation.book;
        const bookIdToDelete = bookToDelete.id;

        // Zavřeme dialog okamžitě
        setDeleteConfirmation({ isOpen: false, book: null });

        // Optimistický update - okamžitě odebereme knihu z UI
        const removedIndex = books.findIndex(b => b.id === bookIdToDelete);
        const booksAfterDelete = books.filter(b => b.id !== bookIdToDelete);
        setBooks(booksAfterDelete);

        if (selectedBookId === bookIdToDelete) {
            setSelectedBookId(
                booksAfterDelete.length > 0
                    ? booksAfterDelete[Math.min(removedIndex, booksAfterDelete.length - 1)].id
                    : null
            );
        }

        if (selectedBookIds.has(bookIdToDelete)) {
            const updated = new Set(selectedBookIds);
            updated.delete(bookIdToDelete);
            setSelectedBookIds(updated);
        }

        try {
            await api.deleteBook(bookIdToDelete, bookToDelete.filePath, bookToDelete.coverImageUrl, bookToDelete.title);
            console.log(`✅ Kniha "${bookToDelete.title}" byla úspěšně smazána`);
        } catch (error: any) {
            // Rollback - vrátíme knihu zpět do seznamu
            console.error("Failed to delete book:", error.message, error);
            setBooks(prev => {
                const restored = [...prev];
                restored.splice(removedIndex, 0, bookToDelete);
                return restored;
            });
            alert(`Smazání knihy se nezdařilo: ${error.message}`);
        }
    };

    // Diagnostická funkce pro kontrolu storage bucketů
    const debugStoragePaths = async (bookId: string, bookTitle: string) => {
        console.log(`🔍 DIAGNOSTIKA STORAGE pro knihu: ${bookTitle} (ID: ${bookId})`);
        
        // Najdeme filePath pro tuto knihu
        const book = books.find(b => b.id === bookId);
        const filePath = book?.filePath;
        
        console.log(`📄 File path: ${filePath}`);
        
        if (!filePath) {
            console.error('❌ Nelze najít filePath pro knihu');
            return;
        }
        
        try {
            // Zkontrolujeme Books bucket - covers
            console.log('📁 Kontrola Books/covers/covers/...');
            const { data: coversData } = await supabaseClient.storage.from('Books').list('covers/covers', { limit: 100 });
            console.log('Books/covers/covers/ obsahuje:', coversData?.map(f => f.name) || []);
            
            // Zkontrolujeme konkrétní cover pro tuto knihu
            const fileNameWithoutExt = filePath.replace(/\.[^/.]+$/, "");
            const expectedCoverName = `${fileNameWithoutExt}.jpg`;
            console.log(`🖼️ Hledám cover: ${expectedCoverName}`);
            const coverExists = coversData?.some(f => f.name === expectedCoverName);
            console.log(`Cover existuje: ${coverExists ? '✅' : '❌'}`);
            
            // Zkontrolujeme images bucket - main/production
            console.log('📁 Kontrola images/main/production/...');
            const { data: productionData } = await supabaseClient.storage.from('images').list('main/production', { limit: 100 });
            console.log('images/main/production/ obsahuje složky:', productionData?.map(f => f.name) || []);
            
            // Zkontrolujeme konkrétní složku pro tuto knihu - složka má název podle UUID knihy
            console.log(`📁 Hledám složku podle UUID: ${bookId}`);
            
            const folderExists = productionData?.some(f => f.name === bookId);
            console.log(`Složka existuje: ${folderExists ? '✅' : '❌'}`);
            
            if (folderExists) {
                const { data: bookImagesData } = await supabaseClient.storage.from('images').list(`main/production/${bookId}`, { limit: 100 });
                console.log(`📁 images/main/production/${bookId}/ obsahuje:`, bookImagesData?.map(f => f.name) || []);
            }
        } catch (error) {
            console.error('Chyba při diagnostice storage:', error);
        }
    };

    // Testovací funkce pro mazání pouze images složky
    const testDeleteImages = async (bookId: string) => {
        const book = books.find(b => b.id === bookId);
        if (!book) {
            alert('❌ Kniha nenalezena');
            return;
        }
        
        console.log(`🧪 TESTOVÁNÍ MAZÁNÍ IMAGES pro knihu: ${book.title} (ID: ${bookId})`);
        
        try {
            // Složka má název podle UUID knihy
            const imageFolderPath = `main/production/${bookId}`;
            
            console.log(`🗂️ Pokus o smazání: ${imageFolderPath}`);
            
            // Získáme seznam souborů
            const { data: imageFiles, error: listError } = await supabaseClient.storage
                .from('images')
                .list(imageFolderPath, { limit: 1000 });
            
            console.log(`📋 Seznam souborů:`, { imageFiles, listError });
            
            if (!listError && imageFiles && imageFiles.length > 0) {
                const filesToDelete = imageFiles.map(file => `${imageFolderPath}/${file.name}`);
                console.log(`🗑️ Soubory k smazání:`, filesToDelete);
                
                // Skutečné smazání
                const { error: deleteError } = await supabaseClient.storage
                    .from('images')
                    .remove(filesToDelete);
                
                if (!deleteError) {
                    alert(`✅ Test úspěšný! Smazáno ${filesToDelete.length} souborů ze složky ${imageFolderPath}`);
                } else {
                    alert(`❌ Test neúspěšný! Chyba: ${deleteError.message}`);
                    console.error('Delete error:', deleteError);
                }
            } else {
                alert(`⚠️ Složka ${imageFolderPath} neexistuje nebo je prázdná`);
            }
        } catch (error) {
            console.error('Test error:', error);
            alert(`❌ Chyba při testu: ${error}`);
        }
    };

    // Testovací funkce pro volání webhooků bez mazání knihy
    const testWebhook = async (bookId: string) => {
        try {
            console.log(`🧪 Testování webhook pro knihu: ${bookId}`);
            const webhookResult = await api.callDeleteWebhook(bookId);
            
            if (webhookResult.success) {
                alert(`✅ Webhook test úspěšný!\n\nZavolán webhook pro knihu ID: ${bookId}\nOdpověď: ${webhookResult.message}`);
            } else {
                alert(`❌ Webhook test neúspěšný!\n\nChyba: ${webhookResult.message}`);
            }
        } catch (error: any) {
            console.error("Chyba při testování webhooků:", error);
            alert(`❌ Chyba při testování webhooků: ${error.message}`);
        }
    };

    // Funkce pro validaci povinných metadat
    const validateBookMetadata = (book: Book): string[] => {
        const missingFields: string[] = [];
        
        if (!book.author || book.author.trim() === '' || book.author === 'Neznámý') {
            missingFields.push('Autor');
        }
        if (!book.publicationYear) {
            missingFields.push('Rok vydání');
        }
        if (!book.publisher || book.publisher.trim() === '') {
            missingFields.push('Nakladatelství');
        }
        if (!book.summary || book.summary.trim() === '') {
            missingFields.push('Sumarizace');
        }
        if (!book.keywords || book.keywords.length === 0) {
            missingFields.push('Klíčová slova');
        }
        if (!book.categories || book.categories.length === 0) {
            missingFields.push('Kategorie');
        }
        
        return missingFields;
    };

    const handleVectorDatabaseAction = (book: Book) => {
        // Kontrola povinných metadat
        const missingFields = validateBookMetadata(book);
        
        // Otevření potvrzovacího modalu
        setVectorDbConfirmation({ isOpen: true, book, missingFields });
    };

    const confirmVectorDatabaseAction = async () => {
        const { book, missingFields } = vectorDbConfirmation;
        if (!book) return;

        // Zavření modalu
        setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] });

        // Pokud chybí metadata, nepokračujeme
        if (missingFields.length > 0) {
            return;
        }
        
        // Přidáme knihu do loading stavu
        setVectorProcessingBooks(prev => new Set([...prev, book.id]));
        
        try {
            console.log('📤 Odesílání knihy do vektorové databáze:', book.title);
            console.log('⏳ Čekám na webhook odpověď (může trvat až 5 minut)...');
            
            // Vždy čekáme na webhook odpověď
            const result = await api.sendToVectorDatabase(book, true);
            
            if (result.success) {
                console.log('✅ Webhook úspěšně zpracován');
                alert(`✅ ${result.message}`);
                
                // Aktualizujeme knihu v seznamu na success
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'success'} : b));
            } else {
                console.error('❌ Webhook selhal:', result.message);
                alert(`❌ ${result.message}`);
                
                // Aktualizujeme knihu v seznamu na error
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
            }
        } catch (error: any) {
            // Zkontrolujeme, zda je to varování o velkém PDF
            if (error.message === 'LARGE_PDF_WARNING') {
                console.log('📊 Otevírám modal s varováním o velkém PDF...');
                console.log('📊 Počet stránek:', error.pageCount);
                
                // Otevřeme modal s varováním
                setLargePdfWarning({
                    isOpen: true,
                    book: error.book,
                    pageCount: error.pageCount
                });
                
                // Odebereme knihu z loading stavu
                setVectorProcessingBooks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(book.id);
                    return newSet;
                });
                
                return; // Ukončíme funkci BEZ zobrazení alertu - modal se postará o vše
            }
            
            console.error('❌ Chyba při komunikaci s webhookem:', error);
            alert(`❌ Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
            
            // Aktualizujeme knihu v seznamu
            setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
        } finally {
            // Odebereme knihu z loading stavu (pokud ještě nebyl odebrán výše)
            setVectorProcessingBooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(book.id);
                return newSet;
            });
        }
    };

    // Funkce pro pokračování s PDF i přes varování
    const handleContinueWithLargePdf = async () => {
        const { book } = largePdfWarning;
        if (!book) return;
        
        // Zavřeme modal s varováním
        setLargePdfWarning({ isOpen: false, book: null, pageCount: 0 });
        
        // Přidáme knihu do loading stavu
        setVectorProcessingBooks(prev => new Set([...prev, book.id]));
        
        try {
            console.log('⚠️ Uživatel potvrdil odeslání velkého PDF, pokračuji...');
            console.log('📤 Odesílání knihy do vektorové databáze:', book.title);
            console.log('⏳ Čekám na webhook odpověď (může trvat až 5 minut)...');
            
            // Nastavíme status na pending
            await api.updateBook({...book, vectorStatus: 'pending'});
            setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'pending'} : b));
            
            // Pokračujeme s odesláním (skipneme kontrolu stránek, protože už jsme je zkontrolovali)
            const result = await api.sendToVectorDatabase(book, true, true);
            
            if (result.success) {
                console.log('✅ Webhook úspěšně zpracován');
                alert(`✅ ${result.message}`);
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'success'} : b));
            } else {
                console.error('❌ Webhook selhal:', result.message);
                alert(`❌ ${result.message}`);
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
            }
        } catch (error: any) {
            // Při druhém pokusu již nebude vyhozen LARGE_PDF_WARNING error
            console.error('❌ Chyba při komunikaci s webhookem:', error);
            alert(`❌ Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
            setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
        } finally {
            setVectorProcessingBooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(book.id);
                return newSet;
            });
        }
    };
    
    // Funkce pro odeslání jako text místo PDF
    const handleSendLargePdfAsText = async () => {
        const { book } = largePdfWarning;
        if (!book) return;
        
        // Zavřeme modal s varováním
        setLargePdfWarning({ isOpen: false, book: null, pageCount: 0 });
        
        // Přidáme knihu do loading stavu
        setVectorProcessingBooks(prev => new Set([...prev, book.id]));
        
        try {
            console.log('📄 Uživatel zvolil odeslat pouze text místo PDF');
            console.log('📄 Odesílání pouze textu knihy do vektorové databáze:', book.title);
            console.log('⏳ Čekám na webhook odpověď (může trvat až 5 minut)...');
            
            const result = await api.sendTextOnlyToVectorDatabase(book, true);
            
            if (result.success) {
                console.log('✅ Webhook úspěšně zpracován (text-only)');
                alert(`✅ ${result.message}\n\n📄 Odeslán pouze extrahovaný text.`);
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'success'} : b));
            } else {
                console.error('❌ Webhook selhal:', result.message);
                alert(`❌ ${result.message}`);
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
            }
        } catch (error) {
            console.error('❌ Chyba při komunikaci s webhookem (text-only):', error);
            alert(`❌ Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
            setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
        } finally {
            setVectorProcessingBooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(book.id);
                return newSet;
            });
        }
    };

    // Nová funkce pro odeslání pouze textu do vektorové databáze
    const confirmTextOnlyVectorDatabaseAction = async () => {
        const { book, missingFields } = vectorDbConfirmation;
        if (!book) return;

        // Zavření modalu
        setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] });

        // Pokud chybí metadata, nepokračujeme
        if (missingFields.length > 0) {
            return;
        }
        
        // Přidáme knihu do loading stavu
        setVectorProcessingBooks(prev => new Set([...prev, book.id]));
        
        try {
            console.log('📄 Odesílání pouze textu knihy do vektorové databáze:', book.title);
            console.log('⏳ Čekám na webhook odpověď (může trvat až 5 minut)...');
            
            // Voláme novou funkci pro text-only
            const result = await api.sendTextOnlyToVectorDatabase(book, true);
            
            if (result.success) {
                console.log('✅ Webhook úspěšně zpracován (text-only)');
                alert(`✅ ${result.message}\n\n📄 Odeslán pouze extrahovaný text (bez PDF binárních dat).`);
                
                // Aktualizujeme knihu v seznamu na success
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'success'} : b));
            } else {
                console.error('❌ Webhook selhal:', result.message);
                alert(`❌ ${result.message}`);
                
                // Aktualizujeme knihu v seznamu na error
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
            }
        } catch (error) {
            console.error('❌ Chyba při komunikaci s webhookem (text-only):', error);
            
            // Aktualizujeme knihu v seznamu
            setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
        } finally {
            // Odebereme knihu z loading stavu
            setVectorProcessingBooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(book.id);
                return newSet;
            });
        }
    };

    const detectChangedMetadata = (book: Book): any => {
        // Pokud neexistuje snapshot metadat nebo datum přidání do VDB, vraťme všechna data
        if (!book.metadataSnapshot || !book.vectorAddedAt) {
            console.log('⚠️ Žádný snapshot metadat nebo datum VDB - posílám všechna data');
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                publicationYear: book.publicationYear,
                publisher: book.publisher,
                summary: book.summary,
                keywords: book.keywords,
                language: book.language,
                format: book.format,
                fileSize: book.fileSize,
                coverImageUrl: book.coverImageUrl,
                publicationTypes: book.publicationTypes,
                labels: book.labels,
                categories: book.categories,
                releaseVersion: book.releaseVersion
            };
        }

        try {
            const snapshotData = JSON.parse(book.metadataSnapshot);
            console.log('📸 Snapshot data:', snapshotData);
            
            const currentData = {
                title: book.title,
                author: book.author,
                publicationYear: book.publicationYear,
                publisher: book.publisher,
                summary: book.summary,
                keywords: book.keywords,
                language: book.language,
                format: book.format,
                fileSize: book.fileSize,
                coverImageUrl: book.coverImageUrl,
                publicationTypes: book.publicationTypes,
                labels: book.labels,
                categories: book.categories,
                releaseVersion: book.releaseVersion
            };
            
            console.log('📊 Current data:', currentData);

            const changedData: any = { id: book.id }; // ID vždy potřebujeme
            let hasChanges = false;

            // Porovnáme každé pole
            Object.keys(currentData).forEach(key => {
                const currentValue = (currentData as any)[key];
                const snapshotValue = snapshotData[key];
                
                // Debug informace pro každé pole
                console.log(`🔍 Porovnávám pole '${key}':`);
                console.log(`  - Snapshot:`, snapshotValue);
                console.log(`  - Current:`, currentValue);
                
                // Pro pole porovnáváme jako JSON stringy
                const currentStr = Array.isArray(currentValue) ? JSON.stringify(currentValue.sort()) : String(currentValue || '');
                const snapshotStr = Array.isArray(snapshotValue) ? JSON.stringify(snapshotValue.sort()) : String(snapshotValue || '');
                
                console.log(`  - Snapshot str:`, snapshotStr);
                console.log(`  - Current str:`, currentStr);
                console.log(`  - Jsou stejné:`, currentStr === snapshotStr);
                
                if (currentStr !== snapshotStr) {
                    changedData[key] = currentValue;
                    hasChanges = true;
                    console.log(`🔄 Změna v poli '${key}':`, { před: snapshotValue, nyní: currentValue });
                }
            });

            if (!hasChanges) {
                console.log('✅ Žádné změny v metadatech od přidání do VDB');
                return null; // Žádné změny
            }

            console.log('📝 Detekované změny:', Object.keys(changedData).filter(k => k !== 'id'));
            return changedData;

        } catch (error) {
            console.error('❌ Chyba při parsování snapshot metadat:', error);
            // V případě chyby vrátíme všechna data
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                publicationYear: book.publicationYear,
                publisher: book.publisher,
                summary: book.summary,
                keywords: book.keywords,
                language: book.language,
                format: book.format,
                fileSize: book.fileSize,
                coverImageUrl: book.coverImageUrl,
                publicationTypes: book.publicationTypes,
                labels: book.labels,
                categories: book.categories,
                releaseVersion: book.releaseVersion
            };
        }
    };

    const updateMetadataWebhook = async (book: Book) => {
        try {
            console.log('Volání webhook pro aktualizaci metadat:', book.title);
            
            // Detekce změněných metadat
            const changedData = detectChangedMetadata(book);
            
            if (!changedData) {
                alert('ℹ️ Žádné změny v metadatech od přidání do vektorové databáze');
                return;
            }
            
            console.log('📤 Odesílám pouze změněná metadata:', changedData);

            // Formátuj data podle očekávaného formátu webhook
            const webhookPayload = {
                action: "update_metadata",
                bookId: book.id,
                metadata: {
                    // Odstraň ID z metadat a pošli zbytek
                    ...Object.fromEntries(Object.entries(changedData).filter(([key]) => key !== 'id'))
                }
            };

            console.log('📤 Webhook payload:', webhookPayload);

            const response = await fetch('https://n8n.srv980546.hstgr.cloud/webhook/822e584e-0836-4d1d-aef1-5c4dce6573c0', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookPayload)
            });

            if (response.ok) {
                const responseData = await response.json().catch(() => ({}));
                const changedFieldsCount = Object.keys(changedData).filter(k => k !== 'id').length;
                alert(`✅ Metadata úspěšně aktualizována (${changedFieldsCount} změn)`);
            } else {
                alert('❌ Chyba při aktualizaci metadat');
            }
        } catch (error) {
            console.error('Chyba při volání webhooku:', error);
            alert('❌ Chyba při aktualizaci metadat');
        }
    };
    
    const handleCheckQdrantCloud = async (bookId: string, bookTitle: string) => {
        console.log('🔵 handleCheckQdrantCloud START', bookId);
        try {
            console.log('🔵 volám fetch na', `${supabaseUrl}/functions/v1/qdrant-proxy`);
            const response = await fetch(`${supabaseUrl}/functions/v1/qdrant-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                },
                body: JSON.stringify({
                    operation: 'scroll',
                    limit: 1,
                    filter: {
                        must: [{ key: 'metadata.file_id', match: { value: bookId } }]
                    }
                })
            });

            console.log('🔵 response status:', response.status);
            const result = await response.json();
            console.log('🔵 result:', result);

            const found = result.success && result.result?.result?.points?.length > 0;
            const collectionValue = found ? 'MedBase_A' : null;

            console.log({ bookId, found, collectionValue });

            const { error } = await supabaseClient
                .from('books')
                .update({ qdrant_cloud_collection: collectionValue })
                .eq('id', bookId);

            console.log('🔵 supabase update error:', error);

            if (!error) {
                setBooks(prev => prev.map(b => b.id === bookId ? { ...b, qdrantCloudCollection: collectionValue || undefined } : b));
            }

        } catch (err) {
            console.error('❌ Chyba v handleCheckQdrantCloud:', err);
        }
    };

    const handleVideoSubmit = async () => {
        if (!videoUrl.trim()) {
            alert('Prosím, zadejte URL videa');
            return;
        }

        setIsVideoUploading(true);
        
        try {
            const response = await fetch('https://n8n.srv980546.hstgr.cloud/webhook-test/stt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoUrl: videoUrl,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Video úspěšně odesláno:', result);
            
            alert('Video bylo úspěšně odesláno ke zpracování!');
            setVideoUrl('');
            setAddVideoModalOpen(false);
        } catch (error: any) {
            console.error('Chyba při odesílání videa:', error);
            alert(`Chyba při odesílání videa: ${error.message}`);
        } finally {
            setIsVideoUploading(false);
        }
    };
    
    const handleBulkDelete = () => {
        if (selectedBookIds.size > 0) {
            setBulkDeleteModalOpen(true);
        }
    };

    const executeBulkDelete = async () => {
        if (selectedBookIds.size === 0) return;
        
        const booksToDelete = books.filter(b => selectedBookIds.has(b.id));
        const deletePromises = booksToDelete.map(book => api.deleteBook(book.id, book.filePath, book.coverImageUrl, book.title));

        try {
            // Use Promise.allSettled to continue even if some deletions fail
            const results = await Promise.allSettled(deletePromises);
            
            // Count successful and failed deletions
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            // Always update UI for books that were selected for deletion
            const newBooks = books.filter(b => !selectedBookIds.has(b.id));
            setBooks(newBooks);

            if (selectedBookId && selectedBookIds.has(selectedBookId)) {
                setSelectedBookId(newBooks.length > 0 ? newBooks[0].id : null);
            }
            setSelectedBookIds(new Set());

            if (failed > 0) {
                console.warn(`Bulk delete completed: ${successful} úspěšných, ${failed} neúspěšných`);
                alert(`Hromadné mazání dokončeno: ${successful} knih smazáno, ${failed} se nepodařilo smazat. Zkontrolujte konzoli pro detaily.`);
            } else {
                console.log(`Všech ${successful} knih bylo úspěšně smazáno`);
            }

        } catch (error: any) {
            console.error("Failed to bulk delete books:", error.message, error);
            alert(`Chyba při hromadném mazání: ${error.message}`);
        } finally {
            setBulkDeleteModalOpen(false);
        }
    };
    
    const handleExportXml = () => {
        const selectedBooks = books.filter(b => selectedBookIds.has(b.id));
        if (selectedBooks.length === 0) return;
        let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<books>\n';
        selectedBooks.forEach(book => {
            xmlContent += `  <book id="${book.id}">\n`;
            xmlContent += `    <title><![CDATA[${book.title}]]></title>\n`;
            xmlContent += `    <author><![CDATA[${book.author}]]></author>\n`;
            xmlContent += `    <publicationYear>${book.publicationYear || ''}</publicationYear>\n`;
            xmlContent += `  </book>\n`;
        });
        xmlContent += '</books>';
        downloadFile(xmlContent, 'export.xml', 'application/xml');
    };

    const handleBulkVectorUpload = () => {
        const selectedBooks = books.filter(b => selectedBookIds.has(b.id));
        if (selectedBooks.length === 0) return;

        setBulkVectorUpload({
            isOpen: true,
            isRunning: false,
            current: 0,
            total: selectedBooks.length,
            currentBookTitle: '',
            results: [],
            isDone: false,
            mode: 'selection',
            uploadType: null,
            selectedBooks: selectedBooks,
        });
    };

    const executeBulkVectorUpload = async (uploadType: 'pdf' | 'text' | 'metadata', booksToUpload: Book[]) => {
        if (booksToUpload.length === 0) return;

        setBulkVectorUpload(prev => ({
            ...prev,
            mode: 'processing',
            isRunning: true,
            uploadType: uploadType,
        }));

        const results: { bookId: string; title: string; success: boolean; message: string }[] = [];

        for (let i = 0; i < booksToUpload.length; i++) {
            const book = booksToUpload[i];
            setBulkVectorUpload(prev => ({
                ...prev,
                current: i + 1,
                currentBookTitle: book.title,
            }));

            try {
                let result;
                if (uploadType === 'text') {
                    result = await api.sendTextOnlyToVectorDatabase(book, true);
                } else if (uploadType === 'metadata') {
                    await updateMetadataWebhook(book);
                    result = { success: true, message: 'Metadata aktualizována' };
                } else {
                    // pdf
                    result = await api.sendToVectorDatabase(book, true, false);
                }

                results.push({ bookId: book.id, title: book.title, success: result.success, message: result.message });

                if (result.success) {
                    setBooks(prev => prev.map(b => b.id === book.id
                        ? { ...b, vectorStatus: 'success', lastVectorUploadAt: new Date().toISOString() }
                        : b
                    ));
                } else {
                    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, vectorStatus: 'error' } : b));
                }
            } catch (err: any) {
                const errorMsg = err?.message || 'Neznámá chyba';
                results.push({ bookId: book.id, title: book.title, success: false, message: errorMsg });
                setBooks(prev => prev.map(b => b.id === book.id ? { ...b, vectorStatus: 'error' } : b));
            }

            setBulkVectorUpload(prev => ({ ...prev, results: [...results] }));
        }

        setBulkVectorUpload(prev => ({ ...prev, isRunning: false, isDone: true }));
    };

    const handleToggleSelection = (bookId: string) => {
        const newSelection = new Set(selectedBookIds);
        if (newSelection.has(bookId)) {
            newSelection.delete(bookId);
        } else {
            newSelection.add(bookId);
        }
        setSelectedBookIds(newSelection);
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedBookIds(new Set(filteredBooks.map(b => b.id)));
        } else {
            setSelectedBookIds(new Set());
        }
    };
    
    const handleAddNewLabel = async (labelName: string) => {
        if(labelName && !allLabels.includes(labelName)) {
            const success = await api.addLabel(labelName);
            if (success) {
                setAllLabels(prev => [...prev, labelName].sort());
                console.log('✅ Štítek přidán do databáze:', labelName);
            } else {
                alert(`Nepodařilo se přidat štítek "${labelName}" do databáze.`);
            }
        }
    }

    const handleAddNewCategory = async (categoryName: string) => {
        if(categoryName && !allCategories.includes(categoryName)) {
            const success = await api.addCategory(categoryName);
            if (success) {
                setAllCategories(prev => [...prev, categoryName].sort());
                console.log('✅ Kategorie přidána do databáze:', categoryName);
            } else {
                alert(`Nepodařilo se přidat kategorii "${categoryName}" do databáze.`);
            }
        }
    }

    const handleAddNewPublicationType = async (typeName: string) => {
        if(typeName && !allPublicationTypes.includes(typeName)) {
            const success = await api.addPublicationType(typeName);
            if (success) {
                setAllPublicationTypes(prev => [...prev, typeName].sort());
                console.log('✅ Typ publikace přidán do databáze:', typeName);
            } else {
                alert(`Nepodařilo se přidat typ publikace "${typeName}" do databáze.`);
            }
        }
    }

    const handleDeleteLabel = async (labelName: string) => {
        // Nejdříve smazat z databáze
        const success = await api.deleteLabel(labelName);
        if (!success) {
            alert(`Nepodařilo se smazat štítek "${labelName}" z databáze.`);
            return;
        }
        
        // Odebrat štítek ze všech knih
        const updatedBooks = books.map(book => ({
            ...book,
            labels: book.labels.filter(label => label !== labelName)
        }));
        setBooks(updatedBooks);
        
        // Odebrat štítek ze seznamu všech štítků
        setAllLabels(prev => prev.filter(label => label !== labelName));
        
        // Odebrat štítek z filtru, pokud je vybraný
        setLabelFilter(prev => prev.filter(label => label !== labelName));
        
        // Aktualizovat knihy v API
        updatedBooks.forEach(book => {
            if (book.labels.some(label => !books.find(b => b.id === book.id)?.labels.includes(label))) {
                api.updateBook(book).catch((error: any) => {
                    console.error("Failed to update book after label deletion:", error);
                });
            }
        });
        
        console.log('✅ Štítek smazán z databáze a všech knih:', labelName);
    };

    const handleDeleteCategory = async (categoryName: string) => {
        // Nejdříve smazat z databáze
        const success = await api.deleteCategory(categoryName);
        if (!success) {
            alert(`Nepodařilo se smazat kategorii "${categoryName}" z databáze.`);
            return;
        }
        
        // Odebrat kategorii ze všech knih
        const updatedBooks = books.map(book => ({
            ...book,
            categories: book.categories.filter(category => category !== categoryName)
        }));
        setBooks(updatedBooks);
        
        // Odebrat kategorii ze seznamu všech kategorií
        setAllCategories(prev => prev.filter(category => category !== categoryName));
        
        // Odebrat kategorii z filtru, pokud je vybraná
        setCategoryFilter(prev => prev.filter(category => category !== categoryName));
        
        // Aktualizovat knihy v API
        updatedBooks.forEach(book => {
            if (book.categories.some(category => !books.find(b => b.id === book.id)?.categories.includes(category))) {
                api.updateBook(book).catch((error: any) => {
                    console.error("Failed to update book after category deletion:", error);
                });
            }
        });
        
        console.log('✅ Kategorie smazána z databáze a všech knih:', categoryName);
    };

    const handleDeletePublicationType = async (typeName: string) => {
        // Nejdříve smazat z databáze
        const success = await api.deletePublicationType(typeName);
        if (!success) {
            alert(`Nepodařilo se smazat typ publikace "${typeName}" z databáze.`);
            return;
        }
        
        // Odebrat typ publikace ze všech knih
        const updatedBooks = books.map(book => ({
            ...book,
            publicationTypes: book.publicationTypes.filter(type => type !== typeName)
        }));
        setBooks(updatedBooks);
        
        // Odebrat typ publikace ze seznamu všech typů
        setAllPublicationTypes(prev => prev.filter(type => type !== typeName));
        
        // Odebrat typ publikace z filtru, pokud je vybraný
        setTypeFilter(prev => prev.filter(type => type !== typeName));
        
        // Aktualizovat knihy v API
        updatedBooks.forEach(book => {
            if (book.publicationTypes.some(type => !books.find(b => b.id === book.id)?.publicationTypes.includes(type))) {
                api.updateBook(book).catch((error: any) => {
                    console.error("Failed to update book after publication type deletion:", error);
                });
            }
        });
        
        console.log('✅ Typ publikace smazán z databáze a všech knih:', typeName);
    };

    const handleConvert = (format: string) => {
        alert(`Konverze pro ${selectedBookIds.size} ${selectedBookIds.size === 1 ? 'knihu' : selectedBookIds.size > 1 && selectedBookIds.size < 5 ? 'knihy' : 'knih'} do formátu ${format} byla spuštěna.`);
        setConvertModalOpen(false);
        setSelectedBookIds(new Set());
    };

    const handleReadBook = (bookToRead: Book | undefined) => {
        if (!bookToRead || !bookToRead.filePath) {
            alert("K této knize není přiřazen žádný soubor.");
            return;
        }
        const { data } = supabaseClient.storage.from('Books').getPublicUrl(bookToRead.filePath);
        
        if (data && data.publicUrl) {
            window.open(data.publicUrl, '_blank', 'noopener,noreferrer');
        } else {
            alert("Nepodařilo se získat veřejnou URL adresu souboru.");
        }
    };

    const filteredBooks = useMemo(() =>
        books.filter(book => {
            const searchLower = filter.toLowerCase();
            const matchesText = searchLower === '' || 
                book.title.toLowerCase().includes(searchLower) ||
                book.author.toLowerCase().includes(searchLower) ||
                book.keywords.some(k => k.toLowerCase().includes(searchLower));

            const matchesLabels = labelFilter.length === 0 || labelFilter.every(t => book.labels.includes(t));
            const matchesCategories = categoryFilter.length === 0 || categoryFilter.every(c => book.categories.includes(c));
            const matchesTypes = typeFilter.length === 0 || typeFilter.some(t => book.publicationTypes.includes(t));
            const matchesVersions = versionFilter.length === 0 || versionFilter.includes(book.releaseVersion);
            const matchesLangs = langFilter.length === 0 || langFilter.includes(book.language);
            
            const matchesVdb = vdbFilter === 'all' || book.vectorStatus === vdbFilter;
            
            const matchesYear = (!yearRange.from || (book.publicationYear && book.publicationYear >= yearRange.from)) &&
                                (!yearRange.to || (book.publicationYear && book.publicationYear <= yearRange.to));
            
            const fromMonthStr = availableMonths[dateAddedRange.from];
            const toMonthStr = availableMonths[dateAddedRange.to];
            if (!fromMonthStr || !toMonthStr) return true; // Don't filter if range is not ready
            
            const bookDate = new Date(book.dateAdded);
            const bookMonthStr = `${bookDate.getFullYear()}-${String(bookDate.getMonth() + 1).padStart(2, '0')}`;
            const matchesDateAdded = bookMonthStr >= fromMonthStr && bookMonthStr <= toMonthStr;

            return matchesText && matchesLabels && matchesCategories && matchesTypes && matchesVersions && matchesLangs && matchesVdb && matchesYear && matchesDateAdded;
        }), [books, filter, labelFilter, categoryFilter, typeFilter, versionFilter, langFilter, vdbFilter, yearRange, dateAddedRange, availableMonths]);

    const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);

    const [minYear, maxYear] = useMemo(() => {
        const years = books.map(b => b.publicationYear).filter((y): y is number => y !== null && y > 1000);
        if (years.length === 0) return [new Date().getFullYear() - 20, new Date().getFullYear()];
        return [Math.min(...years), Math.max(...years)];
    }, [books]);

    return (
        <div style={styles.appContainer}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.epub,.mobi,.txt" />
            
            <TopToolbar 
                onUploadClick={() => fileInputRef.current?.click()}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                selectedCount={selectedBookIds.size}
                onBulkDelete={handleBulkDelete}
                onBulkDownload={handleBulkDownload}
                onExportXml={handleExportXml}
                onBulkVectorUpload={handleBulkVectorUpload}
                onConvertClick={() => setConvertModalOpen(true)}
                isAnyBookSelected={selectedBookIds.size > 0}
                onChatbotManagementClick={() => setChatbotManagementOpen(true)}
                onAddVideoClick={() => setAddVideoModalOpen(true)}
                currentUser={currentUser}
                onUserManagementClick={() => setUserManagementOpen(true)}
                onProfileSettingsClick={() => setProfileSettingsOpen(true)}
                onLogoutClick={async () => {
                    const { error } = await logout();
                    if (error) {
                        alert(`Chyba při odhlášení: ${error}`);
                    } else {
                        window.location.reload();
                    }
                }}
            />

            <div style={styles.mainContent}>
                <LeftFilterPanel 
                    filter={filter} onFilterChange={setFilter} 
                    allLabels={allLabels} selectedLabels={labelFilter} onLabelFilterChange={setLabelFilter} onAddLabel={handleAddNewLabel} onDeleteLabel={handleDeleteLabel}
                    allCategories={allCategories} selectedCategories={categoryFilter} onCategoryFilterChange={setCategoryFilter} onAddCategory={handleAddNewCategory} onDeleteCategory={handleDeleteCategory}
                    allTypes={allPublicationTypes} selectedTypes={typeFilter} onTypeFilterChange={setTypeFilter} onAddType={handleAddNewPublicationType} onDeleteType={handleDeletePublicationType}
                    allVersions={allVersions} selectedVersions={versionFilter} onVersionFilterChange={setVersionFilter}
                    allLanguages={allLanguages} selectedLanguages={langFilter} onLanguageFilterChange={setLangFilter}

                    vdbFilter={vdbFilter} onVdbFilterChange={setVdbFilter}
                    yearRange={yearRange} onYearRangeChange={setYearRange} minYear={minYear} maxYear={maxYear}
                    availableMonths={availableMonths} dateAddedRange={dateAddedRange} onDateAddedRangeChange={setDateAddedRange}
                />
                <main style={styles.bookListContainer}>
                    {isLoading ? <p>Načítání knih...</p> : (
                        viewMode === 'list' ? 
                            <BookListView 
                                books={filteredBooks} 
                                selectedBookId={selectedBookId} 
                                selectedBookIds={selectedBookIds}
                                onSelectBook={id => {setSelectedBookId(id);}}
                                onToggleSelection={handleToggleSelection}
                                onSelectAll={handleSelectAll}
                                onDeleteBook={handleDeleteBook}
                                onDownloadBook={handleDownloadBook}
                                onTestWebhook={testWebhook}
                                onVectorDatabaseAction={handleVectorDatabaseAction}
                                vectorProcessingBooks={vectorProcessingBooks}
                            /> :
                            <BookGridView books={filteredBooks} selectedBookId={selectedBookId} onSelectBook={setSelectedBookId} />
                    )}
                </main>
                {selectedBook ? (
                    <aside style={styles.detailPanel}>
                        <BookDetailPanel 
                            book={selectedBook} 
                            onUpdate={handleUpdateBook} 
                            onDelete={handleDeleteBook}
                            onTestWebhook={testWebhook}
                            onCheckQdrantCloud={handleCheckQdrantCloud}
                            onDebugStorage={debugStoragePaths}
                            onTestDeleteImages={testDeleteImages}
                            onReadClick={() => handleReadBook(selectedBook)}
                            allLabels={allLabels}
                            onAddNewLabel={handleAddNewLabel}
                            onDeleteLabel={handleDeleteLabel}
                            allCategories={allCategories}
                            onAddNewCategory={handleAddNewCategory}
                            onDeleteCategory={handleDeleteCategory}
                            allPublicationTypes={allPublicationTypes}
                            onAddNewPublicationType={handleAddNewPublicationType}
                            onDeletePublicationType={handleDeletePublicationType}
                            allAvailableLanguages={allAvailableLanguages}
                        />
                    </aside>
                ) : !isLoading && books.length > 0 && (
                     <aside style={styles.detailPanel}>
                         <div style={{...styles.detailContent, justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                             <p style={{color: 'var(--text-secondary)'}}>Vyberte knihu ze seznamu.</p>
                         </div>
                     </aside>
                )}
            </div>
            
            <Modal isOpen={isConvertModalOpen} onClose={() => setConvertModalOpen(false)} title="Konvertovat knihu">
                <p>Vyberte formát pro konverzi vybraných knih ({selectedBookIds.size}).</p>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                    <button style={styles.button} onClick={() => handleConvert('EPUB')}>EPUB</button>
                    <button style={styles.button} onClick={() => handleConvert('MOBI')}>MOBI</button>
                    <button style={styles.button} onClick={() => handleConvert('PDF')}>PDF</button>
                    <button style={styles.button} onClick={() => handleConvert('TXT')}>TXT</button>
                </div>
            </Modal>

            <Modal 
                isOpen={deleteConfirmation.isOpen} 
                onClose={() => setDeleteConfirmation({ isOpen: false, book: null })} 
                title="Potvrdit smazání"
            >
                <p>Opravdu chcete smazat knihu "{deleteConfirmation.book?.title}"?</p>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end'}}>
                    <button style={styles.button} onClick={() => setDeleteConfirmation({ isOpen: false, book: null })}>Zrušit</button>
                    <button style={{...styles.button, ...styles.buttonDanger}} onClick={executeDelete}>Smazat</button>
                </div>
            </Modal>

            <Modal 
                isOpen={isBulkDeleteModalOpen} 
                onClose={() => setBulkDeleteModalOpen(false)} 
                title="Potvrdit hromadné smazání"
            >
                <p>Opravdu chcete smazat {selectedBookIds.size} {selectedBookIds.size === 1 ? 'knihu' : selectedBookIds.size > 1 && selectedBookIds.size < 5 ? 'knihy' : 'knih'}?</p>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end'}}>
                    <button style={styles.button} onClick={() => setBulkDeleteModalOpen(false)}>Zrušit</button>
                    <button style={{...styles.button, ...styles.buttonDanger}} onClick={executeBulkDelete}>Smazat</button>
                </div>
            </Modal>

            <Modal
                isOpen={bulkVectorUpload.isOpen}
                onClose={() => {
                    if (!bulkVectorUpload.isRunning) {
                        setBulkVectorUpload(prev => ({ ...prev, isOpen: false }));
                    }
                }}
                title={bulkVectorUpload.mode === 'selection' ? 'Hromadné nahrávání do vektorové databáze' : 'Hromadné nahrávání do vektorové databáze'}
            >
                <div style={{ minWidth: '420px', maxWidth: '560px' }}>
                    {/* SELECTION MODE - výběr typu nahrávání */}
                    {bulkVectorUpload.mode === 'selection' && (
                        <div>
                            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                Vyberte typ nahrávání pro {bulkVectorUpload.total} {bulkVectorUpload.total === 1 ? 'knihu' : bulkVectorUpload.total < 5 ? 'knihy' : 'knih'}:
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                <button
                                    style={{
                                        ...styles.button,
                                        border: '2px solid #007bff',
                                        backgroundColor: 'transparent',
                                        color: '#007bff',
                                        fontWeight: '500',
                                        padding: '0.75rem 1.25rem',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => executeBulkVectorUpload('pdf', bulkVectorUpload.selectedBooks)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>📘 Odeslat PDF do VDB</div>
                                    <div style={{ fontSize: '12px', opacity: '0.8' }}>Odešle celé PDF včetně binárních dat</div>
                                </button>
                                
                                <button
                                    style={{
                                        ...styles.button,
                                        border: '2px solid #28a745',
                                        backgroundColor: 'transparent',
                                        color: '#28a745',
                                        fontWeight: '500',
                                        padding: '0.75rem 1.25rem',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => executeBulkVectorUpload('text', bulkVectorUpload.selectedBooks)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>📄 Odeslat pouze text do VDB</div>
                                    <div style={{ fontSize: '12px', opacity: '0.8' }}>Odešle pouze extrahovaný text (rychlejší, menší velikost)</div>
                                </button>
                                
                                <button
                                    style={{
                                        ...styles.button,
                                        border: '2px solid #6c757d',
                                        backgroundColor: 'transparent',
                                        color: '#6c757d',
                                        fontWeight: '500',
                                        padding: '0.75rem 1.25rem',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => executeBulkVectorUpload('metadata', bulkVectorUpload.selectedBooks)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(108, 117, 125, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>🔄 Aktualizovat metadata</div>
                                    <div style={{ fontSize: '12px', opacity: '0.8' }}>Aktualizuje pouze metadata v existujících záznamech</div>
                                </button>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    style={styles.button}
                                    onClick={() => setBulkVectorUpload(prev => ({ ...prev, isOpen: false }))}
                                >
                                    Zrušit
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PROCESSING MODE - průběh nahrávání */}
                    {bulkVectorUpload.mode === 'processing' && (
                        <div>
                            {/* Progress info */}
                            <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {bulkVectorUpload.isRunning ? (
                                    <span>
                                        Typ: <strong style={{ color: 'var(--text-primary)' }}>
                                            {bulkVectorUpload.uploadType === 'pdf' && '📘 PDF'}
                                            {bulkVectorUpload.uploadType === 'text' && '📄 Pouze text'}
                                            {bulkVectorUpload.uploadType === 'metadata' && '🔄 Metadata'}
                                        </strong>
                                        <br />
                                        Nahrávám: <strong style={{ color: 'var(--text-primary)' }}>{bulkVectorUpload.currentBookTitle}</strong>
                                    </span>
                                ) : bulkVectorUpload.isDone ? (
                                    <span>Nahrávání dokončeno</span>
                                ) : null}
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    <span>{bulkVectorUpload.current} / {bulkVectorUpload.total} knih</span>
                                    <span>{bulkVectorUpload.total > 0 ? Math.round((bulkVectorUpload.current / bulkVectorUpload.total) * 100) : 0}%</span>
                                </div>
                                <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        borderRadius: '5px',
                                        background: bulkVectorUpload.isDone ? '#28a745' : '#007bff',
                                        width: `${bulkVectorUpload.total > 0 ? (bulkVectorUpload.current / bulkVectorUpload.total) * 100 : 0}%`,
                                        transition: 'width 0.4s ease, background 0.3s ease',
                                    }} />
                                </div>
                            </div>

                            {/* Results list */}
                            {bulkVectorUpload.results.length > 0 && (
                                <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '16px' }}>
                                    {bulkVectorUpload.results.map((r, idx) => (
                                        <div key={r.bookId} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            borderBottom: idx < bulkVectorUpload.results.length - 1 ? '1px solid var(--border-color)' : 'none',
                                            fontSize: '13px',
                                        }}>
                                            <span style={{ fontSize: '16px', lineHeight: '1.4', flexShrink: 0 }}>{r.success ? '✅' : '❌'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                                                {!r.success && (
                                                    <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '2px' }}>{r.message}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Summary after done */}
                            {bulkVectorUpload.isDone && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    <strong style={{ color: '#28a745' }}>✅ {bulkVectorUpload.results.filter(r => r.success).length}</strong> úspěšně
                                    {bulkVectorUpload.results.filter(r => !r.success).length > 0 && (
                                        <>, <strong style={{ color: '#dc3545' }}>❌ {bulkVectorUpload.results.filter(r => !r.success).length}</strong> selhalo</>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    style={styles.button}
                                    disabled={bulkVectorUpload.isRunning}
                                    onClick={() => setBulkVectorUpload(prev => ({ ...prev, isOpen: false }))}
                                >
                                    {bulkVectorUpload.isRunning ? 'Probíhá nahrávání...' : 'Zavřít'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal 
                isOpen={vectorDbConfirmation.isOpen} 
                onClose={() => setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] })} 
                title={vectorDbConfirmation.missingFields.length > 0 ? "Chybí povinná metadata" : "Potvrdit odeslání do vektorové databáze"}
            >
                {vectorDbConfirmation.missingFields.length > 0 ? (
                    <>
                        <p>❌ Nelze odeslat knihu "{vectorDbConfirmation.book?.title}" do vektorové databáze.</p>
                        <p><strong>Chybí následující povinná metadata:</strong></p>
                        <ul style={{margin: '1rem 0', paddingLeft: '1.5rem'}}>
                            {vectorDbConfirmation.missingFields.map(field => (
                                <li key={field} style={{margin: '0.5rem 0', color: 'var(--danger-color)'}}>{field}</li>
                            ))}
                        </ul>
                        <p style={{fontSize: '0.9em', color: 'var(--text-secondary)'}}>
                            Prosím doplňte tato metadata v detailu knihy a zkuste to znovu.
                        </p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem'}}>
                            <button 
                                style={{
                                    ...styles.button,
                                    border: '2px solid var(--primary-color)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--primary-color)',
                                    fontWeight: '500',
                                    padding: '0.75rem 1.25rem',
                                    transition: 'all 0.2s ease'
                                }} 
                                onClick={() => {
                                    setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] });
                                    if (vectorDbConfirmation.book) {
                                        setSelectedBookId(vectorDbConfirmation.book.id);
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(var(--primary-color-rgb), 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                Upravit knihu
                            </button>
                            <button 
                                style={{
                                    ...styles.button,
                                    border: '2px solid var(--border-color)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                    fontWeight: '500',
                                    padding: '0.75rem 1.25rem',
                                    transition: 'all 0.2s ease'
                                }} 
                                onClick={() => setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] })}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                Zavřít
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem'}}>
                            <IconDatabase status="pending" />
                            <div>
                                <p><strong>Kniha:</strong> {vectorDbConfirmation.book?.title}</p>
                                <p style={{fontSize: '0.9em', color: 'var(--text-secondary)'}}>
                                    Autor: {vectorDbConfirmation.book?.author} • {vectorDbConfirmation.book?.publicationYear}
                                </p>
                            </div>
                        </div>
                        <p>Opravdu chcete odeslat tuto knihu do vektorové databáze?</p>
                        
                        <div style={{margin: '1.5rem 0', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                            <div style={{fontSize: '0.95em'}}>
                                <div style={{fontWeight: '500', marginBottom: '8px'}}>⏳ Čekání na zpracování</div>
                                <div style={{fontSize: '0.85em', color: 'var(--text-secondary)', lineHeight: '1.5'}}>
                                    Aplikace bude čekat na webhook odpověď až 5 minut a zobrazí výsledek zpracování. Ikona se bude otáčet během celého procesu.
                                </div>
                            </div>
                        </div>
                        
                        <div style={{margin: '1.5rem 0', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107'}}>
                            <div style={{fontSize: '0.95em'}}>
                                <div style={{fontWeight: '500', marginBottom: '8px', color: '#856404'}}>💡 Doporučení pro velké PDF</div>
                                <div style={{fontSize: '0.85em', color: '#856404', lineHeight: '1.5'}}>
                                    <strong>PDF s více než 1000 stránkami:</strong> Doporučujeme použít tlačítko <strong>"Odeslat pouze text do VDB"</strong> 
                                    pro rychlejší zpracování a nižší náklady. Systém automaticky varuje při detekci velkých souborů.
                                </div>
                                <div style={{fontSize: '0.85em', color: '#856404', lineHeight: '1.5', marginTop: '8px'}}>
                                    <strong>Text-only výhody:</strong> ⚡ Rychlejší • 💰 Nižší náklady • ✅ Spolehlivější pro velké soubory
                                </div>
                            </div>
                        </div>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem'}}>
                            <button 
                                style={{
                                    ...styles.button,
                                    border: '2px solid #6c757d',
                                    backgroundColor: 'transparent',
                                    color: '#6c757d',
                                    fontWeight: '500',
                                    padding: '0.75rem 1.25rem',
                                    transition: 'all 0.2s ease'
                                }} 
                                onClick={() => {
                                    if (vectorDbConfirmation.book) {
                                        updateMetadataWebhook(vectorDbConfirmation.book);
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(108, 117, 125, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                🔄 Aktualizovat metadata
                            </button>
                            
                            <button 
                                style={{
                                    ...styles.button,
                                    border: '2px solid #28a745',
                                    backgroundColor: 'transparent',
                                    color: '#28a745',
                                    fontWeight: '500',
                                    padding: '0.75rem 1.25rem',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={confirmTextOnlyVectorDatabaseAction}
                                title="Odešle pouze extrahovaný text do VDB (rychlejší, menší velikost)"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                📄 Odeslat pouze text do VDB
                            </button>
                            
                            <button 
                                style={{
                                    ...styles.button,
                                    border: '2px solid #007bff',
                                    backgroundColor: 'transparent',
                                    color: '#007bff',
                                    fontWeight: '500',
                                    padding: '0.75rem 1.25rem',
                                    transition: 'all 0.2s ease'
                                }} 
                                onClick={confirmVectorDatabaseAction}
                                title="Odešle celé PDF včetně binárních dat do VDB"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                📘 Odeslat PDF do VDB
                            </button>
                            
                            <button 
                                style={{
                                    ...styles.button,
                                    border: '2px solid var(--border-color)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                    fontWeight: '500',
                                    padding: '0.75rem 1.25rem',
                                    marginTop: '0.5rem',
                                    transition: 'all 0.2s ease'
                                }} 
                                onClick={() => setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] })}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                Zrušit
                            </button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Modal pro varování o velkém PDF */}
            <Modal
                isOpen={largePdfWarning.isOpen}
                onClose={() => setLargePdfWarning({ isOpen: false, book: null, pageCount: 0 })}
                title="Velký PDF soubor"
            >
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <div style={{fontSize: '3rem'}}>⚠️</div>
                        <div>
                            <p style={{margin: 0, fontSize: '1.1em', fontWeight: '500'}}>
                                Tento PDF má <strong>{largePdfWarning.pageCount} stránek</strong>
                            </p>
                            <p style={{margin: '8px 0 0 0', fontSize: '0.95em', color: 'var(--text-secondary)'}}>
                                Zpracování může trvat několik minut
                            </p>
                        </div>
                    </div>
                    
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <p style={{margin: 0, fontSize: '0.95em', lineHeight: '1.6'}}>
                            <strong>💡 Doporučení:</strong> Pro rychlejší zpracování doporučujeme odeslat pouze extrahovaný text místo celého PDF souboru.
                        </p>
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                        <button
                            style={{
                                ...styles.button,
                                border: '2px solid #28a745',
                                backgroundColor: 'transparent',
                                color: '#28a745',
                                fontWeight: '500',
                                padding: '0.75rem 1.25rem',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={handleSendLargePdfAsText}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            📄 Odeslat jako text (doporučeno)
                        </button>
                        
                        <button
                            style={{
                                ...styles.button,
                                border: '2px solid #6c757d',
                                backgroundColor: 'transparent',
                                color: '#6c757d',
                                fontWeight: '500',
                                padding: '0.75rem 1.25rem',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={handleContinueWithLargePdf}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(108, 117, 125, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            📘 Pokračovat s PDF
                        </button>
                        
                        <button
                            style={{
                                ...styles.button,
                                border: '2px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: '500',
                                padding: '0.75rem 1.25rem',
                                justifyContent: 'center',
                                marginTop: '0.5rem',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => setLargePdfWarning({ isOpen: false, book: null, pageCount: 0 })}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            Zrušit
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal pro volbu OCR a komprese při uploadu */}
            <Modal 
                isOpen={isUploadProcessingModalOpen} 
                onClose={handleUploadProcessingCancel} 
                title="Zpracování PDF souboru"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Vyberte, které operace chcete provést s nahrávaným PDF souborem:
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={uploadOptions.performOCR}
                                onChange={(e) => setUploadOptions(prev => ({ ...prev, performOCR: e.target.checked, textOnly: false, textOnly2: false }))}
                                style={{ marginRight: '0.5rem' }}
                            />
                            <strong>Provést OCR</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                                - Rozpoznání textu v naskenovaných dokumentech
                            </span>
                        </label>
                        
                        {uploadOptions.performOCR && (
                            <div style={{ 
                                marginLeft: '1.5rem', 
                                padding: '1rem', 
                                backgroundColor: 'var(--background-tertiary)', 
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.9em' }}>Jazyk dokumentu pro OCR:</strong>
                                    <select 
                                        value={selectedOCRLanguage}
                                        onChange={(e) => setSelectedOCRLanguage(e.target.value)}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--background-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9em'
                                        }}
                                    >
                                        {ILovePDFService.getAvailableLanguages().map(lang => (
                                            <option key={lang.code} value={lang.name}>
                                                {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        )}
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={uploadOptions.performCompression}
                                onChange={(e) => setUploadOptions(prev => ({ ...prev, performCompression: e.target.checked, textOnly: false, textOnly2: false }))}
                                style={{ marginRight: '0.5rem' }}
                            />
                            <strong>Provést kompresi</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                                - Zmenšení velikosti souboru
                            </span>
                        </label>
                        
                        {uploadOptions.performCompression && (
                            <div style={{ 
                                marginLeft: '1.5rem',
                                padding: '1rem', 
                                backgroundColor: 'var(--background-tertiary)', 
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.9em' }}>Úroveň komprese:</strong>
                                    <select 
                                        value={selectedCompressionLevel}
                                        onChange={(e) => setSelectedCompressionLevel(e.target.value)}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--background-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9em'
                                        }}
                                    >
                                        <option value="low">Low - Minimální komprese (zachová kvalitu)</option>
                                        <option value="recommended">Recommended - Optimální poměr velikost/kvalita</option>
                                        <option value="extreme">Extreme - Maximální komprese (může snížit kvalitu)</option>
                                    </select>
                                </label>
                                <div style={{ 
                                    marginTop: '0.5rem', 
                                    fontSize: '0.8em', 
                                    color: 'var(--text-secondary)',
                                    lineHeight: '1.4'
                                }}>
                                    {selectedCompressionLevel === 'low' && (
                                        <>🔹 <strong>Low:</strong> Minimální komprese pro zachování kvality bez ztráty dat</>
                                    )}
                                    {selectedCompressionLevel === 'recommended' && (
                                        <>🔹 <strong>Recommended:</strong> Nejlepší mix komprese a kvality pro běžné použití</>
                                    )}
                                    {selectedCompressionLevel === 'extreme' && (
                                        <>🔹 <strong>Extreme:</strong> Maximální komprese, může snížit kvalitu obrázků</>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={uploadOptions.textOnly}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    if (isChecked) {
                                        // Pokud je textOnly zaškrtnuto, odškrtneme ostatní možnosti
                                        setUploadOptions({ performOCR: false, performCompression: false, textOnly: true, textOnly2: false });
                                    } else {
                                        setUploadOptions(prev => ({ ...prev, textOnly: false }));
                                    }
                                }}
                                style={{ marginRight: '0.5rem' }}
                            />
                            <strong>Nahrát pouze text</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                                - Extrahuje text z PDF přes webhook a uloží jako .txt soubor
                            </span>
                        </label>
                        
                        {uploadOptions.textOnly && (
                            <div style={{ 
                                marginLeft: '1.5rem',
                                padding: '1rem', 
                                backgroundColor: '#fff3cd', 
                                borderRadius: '8px',
                                border: '1px solid #ffc107'
                            }}>
                                <p style={{ margin: 0, fontSize: '0.9em', color: '#856404' }}>
                                    ℹ️ <strong>Režim pouze text:</strong>
                                    <br />
                                    PDF bude zpracováno přes N8N webhook, text bude extrahován a uložen jako .txt soubor.
                                    Tato možnost je exkluzivní - nelze kombinovat s OCR nebo kompresí.
                                </p>
                            </div>
                        )}
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={uploadOptions.textOnly2}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    if (isChecked) {
                                        // Pokud je textOnly2 zaškrtnuto, odškrtneme ostatní možnosti
                                        setUploadOptions({ performOCR: false, performCompression: false, textOnly: false, textOnly2: true });
                                    } else {
                                        setUploadOptions(prev => ({ ...prev, textOnly2: false }));
                                    }
                                }}
                                style={{ marginRight: '0.5rem' }}
                            />
                            <strong>Nahrát pouze text 2</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                                - Lokální extrakce textu z PDF a uložení jako .txt soubor
                            </span>
                        </label>
                        
                        {uploadOptions.textOnly2 && (
                            <div style={{ 
                                marginLeft: '1.5rem',
                                padding: '1rem', 
                                backgroundColor: '#d1ecf1', 
                                borderRadius: '8px',
                                border: '1px solid #0dcaf0'
                            }}>
                                <p style={{ margin: 0, fontSize: '0.9em', color: '#055160' }}>
                                    ℹ️ <strong>Režim pouze text 2:</strong>
                                    <br />
                                    Text bude extrahován lokálně z PDF bez použití webhooku a uložen jako samostatný .txt soubor.
                                    V aplikaci bude uložen textový soubor místo PDF.
                                    Tato možnost je exkluzivní - nelze kombinovat s OCR nebo kompresí.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {(uploadOptions.performOCR || uploadOptions.performCompression || uploadOptions.textOnly || uploadOptions.textOnly2) && (
                        <div style={{ 
                            backgroundColor: 'var(--background-tertiary)', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                                {uploadOptions.textOnly ? (
                                    <>⏱️ Zpracování pomocí N8N workflow může trvat několik sekund až minut v závislosti na velikosti souboru.</>
                                ) : uploadOptions.textOnly2 ? (
                                    <>⏱️ Lokální extrakce textu může trvat několik sekund v závislosti na velikosti souboru.</>
                                ) : (
                                    <>⏱️ Zpracování pomocí iLovePDF API může trvat několik sekund až minut v závislosti na velikosti souboru.</>
                                )}
                                {uploadOptions.performOCR && (
                                    <>
                                        <br />
                                        🔍 OCR bude provedeno v jazyce: <strong>{selectedOCRLanguage}</strong>
                                    </>
                                )}
                                {uploadOptions.performCompression && (
                                    <>
                                        <br />
                                        🗜️ Komprese: <strong>{selectedCompressionLevel}</strong>
                                    </>
                                )}
                                {uploadOptions.textOnly && (
                                    <>
                                        <br />
                                        📄 Text bude extrahován přes webhook a uložen jako .txt soubor
                                    </>
                                )}
                                {uploadOptions.textOnly2 && (
                                    <>
                                        <br />
                                        📄 Text bude extrahován lokálně a uložen jako .txt soubor
                                    </>
                                )}
                            </p>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button 
                            style={styles.button} 
                            onClick={handleUploadProcessingCancel}
                        >
                            Zrušit
                        </button>
                        <button 
                            style={{ ...styles.button, backgroundColor: 'var(--accent-primary)', color: 'white' }}
                            onClick={handleUploadProcessingConfirm}
                        >
                            {uploadOptions.textOnly
                                ? 'Extrahovat text (webhook) a nahrát'
                                : uploadOptions.textOnly2
                                    ? 'Extrahovat text (lokálně) a nahrát'
                                    : (uploadOptions.performOCR || uploadOptions.performCompression 
                                        ? 'Zpracovat a nahrát' 
                                        : 'Nahrát bez zpracování')
                            }
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Správa chatbotů */}
            {isChatbotManagementOpen && (
                <ChatbotManagement 
                    onClose={() => setChatbotManagementOpen(false)} 
                    onOpenChat={(chatbotId, features) => {
                        console.log(`🚀 Otevírám chat: ${chatbotId}`, features);
                        setActiveChatbot({ id: chatbotId, features });
                    }}
                />
            )}

            {/* Modální okno pro přidání videa */}
            <Modal isOpen={isAddVideoModalOpen} onClose={() => setAddVideoModalOpen(false)} title="Přidat video">
                <div style={{ padding: '1rem 0' }}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>URL videa</label>
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://example.com/video.mp4"
                            style={{
                                ...styles.input,
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '1rem',
                            }}
                            disabled={isVideoUploading}
                        />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Vložte URL videa, které chcete odeslat ke zpracování
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            style={{
                                ...styles.button,
                                backgroundColor: 'var(--background-tertiary)',
                                color: 'var(--text-primary)',
                            }}
                            onClick={() => setAddVideoModalOpen(false)}
                            disabled={isVideoUploading}
                        >
                            Zrušit
                        </button>
                        <button
                            style={{
                                ...styles.button,
                                backgroundColor: 'var(--accent-primary)',
                                color: 'white',
                            }}
                            onClick={handleVideoSubmit}
                            disabled={isVideoUploading || !videoUrl.trim()}
                        >
                            {isVideoUploading ? 'Odesílám...' : 'Odeslat'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Aktivní chat */}
            {activeChatbot && (
                <div style={styles.chatOverlay}>
                    <div style={styles.chatContainer}>
                        <div style={styles.chatContent}>
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {console.log('📋 Předávám chatbotId do FilteredSanaChatWithSettings:', activeChatbot.id)}
                                <FilteredSanaChatWithSettings 
                                    chatbotId={activeChatbot.id}
                                    onClose={() => setActiveChatbot(null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Správa uživatelů */}
            {isUserManagementOpen && (
                <UserManagement
                    currentUserId={currentUser.id}
                    onClose={() => setUserManagementOpen(false)}
                />
            )}

            {isProfileSettingsOpen && (
                <Modal
                    isOpen={isProfileSettingsOpen}
                    onClose={() => setProfileSettingsOpen(false)}
                    title=""
                >
                    <ProfileSettings
                        currentUser={currentUser}
                        onClose={() => setProfileSettingsOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

interface TopToolbarProps {
    onUploadClick: () => void;
    viewMode: 'list' | 'grid';
    onViewModeChange: (mode: 'list' | 'grid') => void;
    selectedCount: number;
    onBulkDelete: () => void;
    onBulkDownload: () => void;
    onExportXml: () => void;
    onBulkVectorUpload: () => void;
    onConvertClick: () => void;
    isAnyBookSelected: boolean;
    onChatbotManagementClick: () => void;
    onAddVideoClick: () => void;
    currentUser: User;
    onUserManagementClick: () => void;
    onProfileSettingsClick: () => void;
    onLogoutClick: () => void;
}
const TopToolbar = ({ onUploadClick, viewMode, onViewModeChange, selectedCount, onBulkDelete, onBulkDownload, onExportXml, onBulkVectorUpload, onConvertClick, isAnyBookSelected, onChatbotManagementClick, onAddVideoClick, currentUser, onUserManagementClick, onProfileSettingsClick, onLogoutClick }: TopToolbarProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const isSpravce = currentUser.role === 'spravce';

    return (
        <header style={styles.header}>
            <div style={{display: 'flex', alignItems: 'center', gap: '2rem'}}>
                <img 
                    src="https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/web/image-removebg-preview%20(1).png "
                    alt="MedBase Logo"
                    style={{
                        height: '60px',
                        width: 'auto',
                        objectFit: 'contain'
                    }}
                />
                <div style={styles.headerActions} className="header-actions-responsive">
                    <button style={styles.button} onClick={onUploadClick}><IconUpload /> <span className="button-text">Přidat knihu</span></button>
                    <button style={styles.button} onClick={onAddVideoClick}><IconVideo /> <span className="button-text">Přidat video</span></button>
                    <button style={styles.button} onClick={onConvertClick} disabled={!isAnyBookSelected}><span className="button-text">Konvertovat knihu</span></button>
                    {isSpravce && (
                        <button style={styles.button} onClick={onChatbotManagementClick}><IconChatbot /> <span className="button-text">Správa chatbotů</span></button>
                    )}
                    {isSpravce && (
                        <button style={styles.button} onClick={onUserManagementClick}><IconUser /> <span className="button-text">Správa uživatelů</span></button>
                    )}
                 {selectedCount > 0 && (
                    <div style={{ position: 'relative' }}>
                        <button style={styles.button} onClick={() => setDropdownOpen(o => !o)} onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}>
                            Hromadné akce ({selectedCount}) <IconMoreVertical/>
                        </button>
                        {dropdownOpen && (
                            <div style={styles.dropdownMenu}>
                                <a style={styles.dropdownMenuLink} onClick={() => { onBulkDelete(); setDropdownOpen(false); }}><IconDelete size={14}/> Smazat vybrané</a>
                                <a style={styles.dropdownMenuLink} onClick={() => { onBulkDownload(); setDropdownOpen(false); }}><IconDownload/> Stáhnout vybrané</a>
                                <a style={styles.dropdownMenuLink} onClick={() => { onExportXml(); setDropdownOpen(false); }}><IconExport/> Exportovat do XML</a>
                                <a style={styles.dropdownMenuLink} onClick={() => { onBulkVectorUpload(); setDropdownOpen(false); }}>🗄️ Nahrát do vektorové DB</a>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap'}}>
                <button
                    className="user-info-button"
                    onClick={onProfileSettingsClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: 'var(--background-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap'
                    }}
                    title={currentUser.email}
                >
                    <span 
                        className="user-email-text"
                        style={{ 
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '150px'
                        }}
                    >
                        {currentUser.firstName}
                    </span>
                    <span 
                        className="user-role-badge"
                        style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: isSpravce ? '#e0e7ff' : '#f3e8ff',
                            color: isSpravce ? '#1e40af' : '#6b21a8',
                            borderRadius: '6px',
                            fontWeight: '500'
                        }}
                    >
                        {isSpravce ? 'Správce' : 'Admin'}
                    </span>
                </button>
                <div style={styles.viewToggle}>
                    <button style={{...styles.iconButton, ...(viewMode === 'list' ? styles.iconButtonActive : {})}} onClick={() => onViewModeChange('list')} aria-label="List view"><IconList/></button>
                    <button style={{...styles.iconButton, ...(viewMode === 'grid' ? styles.iconButtonActive : {})}} onClick={() => onViewModeChange('grid')} aria-label="Grid view"><IconGrid/></button>
                </div>
                <button 
                    style={{
                        ...styles.iconButton,
                        padding: '0.5rem'
                    }} 
                    onClick={onProfileSettingsClick}
                    title="Nastavení profilu"
                >
                    <IconSettings />
                </button>
                <button 
                    className="logout-button"
                    style={{
                        ...styles.button,
                        background: 'var(--background-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                    }} 
                    onClick={onLogoutClick}
                    title="Odhlásit se"
                >
                    <IconLogout /> <span className="logout-text">Odhlásit</span>
                </button>
            </div>
        </header>
    );
}

// Komponenta pro omezené zobrazení filtrů s možností rozbalení
const LimitedFilterList = ({ items, selectedItems, onItemClick, maxVisible = 10, renderItem }: { 
    items: string[], 
    selectedItems: string[], 
    onItemClick: (item: string) => void, 
    maxVisible?: number, 
    renderItem?: (item: string, isSelected: boolean) => React.ReactNode 
}) => {
    const [showAll, setShowAll] = useState(false);
    
    if (items.length === 0) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em', fontStyle: 'italic' }}>Žádné položky</div>;
    
    const visibleItems = showAll ? items : items.slice(0, maxVisible);
    const hasMore = items.length > maxVisible;
    
    return (
        <div style={styles.tagList}>
            {visibleItems.map(item => {
                const isSelected = selectedItems.includes(item);
                return (
                    <span key={item} onClick={() => onItemClick(item)}>
                        {renderItem ? renderItem(item, isSelected) : (
                            <span style={{...styles.tag, ...(isSelected ? styles.tagSelected : {})}}>
                                {item}
                            </span>
                        )}
                    </span>
                );
            })}
            {hasMore && (
                <div style={{ width: '100%', textAlign: 'center', marginTop: '8px' }}>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--surface)'
                        }}
                    >
                        {showAll ? `← Zobrazit méně` : `Zobrazit více (+${items.length - maxVisible})`}
                    </button>
                </div>
            )}
        </div>
    );
};

// Komponenta pro minimalistické tlačítkové filtry
const ButtonFilter = <T extends string>({ title, options, selectedValue, onChange }: { 
    title: string, 
    options: { value: T, label: string, icon?: React.ReactNode }[], 
    selectedValue: T, 
    onChange: (value: T) => void 
}) => {
    return (
        <div style={styles.fieldGroup}>
            <label style={styles.label}>{title}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {options.map(option => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        style={{
                            backgroundColor: selectedValue === option.value ? 'var(--accent-primary)' : 'transparent',
                            color: selectedValue === option.value ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${selectedValue === option.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                            minWidth: 'auto'
                        }}
                        title={option.label}
                    >
                        {option.icon && (
                            <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                                {option.icon}
                            </span>
                        )}
                        <span style={{ fontSize: '0.75rem' }}>{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const FilterGroup = ({title, children, onAdd, onDelete, allItems}: {title: string, children: React.ReactNode, onAdd?: () => void, onDelete?: (item: string) => void, allItems?: string[]}) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: string | null }>({ isOpen: false, item: null });
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleDeleteItem = (itemToDelete: string) => {
        setDeleteConfirmation({ isOpen: true, item: itemToDelete });
        setDropdownOpen(false);
        setIsManageModalOpen(false);
    };

    const confirmDeleteItem = () => {
        if (deleteConfirmation.item && onDelete) {
            onDelete(deleteConfirmation.item);
        }
        setDeleteConfirmation({ isOpen: false, item: null });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <div style={styles.fieldGroup}>
                <div style={styles.filterGroupHeader}>
                    <label style={styles.label}>{title}</label>
                    {onAdd && (
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <button 
                                onClick={() => setDropdownOpen(!isDropdownOpen)} 
                                style={styles.addTagButton} 
                                title={`Spravovat ${title.toLowerCase()}`}
                            >
                                <IconAdd/>
                            </button>
                            {isDropdownOpen && (
                                <div style={{
                                    ...styles.tagDropdown,
                                    right: 0,
                                    left: 'auto',
                                    minWidth: '200px'
                                }}>
                                    <a onClick={() => { setDropdownOpen(false); onAdd(); }} style={{...styles.dropdownMenuLink, ...styles.addNewTagLink}}>
                                        <IconAdd/> Vytvořit nový
                                    </a>
                                    {onDelete && allItems && allItems.length > 0 && (
                                        <>
                                            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }}></div>
                                            <a onClick={() => { setDropdownOpen(false); setIsManageModalOpen(true); }} style={{...styles.dropdownMenuLink, color: 'var(--danger-color)'}}>
                                                <IconDelete size={14}/> Spravovat položky
                                            </a>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {children}
            </div>
            {isManageModalOpen && (
                <Modal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    title={`Spravovat ${title.toLowerCase()}`}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                        <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)', margin: 0 }}>
                            Kliknutím na tlačítko "Smazat" odstraníte položku ze systému. Tato akce je nevratná.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {allItems?.map(item => (
                                <div key={item} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--surface)'
                                }}>
                                    <span style={{ flex: 1 }}>{item.replace('_', ' ')}</span>
                                    <button 
                                        onClick={() => handleDeleteItem(item)} 
                                        style={{
                                            background: 'var(--danger-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                        title={`Smazat ${item}`}
                                    >
                                        <IconDelete size={12}/> Smazat
                                    </button>
                                </div>
                            ))}
                            {(!allItems || allItems.length === 0) && (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '20px 0' }}>
                                    Žádné položky k zobrazení.
                                </p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
            {deleteConfirmation.isOpen && (
                <Modal
                    isOpen={deleteConfirmation.isOpen}
                    onClose={() => setDeleteConfirmation({ isOpen: false, item: null })}
                    title="Potvrzení smazání"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p>Opravdu chcete smazat položku "{deleteConfirmation.item}"?</p>
                        <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                            Tato akce je nevratná. Položka bude odebrána ze všech knih.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setDeleteConfirmation({ isOpen: false, item: null })} 
                                style={{ ...styles.button, background: 'var(--surface)', color: 'var(--text)' }}
                            >
                                Zrušit
                            </button>
                            <button 
                                onClick={confirmDeleteItem} 
                                style={{ ...styles.button, background: 'var(--danger-color)', color: 'white' }}
                            >
                                <IconDelete size={16}/> Smazat
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

interface LeftFilterPanelProps {
    filter: string; onFilterChange: (val: string) => void;
    allLabels: string[]; selectedLabels: string[]; onLabelFilterChange: (labels: string[]) => void; onAddLabel: (label: string) => void; onDeleteLabel: (label: string) => void;
    allCategories: string[]; selectedCategories: string[]; onCategoryFilterChange: (cats: string[]) => void; onAddCategory: (cat: string) => void; onDeleteCategory: (cat: string) => void;
    allTypes: string[]; selectedTypes: string[]; onTypeFilterChange: (types: string[]) => void; onAddType: (type: string) => void; onDeleteType: (type: string) => void;
    allVersions: string[]; selectedVersions: string[]; onVersionFilterChange: (versions: string[]) => void;
    allLanguages: string[]; selectedLanguages: string[]; onLanguageFilterChange: (langs: string[]) => void;

    vdbFilter: 'all' | 'success' | 'error' | 'pending'; onVdbFilterChange: (filter: 'all' | 'success' | 'error' | 'pending') => void;
    yearRange: {from: number|null, to: number|null}; onYearRangeChange: (range: {from: number|null, to: number|null}) => void; minYear: number; maxYear: number;
    availableMonths: string[]; dateAddedRange: {from: number, to: number}; onDateAddedRangeChange: (range: {from: number, to: number}) => void;
}
const LeftFilterPanel = (props: LeftFilterPanelProps) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ title: string; onAdd: (name: string) => void } | null>(null);
    const [newItemName, setNewItemName] = useState('');

    const openAddModal = (title: string, onAdd: (name: string) => void) => {
        setModalConfig({ title, onAdd });
        setNewItemName('');
        setModalOpen(true);
    };

    const handleAddNewItem = () => {
        if (newItemName.trim() && modalConfig) {
            modalConfig.onAdd(newItemName.trim());
        }
        setModalOpen(false);
    };

    const handleTagClick = (tag: string, currentSelection: string[], setter: (newSelection: string[]) => void) => {
        const newSelection = new Set(currentSelection);
        if (newSelection.has(tag)) {
            newSelection.delete(tag);
        } else {
            newSelection.add(tag);
        }
        setter(Array.from(newSelection));
    };

    const handleDateRangeChange = (part: 'from' | 'to', value: string) => {
        const numericValue = parseInt(value, 10);
        const newRange = { ...props.dateAddedRange };

        if (part === 'from') {
            newRange.from = Math.min(numericValue, newRange.to);
        } else { // part === 'to'
            newRange.to = Math.max(numericValue, newRange.from);
        }
        props.onDateAddedRangeChange(newRange);
    };
    
    const formatMonthYear = (monthStr: string) => {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        return `${MONTH_NAMES_CS[parseInt(month, 10) - 1]} ${year}`;
    };


    return (
        <>
            <aside style={styles.leftPanel}>
                <FilterGroup title="Hledat">
                    <input type="text" placeholder="Název, autor, klíčové slovo..." style={styles.input} value={props.filter} onChange={e => props.onFilterChange(e.target.value)} />
                </FilterGroup>
                
                <FilterGroup title="Rok vydání">
                    <div style={styles.rangeSliderContainer}>
                        <div style={styles.rangeSliderRowSimple}>
                            <span style={styles.rangeLabel}>Od</span>
                            <input type="range" min={props.minYear} max={props.maxYear} value={props.yearRange.from || props.minYear} onChange={e => props.onYearRangeChange({...props.yearRange, from: parseInt(e.target.value)})} />
                            <span style={styles.rangeValue}>{props.yearRange.from || props.minYear}</span>
                        </div>
                         <div style={styles.rangeSliderRowSimple}>
                            <span style={styles.rangeLabel}>Do</span>
                            <input type="range" min={props.minYear} max={props.maxYear} value={props.yearRange.to || props.maxYear} onChange={e => props.onYearRangeChange({...props.yearRange, to: parseInt(e.target.value)})} />
                            <span style={styles.rangeValue}>{props.yearRange.to || props.maxYear}</span>
                        </div>
                    </div>
                </FilterGroup>

                <FilterGroup title="Datum přidání">
                    <div style={styles.rangeSliderContainer}>
                        <div style={styles.rangeSliderRowSimple}>
                            <span style={styles.rangeLabel}>Od</span>
                            <input type="range" min={0} max={props.availableMonths.length > 0 ? props.availableMonths.length - 1 : 0} value={props.dateAddedRange.from} disabled={props.availableMonths.length === 0} onChange={e => handleDateRangeChange('from', e.target.value)} />
                            <span style={styles.rangeValue}>{formatMonthYear(props.availableMonths[props.dateAddedRange.from])}</span>
                        </div>
                        <div style={styles.rangeSliderRowSimple}>
                            <span style={styles.rangeLabel}>Do</span>
                             <input type="range" min={0} max={props.availableMonths.length > 0 ? props.availableMonths.length - 1 : 0} value={props.dateAddedRange.to} disabled={props.availableMonths.length === 0} onChange={e => handleDateRangeChange('to', e.target.value)} />
                            <span style={styles.rangeValue}>{formatMonthYear(props.availableMonths[props.dateAddedRange.to])}</span>
                        </div>
                    </div>
                </FilterGroup>

                <FilterGroup 
                    title="Typy publikací" 
                    onAdd={() => openAddModal("Zadejte název nového typu publikace", props.onAddType)}
                    onDelete={props.onDeleteType}
                    allItems={props.allTypes}
                >
                    <LimitedFilterList
                        items={props.allTypes}
                        selectedItems={props.selectedTypes}
                        onItemClick={(type) => handleTagClick(type, props.selectedTypes, props.onTypeFilterChange)}
                        renderItem={(type, isSelected) => (
                            <span style={{...styles.tag, ...(isSelected ? styles.tagSelected : {})}}>
                                {type.replace('_', ' ')}
                            </span>
                        )}
                    />
                </FilterGroup>
                
                <FilterGroup 
                    title="Kategorie" 
                    onAdd={() => openAddModal("Zadejte název nové kategorie", props.onAddCategory)}
                    onDelete={props.onDeleteCategory}
                    allItems={props.allCategories}
                >
                    <LimitedFilterList
                        items={props.allCategories}
                        selectedItems={props.selectedCategories}
                        onItemClick={(cat) => handleTagClick(cat, props.selectedCategories, props.onCategoryFilterChange)}
                    />
                </FilterGroup>

                <FilterGroup 
                    title="Štítky" 
                    onAdd={() => openAddModal("Zadejte název nového štítku", props.onAddLabel)}
                    onDelete={props.onDeleteLabel}
                    allItems={props.allLabels}
                >
                    <LimitedFilterList
                        items={props.allLabels}
                        selectedItems={props.selectedLabels}
                        onItemClick={(label) => handleTagClick(label, props.selectedLabels, props.onLabelFilterChange)}
                    />
                </FilterGroup>

                <FilterGroup title="Jazyky">
                    <LimitedFilterList
                        items={props.allLanguages}
                        selectedItems={props.selectedLanguages}
                        onItemClick={(lang) => handleTagClick(lang, props.selectedLanguages, props.onLanguageFilterChange)}
                        renderItem={(lang, isSelected) => (
                            <span style={{...styles.tag, ...(isSelected ? styles.tagSelected : {})}}>
                                {getFlagEmoji(lang)} {lang}
                            </span>
                        )}
                    />
                </FilterGroup>

                <FilterGroup title="Verze vydání">
                    <LimitedFilterList
                        items={props.allVersions}
                        selectedItems={props.selectedVersions}
                        onItemClick={(version) => handleTagClick(version, props.selectedVersions, props.onVersionFilterChange)}
                        renderItem={(version, isSelected) => (
                            <span style={{...styles.tag, ...(isSelected ? styles.tagSelected : {})}}>
                                📖 {version}
                            </span>
                        )}
                    />
                </FilterGroup>

                <ButtonFilter
                    title="VDB"
                    selectedValue={props.vdbFilter}
                    onChange={props.onVdbFilterChange}
                    options={[
                        { value: 'all' as const, label: 'Vše' },
                        { value: 'success' as const, label: 'OK', icon: <IconDatabase status="success" /> },
                        { value: 'error' as const, label: 'Err', icon: <IconDatabase status="error" /> },
                        { value: 'pending' as const, label: '...', icon: <IconDatabase status="pending" /> }
                    ]}
                />
            </aside>
            <Modal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                title={modalConfig?.title || 'Přidat položku'}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        style={styles.input}
                        placeholder="Zadejte název..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewItem(); }}
                        autoFocus
                    />
                    <button onClick={handleAddNewItem} style={{ ...styles.button, alignSelf: 'flex-end' }}>
                        <IconAdd/> Přidat
                    </button>
                </div>
            </Modal>
        </>
    );
}

interface BookListViewProps {
    books: Book[];
    selectedBookId: string | null;
    selectedBookIds: Set<string>;
    onSelectBook: (id: string) => void;
    onToggleSelection: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
    onDeleteBook: (id: string) => void;
    onDownloadBook: (id: string) => void;
    onTestWebhook: (id: string) => void;
    onVectorDatabaseAction: (book: Book) => void;
    vectorProcessingBooks: Set<string>;
}
const BookListView = ({ books, selectedBookId, selectedBookIds, onSelectBook, onToggleSelection, onSelectAll, onDeleteBook, onDownloadBook, onTestWebhook, onVectorDatabaseAction, vectorProcessingBooks }: BookListViewProps) => {
    const isAllSelected = books.length > 0 && selectedBookIds.size === books.length;
    return (
        <div style={styles.bookTableWrapper}>
            <table style={styles.bookTable} className="book-table">
                <thead>
                    <tr>
                        <th style={{...styles.th, width: '40px'}}><input type="checkbox" checked={isAllSelected} onChange={e => onSelectAll(e.target.checked)} /></th>
                        <th style={{...styles.th, width: '40px'}}></th>
                        <th style={styles.th}>Název</th>
                        <th style={styles.th}>Autor</th>
                        <th style={styles.th}>Kategorie</th>
                        <th style={styles.th}>Štítky</th>
                        <th style={styles.th}>Rok vydání</th>
                        <th style={styles.th}>Verze vydání</th>
                        <th style={styles.th}>Typ publikace</th>
                        <th style={styles.th}>Jazyk</th>
                        <th style={styles.th}>Formát</th>
                        <th style={styles.th}>Velikost</th>
                        <th style={styles.th}>Datum přidání</th>
                        <th style={styles.th}>Akce</th>
                    </tr>
                </thead>
                <tbody>
                    {books.map(book => (
                        <tr key={book.id} style={{ ...styles.tr, ...(book.id === selectedBookId ? styles.trSelected : {}) }} className={book.id === selectedBookId ? 'selected' : ''}>
                            <td style={styles.td} onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedBookIds.has(book.id)} onChange={() => onToggleSelection(book.id)} /></td>
                            <td style={{...styles.td, textAlign: 'center', cursor: 'pointer'}} onClick={(e) => {e.stopPropagation(); onVectorDatabaseAction(book);}} title={`Stav vektorové databáze: ${book.vectorStatus === 'pending' ? 'čeká na nahrání' : book.vectorStatus === 'success' ? 'úspěšně nahráno' : 'chyba při nahrávání'}\n\nKlikněte pro odeslání do vektorové databáze.\n${vectorProcessingBooks.has(book.id) ? '⏳ Zpracovává se... (může trvat až 5 minut)' : 'Před odesláním budou zkontrolována povinná metadata.'}`}><IconDatabase status={book.vectorStatus} isLoading={vectorProcessingBooks.has(book.id)} /></td>
                            <td style={{...styles.td, ...styles.tdTitle}} onClick={() => onSelectBook(book.id)}>{book.title}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.author}</td>
                            <td style={{...styles.td, minWidth: '150px'}} onClick={() => onSelectBook(book.id)}>
                                <LimitedTagDisplay 
                                    items={book.categories}
                                    maxVisible={3}
                                    tableMode={true}
                                    renderTag={(c) => <span className="tag" style={{...styles.tag, fontSize: '0.7rem', padding: '2px 6px'}}>{c}</span>}
                                />
                            </td>
                            <td style={{...styles.td, minWidth: '150px'}} onClick={() => onSelectBook(book.id)}>
                                <LimitedTagDisplay 
                                    items={book.labels}
                                    maxVisible={3}
                                    tableMode={true}
                                    renderTag={(l) => <span className="tag" style={{...styles.tag, fontSize: '0.7rem', padding: '2px 6px'}}>{l}</span>}
                                />
                            </td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.publicationYear || '–'}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.releaseVersion || '–'}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>
                                <LimitedTagDisplay 
                                    items={book.publicationTypes}
                                    maxVisible={3}
                                    tableMode={true}
                                    renderTag={(t) => <span className="tag" style={{...styles.tag, fontSize: '0.7rem', padding: '2px 6px'}}>{t.replace('_', ' ')}</span>}
                                />
                            </td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{getFlagEmoji(book.language)}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.format}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{formatFileSize(book.fileSize)}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{formatDate(book.dateAdded)}</td>
                            <td style={{...styles.td, ...styles.tdActions}} onClick={e => e.stopPropagation()}>
                                <button style={styles.iconButton} onClick={() => onDownloadBook(book.id)} aria-label="Stáhnout knihu"><IconDownload/></button>
                                <button style={{...styles.iconButton, color: '#3b82f6'}} onClick={() => onTestWebhook(book.id)} aria-label="Testovat webhook" title="Testovat webhook (pouze zavolá webhook bez mazání knihy)"><IconTestWebhook/></button>
                                <button style={{...styles.iconButton, color: 'var(--danger-color)'}} onClick={() => onDeleteBook(book.id)} aria-label="Smazat knihu"><IconDelete/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface BookGridViewProps {
    books: Book[];
    selectedBookId: string | null;
    onSelectBook: (id: string) => void;
}
const BookGridView = ({ books, selectedBookId, onSelectBook }: BookGridViewProps) => (
    <div style={styles.gridContainer}>
        {books.map(book => (
            <div key={book.id} style={{ ...styles.gridCard, ...(book.id === selectedBookId ? styles.gridCardSelected : {}) }} onClick={() => onSelectBook(book.id)}>
                <img src={book.coverImageUrl} alt={`Cover of ${book.title}`} style={styles.gridCardCover} />
                <h3 style={styles.gridCardTitle}>{book.title}</h3>
                <p style={styles.gridCardAuthor}>{book.author}</p>
            </div>
        ))}
    </div>
);

interface BookDetailPanelProps {
    book: Book;
    onUpdate: (book: Book) => void;
    onDelete: (id: string) => void;
    onTestWebhook: (id: string) => void;
    onCheckQdrantCloud: (id: string, title: string) => void;
    onDebugStorage: (id: string, title: string) => void;
    onTestDeleteImages: (id: string) => void;
    onReadClick: () => void;
    allLabels: string[];
    onAddNewLabel: (labelName: string) => void;
    onDeleteLabel: (labelName: string) => void;
    allCategories: string[];
    onAddNewCategory: (categoryName: string) => void;
    onDeleteCategory: (categoryName: string) => void;
    allPublicationTypes: string[];
    onAddNewPublicationType: (typeName: string) => void;
    onDeletePublicationType: (typeName: string) => void;
    allAvailableLanguages: string[]; // Všechny jazyky z databáze pro dropdown
}
const BookDetailPanel = ({ book, onUpdate, onDelete, onTestWebhook, onCheckQdrantCloud, onDebugStorage, onTestDeleteImages, onReadClick, allLabels, onAddNewLabel, onDeleteLabel, allCategories, onAddNewCategory, onDeleteCategory, allPublicationTypes, onAddNewPublicationType, onDeletePublicationType, allAvailableLanguages }: BookDetailPanelProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localBook, setLocalBook] = useState(book);
    const [isGenerating, setIsGenerating] = useState<Partial<Record<keyof Book, boolean>>>({});
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    
    // OCR a Komprese tlačítka
    const [isTestingOCR, setIsTestingOCR] = useState(false);
    const [isTestingCompression, setIsTestingCompression] = useState(false);
    const [testSelectedLanguage, setTestSelectedLanguage] = useState('Angličtina');
    
    // Vývojářská roleta
    const [showDevTools, setShowDevTools] = useState(false);
    const [testCompressionLevel, setTestCompressionLevel] = useState('recommended');
    
    // Dialogy pro výběr možností
    const [showOCRDialog, setShowOCRDialog] = useState(false);
    const [showCompressionDialog, setShowCompressionDialog] = useState(false);


    // Stabilní callback pro setLocalBook
    const updateLocalBook = useCallback((updater: React.SetStateAction<Book>) => {
        setLocalBook(updater);
    }, []);

    useEffect(() => {
        if (!localBook.id || localBook.id !== book.id) {
            setLocalBook(book);
            setIsEditing(false);
        } else if (localBook.qdrantCloudCollection !== book.qdrantCloudCollection) {
            setLocalBook(prev => ({ ...prev, qdrantCloudCollection: book.qdrantCloudCollection }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [book.id, book.qdrantCloudCollection]);

    // Otevření OCR dialogu
    const handleTestOCR = () => {
        if (!book.filePath || book.format !== 'PDF') {
            alert('OCR lze aplikovat pouze na PDF soubory');
            return;
        }
        setShowOCRDialog(true);
    };

    // Skutečné spuštění OCR s vybraným jazykem
    const executeOCR = async () => {

        setShowOCRDialog(false);
        setIsTestingOCR(true);
        
        try {
            console.log(`🧪 OCR zpracování pro knihu: ${book.title}`);
            console.log(`📄 Soubor: ${book.filePath}`);
            console.log(`🌐 Jazyk: ${testSelectedLanguage}`);

            // Stáhneme soubor z Supabase storage
            const { data: fileData, error } = await supabaseClient.storage
                .from('Books')
                .download(book.filePath);

            if (error) throw error;

            // Převedeme blob na File objekt
            const file = new File([fileData], `${book.title}.pdf`, { type: 'application/pdf' });
            console.log(`📊 Velikost souboru: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

            // Spustíme OCR
            const processedFile = await ILovePDFService.performOCR(file, testSelectedLanguage);
            console.log(`✅ OCR dokončeno. Nová velikost: ${(processedFile.size / 1024 / 1024).toFixed(2)} MB`);

            // Přepíšeme původní soubor v storage
            const { error: uploadError } = await supabaseClient.storage
                .from('Books')
                .update(book.filePath, processedFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Aktualizujeme databázi - OCR flag a velikost souboru
            const newFileSizeKB = Math.round(processedFile.size / 1024);
            const updatedBook = {
                ...book,
                hasOCR: true,
                fileSize: newFileSizeKB
            };

            await supabaseClient
                .from('books')
                .update({ 
                    OCR: true,
                    file_size: newFileSizeKB
                })
                .eq('id', book.id);

            onUpdate(updatedBook);
            
            const originalSizeMB = file.size / 1024 / 1024;
            const newSizeMB = processedFile.size / 1024 / 1024;
            const sizeChange = newSizeMB > originalSizeMB ? 'zvětšil' : 'zmenšil';
            const sizeChangePercent = Math.abs(((newSizeMB - originalSizeMB) / originalSizeMB) * 100);
            
            alert(`✅ OCR úspěšné!\n\nSoubor byl zpracován s OCR (${testSelectedLanguage})\nPůvodní velikost: ${originalSizeMB.toFixed(2)} MB\nNová velikost: ${newSizeMB.toFixed(2)} MB\nSoubor se ${sizeChange} o ${sizeChangePercent.toFixed(1)}%\n\nPůvodní soubor byl nahrazen OCR verzí.\nCesta: ${book.filePath}`);

        } catch (error: any) {
            console.error('❌ OCR zpracování selhalo:', error);
            
            // Specifická zpráva podle typu chyby
            let userMessage = `❌ OCR zpracování selhalo:\n\n${error.message}`;
            
            if (error.message.includes('HTTP 500') || error.message.includes('ServerError')) {
                userMessage = `❌ OCR selhalo - iLovePDF API má problémy\n\n` +
                    `🔧 Co můžete zkusit:\n` +
                    `• Zkuste to za 5-10 minut\n` +
                    `• Zkontrolujte velikost souboru (max ~50MB)\n` +
                    `• Ověřte, že PDF není poškozené\n\n` +
                    `Technická chyba: ${error.message}`;
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = `❌ OCR selhalo - problém s připojením\n\n` +
                    `🌐 Zkontrolujte internetové připojení a zkuste znovu.\n\n` +
                    `Chyba: ${error.message}`;
            }
            
            alert(userMessage);
        } finally {
            setIsTestingOCR(false);
        }
    };

    // Otevření Komprese dialogu
    const handleTestCompression = () => {
        if (!book.filePath || book.format !== 'PDF') {
            alert('Kompresi lze aplikovat pouze na PDF soubory');
            return;
        }
        setShowCompressionDialog(true);
    };


    // Skutečné spuštění komprese s vybranou úrovní
    const executeCompression = async () => {

        setShowCompressionDialog(false);
        setIsTestingCompression(true);
        
        try {
            console.log(`🧪 Komprese pro knihu: ${book.title}`);
            console.log(`📄 Soubor: ${book.filePath}`);
            console.log(`🗜️ Úroveň: ${testCompressionLevel}`);

            // Stáhneme soubor z Supabase storage
            const { data: fileData, error } = await supabaseClient.storage
                .from('Books')
                .download(book.filePath);

            if (error) throw error;

            // Převedeme blob na File objekt
            const originalFile = new File([fileData], `${book.title}.pdf`, { type: 'application/pdf' });
            const originalSizeMB = originalFile.size / 1024 / 1024;
            console.log(`📊 Původní velikost: ${originalSizeMB.toFixed(2)} MB`);

            // Spustíme kompresi
            const compressedFile = await ILovePDFService.compressPDF(originalFile, testCompressionLevel);
            const compressedSizeMB = compressedFile.size / 1024 / 1024;
            const savedPercent = ((originalSizeMB - compressedSizeMB) / originalSizeMB * 100);
            
            console.log(`✅ Komprese dokončena. Nová velikost: ${compressedSizeMB.toFixed(2)} MB`);
            console.log(`💾 Ušetřeno: ${savedPercent.toFixed(1)}%`);

            // Přepíšeme původní soubor v storage
            const { error: uploadError } = await supabaseClient.storage
                .from('Books')
                .update(book.filePath, compressedFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Aktualizujeme databázi - pouze file_size
            const updatedBook = {
                ...book,
                fileSize: Math.round(compressedFile.size / 1024) // převod na KB
            };

            await supabaseClient
                .from('books')
                .update({ 
                    file_size: Math.round(compressedFile.size / 1024)
                })
                .eq('id', book.id);

            onUpdate(updatedBook);
            alert(`✅ Komprese úspěšná!\n\nPůvodní velikost: ${originalSizeMB.toFixed(2)} MB\nNová velikost: ${compressedSizeMB.toFixed(2)} MB\nUšetřeno: ${savedPercent.toFixed(1)}% (${testCompressionLevel})\n\nPůvodní soubor byl nahrazen komprimovanou verzí.\nCesta: ${book.filePath}`);

        } catch (error: any) {
            console.error('❌ Komprese selhala:', error);
            alert(`❌ Komprese selhala:\n\n${error.message}`);
        } finally {
            setIsTestingCompression(false);
        }
    };


    const handleAIGenerate = useCallback(async (field: keyof Book) => {
        setIsGenerating(prev => ({ ...prev, [field]: true }));
        
        try {
            // AUTOMATICKÁ EXTRACTION TEXTU DO MEZIPAMĚTI PŘED AI GENEROVÁNÍM (POUZE PRO AI)
            console.log('🤖 AI generování spuštěno pro pole:', field);
            
            // Kontrola, jestli už není text v mezipaměti
            const cacheStatus = checkCacheStatus(localBook.id);
            if (!cacheStatus.hasCache) {
                console.log('📥 Text není v mezipaměti, spouštím automatickou OCR extrakci přes webhook...');
                
                try {
                    const extractedText = await extractTextViaWebhook(localBook);
                    console.log('✅ Text automaticky extrahován přes OCR webhook do mezipaměti:', extractedText.length, 'znaků');
                    
                    // Aktualizace UI pro zobrazení nového stavu mezipaměti
                    updateLocalBook(prev => ({...prev}));
                    
                } catch (extractError) {
                    console.warn('⚠️ Automatická OCR extrakce selhala, pokračuji s AI generováním bez textu:', extractError);
                    alert('⚠️ Nepodařilo se extrahovat text přes OCR webhook. AI bude generovat metadata pouze z názvu knihy.');
                }
            } else {
                console.log('💾 Text už je v mezipaměti z předchozí OCR extrakce:', cacheStatus.size, 'znaků,', cacheStatus.age, 'starý');
            }
            
            // Pokračování s AI generováním
            const result = await generateMetadataWithAI(field, localBook);
            
            let updatedValue: any = result;
            if (field === 'keywords') {
                updatedValue = result.split(',').map(k => k.trim());
            } else if (field === 'publicationYear') {
                updatedValue = parseInt(result, 10) || localBook.publicationYear;
            }

            updateLocalBook(prev => ({...prev, [field]: updatedValue}));
            
        } catch (error) {
            console.error('❌ Chyba při AI generování:', error);
            alert(`Chyba při generování ${field}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(prev => ({ ...prev, [field]: false }));
        }
    }, [updateLocalBook, localBook.id, checkCacheStatus, extractTextViaWebhook]);

    // NOVÝ HANDLER: Inteligentní generování metadat (auto-detekce OCR)
    const handleBulkIntelligentGenerate = async () => {
        setIsBulkGenerating(true);

        try {
            const format = localBook.format.toLowerCase();
            
            // Ověříme, že je to PDF nebo TXT soubor
            if (format !== 'pdf' && format !== 'txt') {
                alert('⚠️ Inteligentní extrakce metadat je podporována pouze pro PDF a TXT soubory!');
                setIsBulkGenerating(false);
                return;
            }

            console.log('🤖 Spouštím inteligentní extrakci metadat...');

            // Zavoláme inteligentní funkci
            const extractedMetadata = await generateMetadataIntelligent(localBook);

            console.log('📝 Aplikuji extrahovaná metadata:', extractedMetadata);

            // Aktualizujeme localBook s extrahovanými daty
            updateLocalBook(prevBook => {
                const updatedBook = {
                    ...prevBook,
                    ...extractedMetadata
                };
                console.log('📚 Aktualizovaná kniha:', updatedBook);
                return updatedBook;
            });

            console.log('✅ Inteligentní metadata úspěšně aplikována na knihu');

        } catch (error) {
            console.error('❌ Chyba při inteligentní extrakci metadat:', error);
            alert(
                `❌ Chyba při inteligentní extrakci metadat:\n\n` +
                `${error instanceof Error ? error.message : String(error)}\n\n` +
                `Zkuste to prosím znovu nebo použijte jinou metodu.`
            );
        } finally {
            setIsBulkGenerating(false);
        }
    };

    const handleSave = () => {
        onUpdate(localBook);
        setIsEditing(false);
    };

    const handleCancel = () => {
        updateLocalBook(book);
        setIsEditing(false);
    };

    const handleUpdateQdrantMetadata = async () => {
        try {
            console.log('🔄 Aktualizuji Qdrant metadata pro knihu:', book.id);
            console.log('📂 Aktuální categories:', localBook.categories);
            console.log('📂 Aktuální labels:', localBook.labels);
            console.log('📂 Aktuální publicationTypes:', localBook.publicationTypes);
            
            // Nejdříve uložíme změny do Supabase (stejně jako handleSave)
            onUpdate(localBook);
            
            // Pak odešleme kompletní knihu do webhooku
            const result = await api.updateQdrantMetadata(book.id, localBook);
            
            if (result.success) {
                alert(result.message);
                // Po úspěšné aktualizaci ukončíme editaci
                setIsEditing(false);
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Chyba při aktualizaci Qdrant metadata:', error);
            alert(`❌ Neočekávaná chyba při aktualizaci metadata: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
        }
    };

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Kontrola typu souboru
        if (!file.type.startsWith('image/')) {
            alert('❌ Prosím vyberte pouze obrázkové soubory (JPG, PNG, GIF, atd.)');
            return;
        }

        // Kontrola velikosti souboru (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('❌ Soubor je příliš velký. Maximální velikost je 10MB.');
            return;
        }

        try {
            console.log('📷 Nahrávám cover obrázek:', file.name, file.size, 'bytes');
            
            // Nahrání do Books bucketu v podadresáři covers s ID knihy
            const { filePath } = await api.uploadFileWithId(file, 'Books', localBook.id);
            
            // Vytvoření public URL z Books bucketu
            const { data: urlData } = supabaseClient.storage.from('Books').getPublicUrl(filePath);
            const newCoverUrl = urlData.publicUrl;
            
            console.log('✅ Cover úspěšně nahrán:', newCoverUrl);
            
            // Aktualizace lokálního stavu knihy
            const updatedBook = { ...localBook, coverImageUrl: newCoverUrl };
            updateLocalBook(prev => ({ ...prev, coverImageUrl: newCoverUrl }));
            
            // Okamžitá aktualizace hlavního stavu pro zobrazení v grid/list view
            onUpdate(updatedBook);
            
            alert(`✅ Cover obrázek byl úspěšně nahrán!\n\nNový cover: ${file.name}\nVelikost: ${Math.round(file.size / 1024)} KB`);
            
            // Vyčištění inputu
            event.target.value = '';
            
        } catch (error) {
            console.error('❌ Chyba při nahrávání cover:', error);
            alert(`❌ Chyba při nahrávání cover obrázku: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const ReadOnlyView = () => (
        <>
            {renderStaticField("Autor", localBook.author)}
            {renderStaticField("Rok vydání", localBook.publicationYear)}
            {renderStaticField("Verze vydání", localBook.releaseVersion)}
            {renderStaticField("Nakladatelství", localBook.publisher)}
            {renderStaticField("Jazyk", localBook.language)}
            {renderStaticField("Typ publikace", localBook.publicationTypes.length > 0 ? localBook.publicationTypes.map(t => <span key={t} style={styles.tag}>{t.replace('_', ' ')}</span>) : null)}
            {renderStaticField("Sumarizace", localBook.summary, true)}
            {renderStaticField("Klíčová slova", localBook.keywords.length > 0 ? localBook.keywords.map(k => <span key={k} style={styles.tag}>{k}</span>) : null)}
            {renderStaticField("Kategorie", localBook.categories.length > 0 ? localBook.categories.map(c => <span key={c} style={styles.tag}>{c}</span>) : null)}
            {renderStaticField("Štítky", localBook.labels.length > 0 ? localBook.labels.map(t => <span key={t} style={styles.tag}>{t}</span>) : null)}
            {renderStaticField("Stav vektorové DB", (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <IconDatabase status={localBook.vectorStatus} />
                    <span style={{color: localBook.vectorStatus === 'success' ? '#22c55e' : localBook.vectorStatus === 'error' ? '#ef4444' : '#6b7280'}}>
                        {localBook.vectorStatus === 'pending' ? 'Čeká na nahrání' : 
                         localBook.vectorStatus === 'success' ? 'Úspěšně nahráno' : 
                         'Chyba při nahrávání'}
                    </span>
                </div>
            ))}
            {renderStaticField("OCR extrakce textu", (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                    {checkCacheStatus(localBook.id).hasCache && (
                        <span style={{color: '#22c55e'}}>
                            ✅ Text extrahován ({checkCacheStatus(localBook.id).size} znaků, {checkCacheStatus(localBook.id).age} starý)
                        </span>
                    )}

                    {checkCacheStatus(localBook.id).hasCache && (
                        <>
                            <button 
                                style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', background: 'var(--accent-primary)', color: 'white'}}
                                onClick={() => {
                                    const cachedText = getTextFromCache(localBook.id);
                                    if (cachedText) {
                                        // Vytvoření modalu s textem
                                        const modal = document.createElement('div');
                                        modal.style.cssText = `
                                            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                                            background: rgba(0,0,0,0.8); z-index: 10000; 
                                            display: flex; justify-content: center; align-items: center; padding: 20px;
                                        `;
                                        
                                        const content = document.createElement('div');
                                        content.style.cssText = `
                                            background: white; border-radius: 8px; padding: 20px; 
                                            max-width: 80%; max-height: 80%; overflow: auto;
                                            position: relative;
                                        `;
                                        
                                        const closeBtn = document.createElement('button');
                                        closeBtn.innerHTML = '✕';
                                        closeBtn.style.cssText = `
                                            position: absolute; top: 10px; right: 10px; 
                                            background: #ef4444; color: white; border: none; 
                                            border-radius: 50%; width: 30px; height: 30px; 
                                            cursor: pointer; font-size: 16px;
                                        `;
                                        closeBtn.onclick = () => document.body.removeChild(modal);
                                        
                                        const title = document.createElement('h3');
                                        title.textContent = `Extrahovaný text z: ${localBook.title}`;
                                        title.style.cssText = 'margin: 0 0 15px 0; color: #333;';
                                        
                                        const text = document.createElement('div');
                                        text.style.cssText = 'white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.4; color: #333;';
                                        text.textContent = cachedText;
                                        
                                        const info = document.createElement('div');
                                        info.style.cssText = 'margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px; font-size: 12px; color: #666;';
                                        info.innerHTML = `📊 Velikost: ${cachedText.length} znaků | 📅 Staženo: ${new Date().toLocaleString('cs-CZ')}`;
                                        
                                        content.appendChild(closeBtn);
                                        content.appendChild(title);
                                        content.appendChild(text);
                                        content.appendChild(info);
                                        modal.appendChild(content);
                                        document.body.appendChild(modal);
                                        
                                        // Zavření modalu kliknutím mimo obsah
                                        modal.onclick = (e) => {
                                            if (e.target === modal) {
                                                document.body.removeChild(modal);
                                            }
                                        };
                                    }
                                }}
                                title="Zobrazit text z mezipaměti"
                            >
                                👁️ Zobrazit text
                            </button>
                            <button 
                                style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', background: 'var(--danger-color)', color: 'white'}}
                                onClick={() => {
                                    if (confirm('Opravdu chcete smazat text z mezipaměti?')) {
                                        clearTextCache(localBook.id);
                                        updateLocalBook({...localBook});
                                        alert('🗑️ Text z mezipaměti smazán');
                                    }
                                }}
                                title="Smazat text z mezipaměti"
                            >
                                🗑️ Smazat
                            </button>
                        </>
                    )}
                </div>
            ))}
        </>
    );

    const editableContent = useMemo(() => (
        <>
            <EditableField 
                label="Název publikace"
                name="title"
                value={localBook.title}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.title || false}
                type="text"
            />
            <EditableField 
                label="Autor"
                name="author"
                value={localBook.author}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.author || false}
                type="text"
            />
            <EditableField 
                label="Rok vydání"
                name="publicationYear"
                value={String(localBook.publicationYear || '')}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.publicationYear || false}
                type="number"
            />
            <EditableField 
                label="Verze vydání"
                name="releaseVersion"
                value={localBook.releaseVersion || ''}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.releaseVersion || false}
                type="text"
            />
            <EditableField 
                label="Nakladatelství"
                name="publisher"
                value={localBook.publisher}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.publisher || false}
                type="text"
            />
            <LanguageSelector
                value={localBook.language}
                onChange={(language) => setLocalBook(prev => ({ ...prev, language }))}
                onAIGenerate={handleAIGenerate ? () => handleAIGenerate('language') : null}
                isGenerating={isGenerating.language || false}
                allLanguages={allAvailableLanguages}
            />
            <EditableField 
                label="Sumarizace"
                name="summary"
                value={localBook.summary}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.summary || false}
                type="textarea"
            />
            <EditableField 
                label="Klíčová slova (čárkou)"
                name="keywords"
                value={localBook.keywords.join(', ')}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.keywords || false}
                type="text"
            />
             <div style={styles.fieldGroup}>
                <label style={styles.label}>Kategorie</label>
                <TagSelector 
                    selectedTags={localBook.categories} 
                    allTags={allCategories} 
                    onChange={(newCategories) => updateLocalBook(prev => ({ ...prev, categories: newCategories }))}
                    onAddNewTag={onAddNewCategory}
                    onDeleteTag={onDeleteCategory}
                    promptText="Přidat novou kategorii"
                    creationText="Vytvořit novou kategorii"
                />
            </div>
            <div style={styles.fieldGroup}>
                <label style={styles.label}>Štítky</label>
                <TagSelector 
                    selectedTags={localBook.labels} 
                    allTags={allLabels} 
                    onChange={(newLabels) => updateLocalBook(prev => ({ ...prev, labels: newLabels }))}
                    onAddNewTag={onAddNewLabel}
                    onDeleteTag={onDeleteLabel}
                    promptText="Přidat nový štítek"
                    creationText="Vytvořit nový štítek"
                />
            </div>
            <div style={styles.fieldGroup}>
                <label style={styles.label}>Typ publikace</label>
                <TagSelector
                    selectedTags={localBook.publicationTypes}
                    allTags={allPublicationTypes}
                    onChange={(newTypes) => updateLocalBook(prev => ({ ...prev, publicationTypes: newTypes }))}
                    onAddNewTag={onAddNewPublicationType}
                    onDeleteTag={onDeletePublicationType}
                    promptText="Přidat nový typ publikace"
                    creationText="Vytvořit nový typ"
                />
            </div>
            <div style={styles.fieldGroup}>
                <label style={styles.label}>Stav vektorové databáze</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <IconDatabase status={localBook.vectorStatus} />
                    <select 
                        value={localBook.vectorStatus} 
                        onChange={(e) => updateLocalBook(prev => ({ ...prev, vectorStatus: e.target.value as 'pending' | 'success' | 'error' }))}
                        style={styles.input}
                    >
                        <option value="pending">Čeká na nahrání</option>
                        <option value="success">Úspěšně nahráno</option>
                        <option value="error">Chyba při nahrávání</option>
                    </select>
                </div>
            </div>

            <div style={styles.fieldGroup}>
                <label style={styles.label}>Extrakce textu</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                    <span style={{color: checkCacheStatus(localBook.id).hasCache ? '#22c55e' : '#6b7280', fontSize: '0.9em'}}>
                        {checkCacheStatus(localBook.id).hasCache 
                            ? `Text v mezipaměti (${checkCacheStatus(localBook.id).size} znaků, ${checkCacheStatus(localBook.id).age} starý)`
                            : 'Text není v mezipaměti'
                        }
                    </span>

                    <button 
                        style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', background: 'var(--accent-primary)', color: 'white'}}
                        onClick={async () => {
                            try {
                                // Upozornění pro test webhook
                                const shouldProceed = confirm(`📄 ODESLÁNÍ BINÁRNÍHO SOUBORU\n\n⚠️ DŮLEŽITÉ: Před kliknutím na OK:\n1. Přejděte do n8n workflow\n2. Klikněte "Execute workflow" nebo "Listen for test event"\n3. Hned poté klikněte OK\n\nOdešle se binární soubor knihy na webhook\n\nPokračovat?`);
                                if (!shouldProceed) {
                                    return;
                                }
                                
                                console.log('📄 Odesílám binární soubor na webhook...');
                                
                                // Kontrola, jestli už není text v mezipaměti
                                const cacheStatus = checkCacheStatus(localBook.id);
                                if (cacheStatus.hasCache) {
                                    const shouldOverwrite = confirm(`Text už je v mezipaměti (${cacheStatus.size} znaků, ${cacheStatus.age} starý). Chcete ho přepsat přes webhook?`);
                                    if (!shouldOverwrite) {
                                        console.log('❌ Uživatel zrušil přepsání mezipaměti');
                                        return;
                                    }
                                }
                                
                                // Spuštění extrakce přes webhook
                                const extractedText = await extractTextViaWebhook(localBook);
                                
                                // Zobrazení úspěchu
                                alert(`✅ Text úspěšně extrahován přes webhook a uložen do mezipaměti!\n\nVelikost: ${extractedText.length} znaků\n\nPrvních 100 znaků:\n${extractedText.substring(0, 100)}...`);
                                
                                // Aktualizace UI
                                updateLocalBook({...localBook});
                                
                            } catch (error) {
                                console.error('❌ Chyba při extrakci textu přes webhook:', error);
                                alert(`❌ Chyba při extrakci textu přes webhook: ${error instanceof Error ? error.message : String(error)}`);
                            }
                        }}
                        title="Extrahovat text přes n8n webhook (binární soubor) - POZOR: Nejdříve spusťte listening v n8n!"
                    >
                        🌐 Webhook OCR
                    </button>
                    
                    <button 
                        style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', background: '#007bff', color: 'white'}}
                        onClick={async () => {
                            try {
                                // Upozornění pro LLM kontext webhook
                                const shouldProceed = confirm(`KONTEXT PRO LLM\n\n⚠️ DŮLEŽITÉ:\n• Dokument bude omezen na max 50 stránek\n• Výsledek přepíše stávající OCR text v mezipaměti\n• Speciální webhook pro pokročilou OCR extrakci\n\nPokračovat?`);
                                if (!shouldProceed) {
                                    return;
                                }
                                
                                console.log('🧠 Odesílám dokument na LLM kontext webhook...');
                                
                                // Informace o přepsání cache
                                const cacheStatus = checkCacheStatus(localBook.id);
                                if (cacheStatus.hasCache) {
                                    console.log(`💾 Přepíším existující OCR text v mezipaměti (${cacheStatus.size} znaků, ${cacheStatus.age} starý)`);
                                }
                                
                                // Spuštění LLM kontext extrakce
                                const extractedText = await sendToLLMContextWebhook(localBook);
                                
                                // Zobrazení úspěchu
                                alert(`✅ LLM kontext úspěšně extrahován a uložen do mezipaměti!\n\nVelikost: ${extractedText.length} znaků\n(Max 50 stránek)\n\nPrvních 100 znaků:\n${extractedText.substring(0, 100)}...`);
                                
                                // Aktualizace UI
                                updateLocalBook({...localBook});
                                
                            } catch (error) {
                                console.error('❌ Chyba při LLM kontext extrakci:', error);
                                alert(`❌ Chyba při LLM kontext extrakci: ${error instanceof Error ? error.message : String(error)}`);
                            }
                        }}
                        title="Extrahovat obsah pro LLM kontext - max 50 stránek (přepíše stávající OCR text)"
                    >
                        Kontext pro LLM
                    </button>
                    
                    {checkCacheStatus(localBook.id).hasCache && (
                        <>
                            <button 
                                style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', background: 'var(--accent-primary)', color: 'white'}}
                                onClick={() => {
                                    const cachedText = getTextFromCache(localBook.id);
                                    if (cachedText) {
                                        // Vytvoření modalu s textem
                                        const modal = document.createElement('div');
                                        modal.style.cssText = `
                                            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                                            background: rgba(0,0,0,0.8); z-index: 10000; 
                                            display: flex; justify-content: center; align-items: center; padding: 20px;
                                        `;
                                        
                                        const content = document.createElement('div');
                                        content.style.cssText = `
                                            background: white; border-radius: 8px; padding: 20px; 
                                            max-width: 80%; max-height: 80%; overflow: auto;
                                            position: relative;
                                        `;
                                        
                                        const closeBtn = document.createElement('button');
                                        closeBtn.innerHTML = '✕';
                                        closeBtn.style.cssText = `
                                            position: absolute; top: 10px; right: 10px; 
                                            background: #ef4444; color: white; border: none; 
                                            border-radius: 50%; width: 30px; height: 30px; 
                                            cursor: pointer; font-size: 16px;
                                        `;
                                        closeBtn.onclick = () => document.body.removeChild(modal);
                                        
                                        const title = document.createElement('h3');
                                        title.textContent = `Extrahovaný text z: ${localBook.title}`;
                                        title.style.cssText = 'margin: 0 0 15px 0; color: #333;';
                                        
                                        const text = document.createElement('div');
                                        text.style.cssText = 'white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.4; color: #333;';
                                        text.textContent = cachedText;
                                        
                                        const info = document.createElement('div');
                                        info.style.cssText = 'margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px; font-size: 12px; color: #666;';
                                        info.innerHTML = `📊 Velikost: ${cachedText.length} znaků | 📅 Staženo: ${new Date().toLocaleString('cs-CZ')}`;
                                        
                                        content.appendChild(closeBtn);
                                        content.appendChild(title);
                                        content.appendChild(text);
                                        content.appendChild(info);
                                        modal.appendChild(content);
                                        document.body.appendChild(modal);
                                        
                                        // Zavření modalu kliknutím mimo obsah
                                        modal.onclick = (e) => {
                                            if (e.target === modal) {
                                                document.body.removeChild(modal);
                                            }
                                        };
                                    }
                                }}
                                title="Zobrazit text z mezipaměti"
                            >
                                👁️ Zobrazit text
                            </button>
                            <button 
                                style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', background: 'var(--danger-color)', color: 'white'}}
                                onClick={() => {
                                    if (confirm('Opravdu chcete smazat text z mezipaměti?')) {
                                        clearTextCache(localBook.id);
                                        updateLocalBook({...localBook});
                                        alert('🗑️ Text z mezipaměti smazán');
                                    }
                                }}
                                title="Smazat text z mezipaměti"
                            >
                                🗑️ Smazat
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    ), [localBook, updateLocalBook, handleAIGenerate, isGenerating, allCategories, onAddNewCategory, onDeleteCategory, allLabels, onAddNewLabel, onDeleteLabel, allPublicationTypes, onAddNewPublicationType, onDeletePublicationType, checkCacheStatus, clearTextCache, getTextFromCache, extractTextViaWebhook, handleCoverUpload]);

    return (
        <div style={styles.detailContent}>
            <img src={localBook.coverImageUrl} alt={`Obálka: ${localBook.title}`} style={styles.detailCover} />
            <h2 style={styles.detailTitle}>{localBook.title || "Bez názvu"}</h2>
            

            
            <div style={{...styles.detailActions, flexDirection: 'column', gap: '0.5rem'}}>
                 {isEditing ? (
                    <>
                        {/* První řada: Číst knihu, Nahrát cover */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button style={styles.button} onClick={onReadClick}>Číst knihu</button>
                            <input
                                type="file"
                                accept="image/*"
                                id="cover-upload"
                                style={{ display: 'none' }}
                                onChange={handleCoverUpload}
                            />
                            <button 
                                style={styles.button} 
                                onClick={() => document.getElementById('cover-upload')?.click()}
                                title="Nahrát nový cover obrázek"
                            >
                                Nahrát cover
                            </button>
                        </div>
                        
                        {/* Druhá řada: Aktualizovat metadata */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button style={{...styles.button, background: 'var(--accent-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent-secondary)'}} onClick={handleUpdateQdrantMetadata}>Aktualizovat metadata</button>
                        </div>
                        
                        {/* Třetí řada: OCR a Komprese (pouze pro PDF) */}
                        {book.format === 'PDF' && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button 
                                    style={{
                                        ...styles.button,
                                        backgroundColor: isTestingOCR ? '#6c757d' : '#007cba',
                                        color: 'white',
                                        border: 'none'
                                    }}
                                    onClick={handleTestOCR}
                                    disabled={isTestingOCR}
                                    title={`OCR zpracování (${testSelectedLanguage}) - nahradí původní soubor`}
                                >
                                    {isTestingOCR ? '🔄 OCR...' : '🔍 OCR'}
                                </button>
                                <button 
                                    style={{
                                        ...styles.button,
                                        backgroundColor: isTestingCompression ? '#6c757d' : '#ffc107',
                                        color: 'white',
                                        border: 'none'
                                    }}
                                    onClick={handleTestCompression}
                                    disabled={isTestingCompression}
                                    title={`Komprese (${testCompressionLevel}) - nahradí původní soubor`}
                                >
                                    {isTestingCompression ? '🔄 Komprese...' : '🗜️ Komprese'}
                                </button>
                            </div>
                        )}
                        
                        {/* Čtvrtá řada: Vyplnit metadata */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                style={styles.button}
                                onClick={handleBulkIntelligentGenerate}
                                disabled={isBulkGenerating || (localBook.format.toLowerCase() !== 'pdf' && localBook.format.toLowerCase() !== 'txt')}
                                title="Inteligentní extrakce metadat - automaticky detekuje OCR a volá optimální AI model (podporuje PDF a TXT)"
                            >
                                {isBulkGenerating ? 'Generuji...' : <><IconMagic /> Vyplnit metadata</>}
                            </button>
                        </div>
                        
                        {/* Pátá řada: Zrušit, Uložit */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button style={{...styles.button, color: 'var(--danger-color)', background: 'transparent', border: '1px solid var(--danger-color)'}} onClick={handleCancel}>Zrušit</button>
                            <button style={{...styles.button, background: 'transparent', border: '1px solid var(--accent-primary)'}} onClick={handleSave}><IconSave /></button>
                        </div>
                    </>
                 ) : (
                    <>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button style={styles.button} onClick={onReadClick}>Číst knihu</button>
                            <button style={styles.iconButton} onClick={() => setIsEditing(true)} aria-label="Upravit metadata"><IconEdit /></button>
                            <button style={{...styles.iconButton, color: 'var(--danger-color)'}} onClick={() => onDelete(book.id)} aria-label="Smazat knihu"><IconDelete size={18}/></button>
                        </div>
                    </>
                 )}
            </div>
            
            <div style={styles.detailMeta}>
                {isEditing ? editableContent : <ReadOnlyView />}
            </div>
            
            {/* OCR Dialog */}
            {showOCRDialog && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0 }}>🔍 OCR Zpracování</h3>
                        <button 
                                style={styles.modalCloseButton}
                                onClick={() => setShowOCRDialog(false)}
                            >
                                ✕
                        </button>
                    </div>
                        <div style={styles.modalBody}>
                            <p style={{ marginBottom: '1rem' }}>
                                Vyberte jazyk pro OCR zpracování knihy "<strong>{book.title}</strong>":
                            </p>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    Jazyk OCR:
                                </label>
                                <select 
                                    value={testSelectedLanguage}
                                    onChange={(e) => setTestSelectedLanguage(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--background-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {ILovePDFService.getAvailableLanguages().map(lang => (
                                        <option key={lang.code} value={lang.name}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{ 
                                padding: '1rem', 
                                backgroundColor: 'var(--background-tertiary)', 
                                borderRadius: '6px',
                                marginBottom: '1rem',
                                border: '1px solid var(--border-color)'
                            }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    ⚠️ <strong>Upozornění:</strong> OCR zpracování nahradí původní soubor verzí s rozpoznaným textem. 
                                    Proces může trvat až hodinu pro velké soubory.
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button 
                                    style={{...styles.button, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}
                                    onClick={() => setShowOCRDialog(false)}
                                >
                                    Zrušit
                                </button>
                                <button 
                                    style={{...styles.button, backgroundColor: '#007cba', color: 'white'}}
                                    onClick={executeOCR}
                                >
                                    🔍 Spustit OCR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Compression Dialog */}
            {showCompressionDialog && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0 }}>🗜️ Komprese PDF</h3>
                            <button 
                                style={styles.modalCloseButton}
                                onClick={() => setShowCompressionDialog(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{ marginBottom: '1rem' }}>
                                Vyberte úroveň komprese pro knihu "<strong>{book.title}</strong>":
                            </p>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    Úroveň komprese:
                                </label>
                                <select 
                                    value={testCompressionLevel}
                                    onChange={(e) => setTestCompressionLevel(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--background-primary)', 
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <option value="low">Low - Minimální komprese (zachová kvalitu)</option>
                                    <option value="recommended">Recommended - Optimální poměr velikost/kvalita</option>
                                    <option value="extreme">Extreme - Maximální komprese (může snížit kvalitu)</option>
                                </select>
                            </div>
                            
                            <div style={{ 
                                padding: '1rem', 
                                backgroundColor: 'var(--background-tertiary)', 
                            borderRadius: '6px',
                                marginBottom: '1rem',
                            border: '1px solid var(--border-color)'
                        }}>
                                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                                    📊 <strong>Aktuální velikost:</strong> {(book.fileSize / 1024).toFixed(2)} MB
                                </p>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    ⚠️ <strong>Upozornění:</strong> Komprese nahradí původní soubor komprimovanou verzí. 
                                    Proces může trvat až hodinu pro velké soubory.
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                                    style={{...styles.button, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}
                                    onClick={() => setShowCompressionDialog(false)}
                                >
                                    Zrušit
                                </button>
                                <button 
                                    style={{...styles.button, backgroundColor: '#ffc107', color: 'white'}}
                                    onClick={executeCompression}
                                >
                                    🗜️ Spustit Kompresi
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ID knihy */}
            <div style={{
                marginTop: '1.5rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem'
            }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    ID knihy
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {book.id}
                </div>
            </div>

            {/* Databáze Qdrant */}
            <div style={{
                marginTop: '1.5rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem'
            }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Databáze Qdrant
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {localBook.qdrantCloudCollection ? (
                        <>
                            <span style={{ color: '#22c55e', fontSize: '1rem' }}>🗄️</span>
                            <span style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 500 }}>
                                {localBook.qdrantCloudCollection} - Cloud
                            </span>
                        </>
                    ) : (
                        <>
                            <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>🗄️</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>N/A</span>
                        </>
                    )}
                </div>
            </div>

            {/* Vývojářská roleta */}
            <div style={{ 
                marginTop: '2rem', 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '1rem'
            }}>
                <button
                    onClick={() => setShowDevTools(!showDevTools)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: 'var(--background-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                    }}
                >
                    <span>🛠️ Vývojářské nástroje</span>
                    <span style={{ transform: showDevTools ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                </button>
                
                {showDevTools && (
                    <div style={{ 
                        marginTop: '0.5rem',
                        padding: '1rem',
                        backgroundColor: 'var(--background-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <button 
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }} 
                            onClick={() => onTestWebhook(book.id)} 
                            title="Testovat webhook (pouze zavolá webhook bez mazání knihy)"
                        >
                            <IconTestWebhook size={16}/>
                            Testovat webhook
                        </button>
                        
                        <button 
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none'
                            }} 
                            onClick={() => onCheckQdrantCloud(book.id, book.title)} 
                            title="Zkontroluje zda je kniha v Qdrant Cloud a zapíše výsledek do Supabase"
                        >
                            🔎 Zkontrolovat v Qdrant
                        </button>

                        <button 
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none'
                            }} 
                            onClick={() => onDebugStorage(book.id, book.title)} 
                            title="Zkontrolovat storage cesty (otevřete konzoli)"
                        >
                            🔍 Diagnostika storage
                        </button>
                        
                        <button 
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                border: 'none'
                            }} 
                            onClick={() => onTestDeleteImages(book.id)} 
                            title="Testovat mazání images složky (skutečné smazání!)"
                        >
                            🧪 Test mazání images
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Komponenta pro omezené zobrazení tagů/kategorií s možností rozbalení
const LimitedTagDisplay = ({ items, maxVisible = 3, renderTag, tableMode = false }: { items: any[], maxVisible?: number, renderTag: (item: any) => React.ReactNode, tableMode?: boolean }) => {
    const [showAll, setShowAll] = useState(false);
    
    if (items.length === 0) return null;
    
    // PEVNĚ omezíme na maxVisible položek, bez ohledu na jejich šířku
    const visibleItems = showAll ? items : items.slice(0, maxVisible);
    const hasMore = items.length > maxVisible;
    
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            flexWrap: showAll ? 'wrap' : 'nowrap',
            overflow: showAll ? 'visible' : 'hidden'
        }}>
            {visibleItems.map((item, index) => (
                <span key={`${item}-${index}`} style={{ flexShrink: 0 }}>
                    {renderTag(item)}
                </span>
            ))}
            {hasMore && !showAll && (
                tableMode ? (
                    <span
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.8em',
                            padding: '2px 4px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                        }}
                        title={`+${items.length - maxVisible} dalších položek`}
                    >
                        ... (+{items.length - maxVisible})
                    </span>
                ) : (
                    <button
                        onClick={() => setShowAll(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            fontSize: '0.9em',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            textDecoration: 'underline',
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                        }}
                        title={`Zobrazit všech ${items.length} položek`}
                    >
                        ... (+{items.length - maxVisible})
                    </button>
                )
            )}
            {showAll && hasMore && !tableMode && (
                <button
                    onClick={() => setShowAll(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8em',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                    }}
                    title="Zobrazit méně"
                >
                    ← méně
                </button>
            )}
        </div>
    );
};

const renderStaticField = (label: string, value: React.ReactNode | string | number | null, isParagraph = false) => {
    const hasValue = value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '') && (!Array.isArray(value) || value.length > 0);
    return (
        <div style={styles.fieldGroup}>
            <label style={styles.label}>{label}</label>
            <div style={styles.staticTextContainer}>
                {!hasValue && <IconWarning/>}
                <div style={isParagraph ? styles.staticTextParagraph : styles.staticText}>
                    {hasValue ? value : '–'}
                </div>
            </div>
        </div>
    );
};

// Komponenta pro výběr jazyka s dropdownem
interface LanguageSelectorProps {
    value: string;
    onChange: (language: string) => void;
    onAIGenerate: (() => void) | null;
    isGenerating: boolean;
    allLanguages: string[];
}

const LanguageSelector = ({ value, onChange, onAIGenerate, isGenerating, allLanguages }: LanguageSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLanguageSelect = (language: string) => {
        onChange(language);
        setIsOpen(false);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Jazyk:</label>
                {onAIGenerate && (
                    <button
                        onClick={onAIGenerate}
                        disabled={isGenerating}
                        style={{
                            ...styles.aiButton,
                            opacity: isGenerating ? 0.6 : 1,
                            cursor: isGenerating ? 'not-allowed' : 'pointer'
                        }}
                        title="AI generování jazyka"
                    >
                        {isGenerating ? '⏳' : '🤖'}
                    </button>
                )}
            </div>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        ...styles.input,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getFlagEmoji(value)} {value}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {isOpen ? '▲' : '▼'}
                    </span>
                </div>
                {isOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--background-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        {allLanguages.map((language) => (
                            <div
                                key={language}
                                onClick={() => handleLanguageSelect(language)}
                                style={{
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    backgroundColor: language === value ? 'var(--background-secondary)' : 'transparent',
                                    borderBottom: '1px solid var(--border-color)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = language === value ? 'var(--background-secondary)' : 'transparent';
                                }}
                            >
                                {getFlagEmoji(language)} {language}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface EditableFieldProps {
    label: string;
    name: keyof Book;
    value: string;
    setLocalBook: React.Dispatch<React.SetStateAction<Book>>;
    onAIGenerate: ((field: keyof Book) => Promise<void>) | null;
    isGenerating: boolean;
    type?: string;
}

const EditableField = ({ label, name, value, setLocalBook, onAIGenerate, isGenerating, type = 'text' }: EditableFieldProps) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let updatedValue: any = value;
        if (name === 'keywords' || name === 'labels' || name === 'categories' || name === 'publicationTypes') {
            updatedValue = value.split(',').map(k => k.trim());
        } else if(name === 'publicationYear') {
            updatedValue = value ? parseInt(value, 10) : null;
        }
        setLocalBook(prev => ({...prev, [name]: updatedValue}));
    }, [setLocalBook]);

    const handleAIGenerate = useCallback(() => {
        if (onAIGenerate) {
            onAIGenerate(name as keyof Book);
        }
    }, [onAIGenerate, name]);
    
    const InputComponent = type === 'textarea' ? 'textarea' : 'input';

    return (
        <div style={styles.fieldGroup}>
            <label style={styles.label}>{label}</label>
            <div style={styles.inputWithAction}>
                <InputComponent 
                    name={name as string} 
                    value={value} 
                    onChange={handleChange} 
                    style={type === 'textarea' ? {...styles.textarea, minHeight: '100px'} : styles.input} 
                    type={type === 'number' ? 'number' : 'text'} 
                />
                {onAIGenerate && (
                    <button onClick={handleAIGenerate} disabled={isGenerating} style={{
                        ...styles.aiButton,
                        opacity: 1, // Vždy zobrazit tlačítko
                        cursor: isGenerating ? 'not-allowed' : 'pointer'
                    }} aria-label={`Generovat ${label}`}>
                        {isGenerating ? '...' : <IconMagic />}
                    </button>
                )}
            </div>
        </div>
    );
};

const renderEditableField = (label: string, name: keyof Book, value: string, setLocalBook: React.Dispatch<React.SetStateAction<Book>>, onAIGenerate: ((field: keyof Book) => Promise<void>) | null, isGenerating: boolean, type = 'text') => {
    return <EditableField 
        label={label}
        name={name}
        value={value}
        setLocalBook={setLocalBook}
        onAIGenerate={onAIGenerate}
        isGenerating={isGenerating}
        type={type}
    />;
};

// --- STYLES ---

const styles: { [key: string]: React.CSSProperties } = {
    appContainer: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--background-primary)', color: 'var(--text-primary)' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px', backgroundColor: 'var(--background-secondary)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 },
    headerActions: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    mainContent: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
    leftPanel: { width: '320px', flexShrink: 0, borderRight: '1px solid var(--border-color)', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--background-secondary)' },
    bookListContainer: { flexGrow: 1, overflow: 'auto', padding: '1rem' },
    detailPanel: { width: '420px', flexShrink: 0, borderLeft: '1px solid var(--border-color)', overflowY: 'auto', backgroundColor: 'var(--background-secondary)' },
    button: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--background-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease', fontSize: '14px', boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap' },
    buttonSuccess: { backgroundColor: '#28a745', color: 'white', borderColor: '#28a745' },
    buttonDanger: { backgroundColor: 'var(--danger-color)', color: 'white', borderColor: 'var(--danger-color)' },
    viewToggle: { display: 'flex', backgroundColor: 'var(--background-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px' },
    iconButton: { background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' },
    iconButtonActive: { backgroundColor: 'var(--accent-primary)', color: '#fff', boxShadow: 'var(--shadow-sm)' },
    detailContent: { padding: '1.5rem', display: 'flex', flexDirection: 'column' },
    detailCover: { width: '150px', height: '225px', objectFit: 'cover', borderRadius: '8px', alignSelf: 'center', marginBottom: '0.5rem', backgroundColor: 'var(--background-tertiary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' },
    detailTitle: { fontSize: '1.25rem', fontWeight: 600, textAlign: 'center', marginBottom: '1rem' },
    detailActions: { display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' },
    detailMeta: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    filterGroupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
    label: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', padding: '8px 12px', backgroundColor: 'var(--background-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '1rem' },
    textarea: { width: '100%', padding: '8px 12px', backgroundColor: 'var(--background-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' },
    inputWithAction: { position: 'relative', display: 'flex' },
    aiButton: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' },
    addTagButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' },
    checkboxGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'capitalize' },
    bookTableWrapper: { overflowX: 'auto' },
    bookTable: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
    tr: { transition: 'background-color 0.15s' },
    trSelected: { backgroundColor: 'var(--accent-primary-hover)', color: '#fff' },
    td: { padding: '12px 8px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', verticalAlign: 'middle', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    tdActions: { display: 'flex', gap: '4px', alignItems: 'center' },
    tdTitle: { fontWeight: 500 },
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' },
    gridCard: { backgroundColor: 'var(--background-secondary)', borderRadius: '8px', padding: '1rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--border-color)' },
    gridCardSelected: { borderColor: 'var(--accent-primary)', boxShadow: '0 0 10px rgba(93, 127, 163, 0.3)' },
    gridCardCover: { width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '1rem', backgroundColor: 'var(--background-tertiary)' },
    gridCardTitle: { fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    gridCardAuthor: { fontSize: '0.875rem', color: 'var(--text-secondary)' },
    staticTextContainer: { display: 'flex', alignItems: 'center', gap: '8px'},
    staticText: { fontSize: '1rem' },
    staticTextParagraph: { fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' },
    tag: { backgroundColor: 'var(--background-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid var(--border-color)', display: 'inline-block' },
    tagSelected: { backgroundColor: 'var(--accent-beige)', color: 'var(--background-secondary)', borderColor: 'var(--accent-beige)' },
    tagList: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    dropdownMenu: { position: 'absolute', top: 'calc(100% + 5px)', right: 0, backgroundColor: 'var(--background-secondary)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', zIndex: 10, minWidth: '220px', overflow: 'hidden', padding: '5px 0' },
    dropdownMenuLink: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', color: 'var(--text-primary)', textDecoration: 'none', cursor: 'pointer', fontSize: '14px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
    modalContent: { backgroundColor: 'var(--background-secondary)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: 'var(--shadow-md)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' },
    modalCloseButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 },
    modalBody: {},
    rangeSliderContainer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    rangeSliderRowSimple: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '1rem' },
    rangeLabel: { fontSize: '0.9rem', color: 'var(--text-secondary)' },
    rangeValue: { fontSize: '0.9rem', color: 'var(--text-primary)', minWidth: '80px', textAlign: 'right' },
    tagInputContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px 8px', backgroundColor: 'var(--background-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', minHeight: '42px', alignItems: 'center' },
    tagRemoveButton: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '4px', padding: '0', fontSize: '14px', fontWeight: 'bold', lineHeight: 1, opacity: 0.5 },
    tagInputAddButton: { background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginLeft: 'auto' },
    tagDropdown: { position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, backgroundColor: 'var(--background-secondary)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', padding: '5px 0' },
    addNewTagLink: { borderTop: '1px solid var(--border-color)', color: 'var(--accent-primary)', fontWeight: 500, },
    
    // Chat overlay styles
    chatOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '10px',
    },
    chatContainer: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '98%',
        maxWidth: '1000px',
        height: '98%',
        minHeight: '80vh',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        // Responzivní úpravy pro menší obrazovky
        '@media (max-width: 768px)': {
            width: '100%',
            height: '100%',
            borderRadius: '0px',
        },
    },
    chatHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    chatTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
    },
    chatFeatures: {
        display: 'flex',
        gap: '8px',
    },
    featureBadge: {
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
    },
    chatCloseButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '16px',
        transition: 'all 0.2s',
    },
    chatContent: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0, // Důležité pro správné fungování flex
    },
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Feed Agent - samostatná testovací stránka */}
        <Route path="/feed-agent" element={<FeedAgentPage />} />

        {/* Reset hesla */}
        <Route path="/reset-password" element={
          <AuthGuard>
            {(currentUser) => (
              <>
                <App currentUser={currentUser} />
                <ChatWidget currentUser={currentUser} />
              </>
            )}
          </AuthGuard>
        } />

        {/* Embed Wany Chat */}
        <Route path="/embed/vany-chat" element={
          <AuthGuard>
            {(currentUser) => (
              <>
                <App currentUser={currentUser} />
                <ChatWidget currentUser={currentUser} />
              </>
            )}
          </AuthGuard>
        } />

        {/* Hlavní aplikace */}
        <Route path="/*" element={
          <AuthGuard>
            {(currentUser) => (
              <>
                <App currentUser={currentUser} />
                <ChatWidget currentUser={currentUser} />
              </>
            )}
          </AuthGuard>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
// Test function for new iLovePDF processing
(window as any).testILovePDFFixed = async () => {
    console.log('🧪 Testování opravené iLovePDF služby...');
    
    try {
        // Test API status
        const status = await ILovePDFService.checkAPIStatus();
        console.log('📊 API Status:', status);
        
        if (!status.available) {
            console.error('❌ iLovePDF API není dostupné');
            return status;
        }
        
        console.log(`✅ API je dostupné, zbývající kredity: ${status.credits}`);
        return status;
        
    } catch (error) {
        console.error('❌ Test selhał:', error);
        return { success: false, error };
    }
};
