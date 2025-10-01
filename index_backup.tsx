
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// Removed GoogleGenAI import - using direct fetch API calls instead
import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

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
    dateAdded: string; // ISO string, maps to created_at
    hasOCR: boolean; // indikuje zda dokument obsahuje OCR text
    content: string;
    filePath: string; // path in supabase storage
    vectorStatus: 'pending' | 'success' | 'error'; // Status nahrání do vektorové databáze
}

// --- ICONS ---
const IconMagic = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3L12 2z"></path><path d="M22 12l-3 3-3-3"></path><path d="M12 22l3-3 3 3"></path></svg>;
const IconGrid = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconList = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconUpload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const IconDelete = ({size = 16}: {size?:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2 2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const IconMoreVertical = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const IconTag = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const IconWarning = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconExport = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconAdd = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconDatabase = ({status = 'pending'}: {status?: 'pending' | 'success' | 'error'}) => {
    const getColor = () => {
        switch(status) {
            case 'success': return '#22c55e'; // zelená
            case 'error': return '#ef4444'; // červená  
            case 'pending':
            default: return '#6b7280'; // šedá
        }
    };
    
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={getColor()} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
    );
};

const IconOCR = ({hasOCR = false}: {hasOCR?: boolean}) => {
    const color = hasOCR ? '#22c55e' : '#6b7280'; // zelená pokud má OCR, jinak šedá
    
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
    );
};


// --- HELPERS & API ---

const getFlagEmoji = (language: string) => {
    if (!language) return '🏳️';
    const lang = language.toLowerCase();
    if (lang === 'čeština') return '🇨🇿';
    if (lang.includes('eng') || lang.includes('angličtina')) return '🇬🇧';
    if (lang.includes('sloven')) return '🇸🇰';
    if (lang.includes('něm')) return '🇩🇪';
    return '🏳️';
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
console.log('🔧 Inicializuji Gemini AI...');

// Try to load API key from multiple sources
const getGeminiApiKey = (): string | null => {
    // 1. Try environment variable (from .env file via Vite)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY') {
        console.log('✅ Gemini API klíč načten z environment variables');
        return process.env.GEMINI_API_KEY;
    }
    
    // 2. Try localStorage (user can set it manually)
    if (typeof window !== 'undefined') {
        const storedKey = localStorage.getItem('GEMINI_API_KEY');
        if (storedKey && storedKey !== 'PLACEHOLDER_API_KEY') {
            console.log('✅ Gemini API klíč načten z localStorage');
            return storedKey;
        }
    }
    
    console.warn('⚠️ Gemini API klíč nenalezen');
    return null;
};

const GEMINI_API_KEY = getGeminiApiKey();

// Debug načítání API klíče
console.log('🔍 DEBUG: process.env.GEMINI_API_KEY =', process.env.GEMINI_API_KEY);
console.log('🔍 DEBUG: localStorage GEMINI_API_KEY =', typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : 'N/A');
console.log('🔍 DEBUG: Final GEMINI_API_KEY =', GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : 'null');

const sanitizeFilePath = (filename: string): string => {
    const sanitized = filename
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .replace(/[^\w.-]/g, '_') // Replace non-word characters (except ., -) with _
        .replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
    return sanitized;
};


// --- Supabase Type Definition ---
export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          created_at: string
          title: string
          author: string
          publication_year: number | null
          publisher: string
          summary: string
          keywords: string[]
          language: string
          format: string
          file_size: number
          cover_image_url: string
          publication_types: string[]
          labels: string[]
          categories: string[]
          file_path: string
          OCR: boolean
          Vdtb: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          author?: string
          publication_year?: number | null
          publisher?: string
          summary?: string
          keywords?: string[]
          language?: string
          format: string
          file_size: number
          cover_image_url: string
          publication_types?: string[]
          labels?: string[]
          categories?: string[]
          file_path: string
          OCR?: boolean
          Vdtb?: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          author?: string
          publication_year?: number | null
          publisher?: string
          summary?: string
          keywords?: string[]
          language?: string
          format?: string
          file_size?: number
          cover_image_url?: string
          publication_types?: string[]
          labels?: string[]
          categories?: string[]
          file_path?: string
          OCR?: boolean
          Vdtb?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// --- Supabase Client Setup ---
const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';
const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

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
    console.log('🔄 mapSupabaseToBook - OCR z DB:', data.OCR, 'pro knihu:', data.title);
    return {
        id: data.id,
        title: data.title,
        author: data.author || 'Neznámý',
        publicationYear: data.publication_year,
        publisher: data.publisher || '',
        summary: data.summary || '',
        keywords: parseSupabaseArray(data.keywords),
        language: data.language || 'Neznámý',
        format: data.format,
        fileSize: data.file_size,
        coverImageUrl: data.cover_image_url,
        publicationTypes: parseSupabaseArray(data.publication_types),
        labels: parseSupabaseArray(data.labels),
        categories: parseSupabaseArray(data.categories),
        dateAdded: data.created_at,
        filePath: data.file_path,
        content: '', // Content will be loaded on demand
        vectorStatus: (data.Vdtb as 'pending' | 'success' | 'error') || 'pending',
        hasOCR: data.OCR || false,
    };
};

const api = {
    async getBooks(): Promise<Book[]> {
        const { data, error } = await supabaseClient
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) { console.error('Error fetching books:', error.message, error); throw error; }
        return data ? data.map(mapSupabaseToBook) : [];
    },
    async updateBook(book: Book): Promise<Book> {
        const updateData: Database['public']['Tables']['books']['Update'] = {
            title: book.title, author: book.author, publication_year: book.publicationYear,
            publisher: book.publisher, summary: book.summary, keywords: book.keywords, language: book.language,
            format: book.format, file_size: book.fileSize, cover_image_url: book.coverImageUrl,
            publication_types: book.publicationTypes, labels: book.labels, categories: book.categories, file_path: book.filePath,
            OCR: book.hasOCR,
            Vdtb: book.vectorStatus,
        };
        const { data, error } = await supabaseClient.from('books').update(updateData).eq('id', book.id).select().single();
        if (error) { console.error('Error updating book:', error.message, error); throw error; }
        if (!data) { throw new Error("Book not found after update."); }
        return mapSupabaseToBook(data);
    },
    async deleteBook(bookId: string, filePath: string, coverImageUrl: string): Promise<void> {
        const errors: string[] = [];
        
        // Step 1: Delete cover image from Storage (if it's not a placeholder)
        if (coverImageUrl && !coverImageUrl.includes('placehold.co')) {
            try {
                // Extract the actual file path from the coverImageUrl
                // URLs look like: https://[project].supabase.co/storage/v1/object/public/covers/book_123.jpg
                // or: https://[project].supabase.co/storage/v1/object/public/Books/covers/book_123.jpg
                const urlParts = coverImageUrl.split('/storage/v1/object/public/');
                if (urlParts.length < 2) {
                    console.warn('Cannot parse cover URL for deletion:', coverImageUrl);
                    errors.push('Nelze zparsovat URL cover obrázku pro smazání');
                } else {
                
                const fullPath = urlParts[1]; // e.g., "covers/book_123.jpg" or "Books/covers/book_123.jpg"
                let bucket: string;
                let filePath: string;
                
                if (fullPath.startsWith('covers/')) {
                    // Cover is in covers bucket: covers/book_123.jpg
                    bucket = 'covers';
                    filePath = fullPath.substring('covers/'.length); // book_123.jpg
                } else if (fullPath.startsWith('Books/covers/')) {
                    // Cover is in Books bucket subfolder: Books/covers/book_123.jpg
                    bucket = 'Books';
                    filePath = fullPath.substring('Books/'.length); // covers/book_123.jpg
                } else {
                    console.warn('Unknown cover URL format:', coverImageUrl);
                    errors.push('Neznámý formát URL cover obrázku');
                    bucket = '';
                    filePath = '';
                }
                
                if (bucket && filePath) {
                    console.log(`Attempting to delete cover: ${filePath} from ${bucket} bucket`);
                    const { error: coverError } = await supabaseClient.storage.from(bucket).remove([filePath]);
                    
                    if (coverError) {
                        console.error('COVER DELETE FAILED:', coverError);
                        errors.push(`Nepodařilo se smazat cover obrázek: ${coverError.message}`);
                    } else {
                        console.log(`Cover deleted successfully from ${bucket} bucket: ${filePath}`);
                    }
                }
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
        
        // Step 3: Delete record from Database (ALWAYS attempt this, even if file deletion failed)
        try {
            const { error: dbError } = await supabaseClient.from('books').delete().eq('id', bookId);
            if (dbError) {
                console.error('DATABASE DELETE FAILED:', dbError);
                errors.push(`Nepodařilo se smazat záznam z databáze: ${dbError.message}`);
            } else {
                console.log('Book record deleted successfully from database');
            }
        } catch (e) {
            console.error('DATABASE DELETE ERROR:', e);
            errors.push(`Chyba při mazání záznamu z databáze: ${e}`);
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
        return { filePath, fileSize: Math.round(file.size / 1024) };
    },
    async uploadFileWithId(file: File, bucket: string, bookId: string): Promise<{ filePath: string, fileSize: number }> {
        const fileExtension = file.name.split('.').pop() || '';
        let filePath: string;
        
        if (bucket === 'covers') {
            // Cover files always as JPG in covers bucket
            filePath = `${bookId}.jpg`;
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
        return { filePath, fileSize: Math.round(file.size / 1024) };
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
                return await this.extractPdfTextContent(data, false); // Standardní extrakce
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
    
    // ROBUSTNÍ FUNKCE PRO EXTRAKCI TEXTU Z PDF - BEZPODMÍNEČNÁ PRO OCR DOKUMENTY
    async extractPdfTextContent(fileData: Blob, forceExtraction: boolean = false): Promise<string> {
        console.log("🚀 SPOUŠTÍM SUPER ROBUSTNÍ OCR EXTRAKCI...");
        console.log("🔍 Force extraction:", forceExtraction ? "✅ ANO (OCR dokument)" : "❌ NE");
        
        const extractionMethods = [
            () => this.tryAdvancedPdfJs(fileData, forceExtraction),
            () => this.tryRawPdfParsing(fileData),
            () => this.tryBinaryPdfParsing(fileData),
            () => this.tryStreamDecoding(fileData),
            () => this.tryAlternativePdfParsing(fileData)
        ];
        
        // Zkusíme všechny metody dokud jedna neuspěje
        for (let i = 0; i < extractionMethods.length; i++) {
            try {
                console.log(`🔄 Zkouším metodu ${i + 1}/${extractionMethods.length}...`);
                const result = await extractionMethods[i]();
                
                if (result && result.length > 50) {
                    console.log(`✅ ÚSPĚCH! Metoda ${i + 1} extrahovala ${result.length} znaků`);
                    console.log(`📝 Ukázka: "${result.substring(0, 200)}..."`);
                    return result;
                }
            } catch (error) {
                console.log(`❌ Metoda ${i + 1} selhala:`, error.message);
                continue;
            }
        }
        
        // Pokud všechny metody selhaly
        if (forceExtraction) {
            throw new Error("❌ KRITICKÁ CHYBA: Všech 5 metod extrakce selhalo pro OCR dokument!");
        } else {
            return "❌ PDF neobsahuje čitelný text nebo vyžaduje OCR zpracování.";
    },

    // METODA 1: Rozšířený PDF.js s agresivními nastaveními
    async tryAdvancedPdfJs(fileData: Blob, forceExtraction: boolean): Promise<string> {
        const arrayBuffer = await fileData.arrayBuffer();
        console.log("📦 PDF načten, velikost:", Math.round(arrayBuffer.byteLength / 1024), "KB");
        
        // Různé konfigurace PDF.js pro OCR PDF
        const configs = [
            { 
                useSystemFonts: true, 
                disableFontFace: false, 
                disableRange: false, 
                disableStream: false,
                verbosity: forceExtraction ? 1 : 0
            },
            { 
                useSystemFonts: false, 
                disableFontFace: true, 
                disableRange: true, 
                disableStream: true,
                verbosity: 1
            },
            {
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
                useSystemFonts: true
            }
        ];
        
        for (const config of configs) {
            try {
                // Pokus 1: Standardní načtení
                const loadingTask = pdfjsLib.getDocument({
                    data: arrayBuffer,
                    useSystemFonts: true,
                    disableFontFace: false,
                    verbosity: forceExtraction ? 1 : 0
                });
                pdf = await loadingTask.promise;
            } catch (error) {
                if (forceExtraction) {
                    console.log("🔄 Standardní načtení selhalo, zkouším alternativní konfiguraci...");
                    try {
                        // Pokus 2: S vypnutými fonty
                        const loadingTask2 = pdfjsLib.getDocument({
                            data: arrayBuffer,
                            useSystemFonts: false,
                            disableFontFace: true,
                            verbosity: 1
                        });
                        pdf = await loadingTask2.promise;
                    } catch (error2) {
                        console.log("🔄 Alternativní konfigurace selhala, zkouším základní...");
                        // Pokus 3: Pouze základní konfigurace
                        const loadingTask3 = pdfjsLib.getDocument(arrayBuffer);
                        pdf = await loadingTask3.promise;
                    }
                } else {
                    throw error;
                }
            }
            
            console.log(`📄 PDF úspěšně načten - ${pdf.numPages} stránek`);
            
            // Nastavení limitů
            const MAX_PAGES = 50;
            const MAX_CHARS = 150000;
            const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES);
            
            let allText = "";
            let totalChars = 0;
            let pagesWithText = 0;
            let totalPagesProcessed = 0;
            
            console.log(`🔄 Začínám extrakci textu z ${pagesToProcess} stránek...`);
            
            // Projdeme všechny stránky a extrahujeme text
            for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
                totalPagesProcessed++;
                try {
                    const page = await pdf.getPage(pageNum);
                    
                    // Zkusíme různé přístupy k getTextContent
                    let textContent;
                    try {
                        // Pokus 1: Standardní getTextContent
                        textContent = await page.getTextContent();
                    } catch (textError) {
                        if (forceExtraction) {
                            console.log(`🔄 Stránka ${pageNum}: Standardní getTextContent selhalo, zkouším s parametry...`);
                            try {
                                // Pokus 2: S normalizací
                                textContent = await page.getTextContent({
                                    normalizeWhitespace: true,
                                    disableCombineTextItems: false
                                });
                            } catch (textError2) {
                                console.log(`🔄 Stránka ${pageNum}: getTextContent s parametry selhalo, zkouším bez kombinování...`);
                                // Pokus 3: Bez kombinování textových položek
                                textContent = await page.getTextContent({
                                    normalizeWhitespace: false,
                                    disableCombineTextItems: true
                                });
                            }
                        } else {
                            throw textError;
                        }
                    }
                    
                    // ROZŠÍŘENÉ AGRESIVNÍ EXTRAKCE - více přístupů
                    let pageText = "";
                    
                    // DEBUGGING: Zobrazíme informace o textContent
                    if (forceExtraction && pageNum <= 3) {
                        console.log(`🔍 DEBUG stránka ${pageNum}:`, {
                            itemsCount: textContent.items.length,
                            firstItems: textContent.items.slice(0, 5).map(item => ({
                                str: (item as any).str,
                                hasEOL: (item as any).hasEOL,
                                transform: (item as any).transform,
                                width: (item as any).width,
                                height: (item as any).height
                            }))
                        });
                    }
                    
                    // Přístup 1: Standardní extrakce s filtrováním
                    const pageTextItems = textContent.items
                        .filter(item => 'str' in item && item.str.trim().length > 0)
                        .map(item => (item as any).str);
                    
                    pageText = pageTextItems.join(' ').trim();
                    
                    // Přístup 2: Pokud nic nenajdeme, zkusíme bez filtrování
                    if (pageText.length === 0) {
                        console.log(`🔄 Stránka ${pageNum}: Zkouším extrakci bez filtrování...`);
                        const allItems = textContent.items.map(item => (item as any).str || '');
                        pageText = allItems.join('').trim();
                    }
                    
                    // Přístup 3: Zkusíme s mezerami mezi položkami
                    if (pageText.length === 0) {
                        console.log(`🔄 Stránka ${pageNum}: Zkouším extrakci s mezerami...`);
                        const spacedItems = textContent.items
                            .map(item => (item as any).str || '')
                            .filter(str => str.length > 0)
                            .join(' ');
                        pageText = spacedItems.trim();
                    }
                    
                    // Přístup 4: Zkusíme získat i skryté znaky a EOL
                    if (pageText.length === 0) {
                        console.log(`🔄 Stránka ${pageNum}: Zkouším extrakci včetně skrytých znaků...`);
                        const rawText = textContent.items
                            .map(item => {
                                const str = (item as any).str || '';
                                const hasEOL = (item as any).hasEOL;
                                return str + (hasEOL ? '\n' : '');
                            })
                            .join('');
                        pageText = rawText.trim();
                    }
                    
                    // Přístup 5: Zkusíme extrakci na základě pozice textu
                    if (pageText.length === 0 && forceExtraction) {
                        console.log(`🔄 Stránka ${pageNum}: Zkouším pozičně orientovanou extrakci...`);
                        const sortedItems = textContent.items
                            .filter(item => 'str' in item && (item as any).str)
                            .sort((a: any, b: any) => {
                                const aY = a.transform ? a.transform[5] : 0;
                                const bY = b.transform ? b.transform[5] : 0;
                                const aX = a.transform ? a.transform[4] : 0;
                                const bX = b.transform ? b.transform[4] : 0;
                                // Seřadíme podle Y pozice (shora dolů) a pak podle X (zleva doprava)
                                return bY - aY || aX - bX;
                            })
                            .map(item => (item as any).str);
                        pageText = sortedItems.join(' ').trim();
                    }
                    
                    // Přístup 6: Zkusíme extrakci všech možných vlastností
                    if (pageText.length === 0 && forceExtraction) {
                        console.log(`🔄 Stránka ${pageNum}: Zkouším extrakci všech vlastností...`);
                        const allProps = textContent.items
                            .map(item => {
                                const anyItem = item as any;
                                return [
                                    anyItem.str,
                                    anyItem.unicode,
                                    anyItem.chars,
                                    anyItem.textContent
                                ].filter(Boolean).join('');
                            })
                            .filter(text => text && text.length > 0);
                        pageText = allProps.join(' ').trim();
                    }
                    
                    // Přístup 7: Pokud stále nic, zkusíme renderování a OCR simulaci
                    if (pageText.length === 0 && forceExtraction) {
                        console.log(`🔄 Stránka ${pageNum}: Zkouším alternativní PDF API...`);
                        try {
                            // Zkusíme získat viewport a render informace
                            const viewport = page.getViewport({ scale: 1.0 });
                            console.log(`📐 Stránka ${pageNum} viewport:`, {
                                width: viewport.width,
                                height: viewport.height
                            });
                            
                            // Zkusíme získat obsah jiným způsobem
                            const operatorList = await page.getOperatorList();
                            if (operatorList.fnArray.length > 0) {
                                console.log(`🔧 Stránka ${pageNum}: Nalezeno ${operatorList.fnArray.length} operací`);
                                
                                // Projdeme operace a hledáme textové operace
                                for (let i = 0; i < operatorList.fnArray.length; i++) {
                                    const fn = operatorList.fnArray[i];
                                    const args = operatorList.argsArray[i];
                                    
                                    // Hledáme textové operace (TJ, Tj, ', ")
                                    if ([84, 85, 39, 34].includes(fn) && args && args.length > 0) {
                                        const textArg = args[0];
                                        if (typeof textArg === 'string' && textArg.trim().length > 0) {
                                            pageText += textArg + ' ';
                                        }
                                    }
                                }
                                pageText = pageText.trim();
                                
                                if (pageText.length > 0) {
                                    console.log(`✅ Alternativní API nalezlo text: "${pageText.substring(0, 100)}..."`);
                                }
                            }
                        } catch (altError) {
                            console.log(`❌ Alternativní API selhalo:`, altError);
                        }
                    }
                    
                    if (pageText.length > 0) {
                        allText += `\n\n=== STRÁNKA ${pageNum} ===\n${pageText}`;
                        totalChars += pageText.length;
                        pagesWithText++;
                        
                        console.log(`📃 Stránka ${pageNum}: ${pageText.length} znaků (celkem: ${totalChars})`);
                        
                        // Ukážeme první text, který najdeme (pro debugging)
                        if (pagesWithText === 1) {
                            console.log(`📝 První nalezený text: "${pageText.substring(0, 100)}${pageText.length > 100 ? '...' : ''}"`);
                        }
                        
                        // NEZKRACUJEME během extrakce - chceme zpracovat všech 50 stránek
                        // Zkrácení provedeme až na konci, abychom měli reprezentativní vzorek ze všech stránek
                    } else {
                        console.log(`📃 Stránka ${pageNum}: prázdná nebo bez textu`);
                        
                        // Pro OCR dokumenty zkusíme ještě alternativní přístup
                        if (forceExtraction) {
                            console.log(`🔍 Stránka ${pageNum}: Hledám alternativní obsah...`);
                            try {
                                // Zkusíme získat informace o fontech a objektech
                                const ops = await page.getOperatorList();
                                const annotations = await page.getAnnotations();
                                
                                if (ops.fnArray.length > 0) {
                                    console.log(`📄 Stránka ${pageNum}: Nalezeno ${ops.fnArray.length} operací, ${annotations.length} anotací`);
                                }
                            } catch (detailError) {
                                console.log(`📄 Stránka ${pageNum}: Nelze získat detailní info:`, detailError);
                            }
                        }
                    }
                    
                } catch (pageError) {
                    console.error(`❌ Chyba při zpracování stránky ${pageNum}:`, pageError);
                    continue; // Pokračujeme s další stránkou
                }
            }
            
            // Inteligentní zkrácení - zachováme reprezentativní vzorek ze všech stránek
            let finalText = allText.trim();
            
            console.log(`📊 STATISTIKY EXTRAKCE (před zkrácením):`);
            console.log(`   • Zpracováno stránek: ${totalPagesProcessed}/${pdf.numPages}`);
            console.log(`   • Stránky s textem: ${pagesWithText}`);
            console.log(`   • Celkem znaků: ${finalText.length}`);
            console.log(`   • Force extraction: ${forceExtraction}`);
            
            // Pokud je text příliš dlouhý, zkrátíme ho inteligentně
            if (finalText.length > MAX_CHARS) {
                console.log(`📝 Text je příliš dlouhý (${finalText.length} znaků), zkracuji na ${MAX_CHARS} znaků...`);
                
                // Rozdělíme text na stránky
                const pages = finalText.split('=== STRÁNKA');
                if (pages.length > 1) {
                    // Máme strukturované stránky - vezmeme reprezentativní vzorek
                    const charsPerPage = Math.floor(MAX_CHARS / Math.min(pagesWithText, 50));
                    let truncatedText = "";
                    let usedChars = 0;
                    
                    console.log(`📄 Zkracuji ${pages.length-1} stránek na ~${charsPerPage} znaků každou...`);
                    
                    for (let i = 1; i < pages.length && usedChars < MAX_CHARS; i++) {
                        const pageContent = pages[i];
                        const pageHeader = pageContent.split('\n')[0]; // "1 ==="
                        const pageText = pageContent.substring(pageHeader.length).trim();
                        
                        if (pageText.length > 0) {
                            const availableChars = MAX_CHARS - usedChars;
                            const pageCharsToUse = Math.min(pageText.length, Math.min(charsPerPage, availableChars));
                            
                            truncatedText += `\n\n=== STRÁNKA${pageHeader}\n${pageText.substring(0, pageCharsToUse)}`;
                            if (pageText.length > pageCharsToUse) {
                                truncatedText += "...";
                            }
                            
                            usedChars += pageCharsToUse;
                        }
                    }
                    
                    finalText = truncatedText.trim() + `\n\n... [ZKRÁCENO Z ${allText.length} NA ${finalText.length} ZNAKŮ - REPREZENTATIVNÍ VZOREK Z ${pagesWithText} STRÁNEK] ...`;
                } else {
                    // Nemáme strukturované stránky - prostě zkrátíme
                    finalText = finalText.substring(0, MAX_CHARS) + `\n\n... [ZKRÁCENO Z ${allText.length} ZNAKŮ] ...`;
                }
                
                console.log(`✂️ Text úspěšně zkrácen na ${finalText.length} znaků se zachováním obsahu ze všech stránek`);
            }
            
            console.log(`📊 FINÁLNÍ STATISTIKY:`);
            console.log(`   • Zpracováno stránek: ${totalPagesProcessed}/${pdf.numPages}`);
            console.log(`   • Stránky s textem: ${pagesWithText}`);
            console.log(`   • Finální délka: ${finalText.length} znaků`);
            console.log(`   • Force extraction: ${forceExtraction}`);
            
            // Pro force extraction (OCR dokumenty) je práh mnohem nižší
            const minChars = forceExtraction ? 10 : 50;
            
            if (finalText.length >= minChars) {
                console.log(`✅ ÚSPĚCH! Extrahováno ${finalText.length} znaků z ${pagesToProcess} stránek`);
                if (finalText.length > 0) {
                    console.log(`📊 První 200 znaků: "${finalText.substring(0, 200)}..."`);
                }
                return finalText;
            } else {
                if (forceExtraction) {
                    // Pro OCR dokumenty: pokud nenajdeme text, je to KRITICKÁ CHYBA
                    const errorMsg = `❌ KRITICKÁ CHYBA: OCR dokument neobsahuje text!
                    
📊 Detaily extrakce:
• Zpracováno stránek: ${totalPagesProcessed}/${pdf.numPages}
• Stránky s textem: ${pagesWithText}
• Celkem nalezeno znaků: ${finalText.length}
• Požadováno minimálně: ${minChars} znaků

🔧 POUŽITÉ METODY EXTRAKCE:
1. ✅ Standardní getTextContent s filtrováním
2. ✅ Extrakce bez filtrování
3. ✅ Extrakce s mezerami mezi položkami
4. ✅ Extrakce včetně skrytých znaků a EOL
5. ✅ Pozičně orientovaná extrakce
6. ✅ Extrakce všech vlastností (str, unicode, chars)
7. ✅ Alternativní PDF API s operátory

🔍 MOŽNÉ PŘÍČINY SELHÁNÍ:
1. PDF obsahuje text jako obrázky (naskenovaný dokument)
2. Text je zakódován v nestandardním formátu
3. PDF používá proprietární font encoding
4. PDF je chráněný proti extrakci textu
5. Chyba v OCR detekci - dokument skutečně nemá textovou vrstvu

⚠️ VŠECHNY POKROČILÉ METODY EXTRAKCE SELHALY!
ZKONTROLUJTE OCR STATUS TOHOTO DOKUMENTU.`;
                    
                    console.error(errorMsg);
                    return errorMsg;
                } else {
                    console.log(`❌ NEÚSPĚCH! Extrahováno pouze ${finalText.length} znaků`);
                    return this.createNoTextResponse(pdf, finalText.length);
                }
            }
            
        } catch (error) {
            console.error("💥 KRITICKÁ CHYBA při extrakci textu:", error);
            const errorMsg = `CHYBA při zpracování PDF: ${error instanceof Error ? error.message : String(error)}`;
            
            if (forceExtraction) {
                return `❌ KRITICKÁ CHYBA PRI EXTRAKCI OCR DOKUMENTU: ${errorMsg}
                
⚠️ Tento dokument má být označen jako OCR, ale nepodařilo se z něj extrahovat text.
Zkontrolujte prosím OCR status tohoto dokumentu.`;
            }
            
            return errorMsg;
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
    async sendToVectorDatabase(book: Book): Promise<{success: boolean, message: string}> {
        const webhookUrl = 'https://n8n.srv801780.hstgr.cloud/webhook-test/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58';
        
        try {
            // Nejdříve aktualizujeme status na pending
            await api.updateBook({...book, vectorStatus: 'pending'});
            
            // Stáhneme soubor z Supabase storage
            const { data: fileData, error: downloadError } = await supabaseClient.storage
                .from('Books')
                .download(book.filePath);
                
            if (downloadError || !fileData) {
                throw new Error(`Nepodařilo se stáhnout soubor: ${downloadError?.message}`);
            }
            
            // Převedeme Blob na ArrayBuffer a pak na base64
            const arrayBuffer = await fileData.arrayBuffer();
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            // Připravíme metadata
            const metadata = {
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
                categories: book.categories,
                labels: book.labels
            };
            
            // Odešleme data do n8n webhook
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookId: book.id,
                    metadata: metadata,
                    fileData: base64Data,
                    fileName: book.filePath.split('/').pop() || 'unknown.pdf'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Aktualizujeme status na základě odpovědi
            const newStatus = result.success ? 'success' : 'error';
            await api.updateBook({...book, vectorStatus: newStatus});
            
            return {
                success: result.success,
                message: result.message || (result.success ? 'Úspěšně nahráno do vektorové databáze' : 'Chyba při nahrávání do vektorové databáze')
            };
            
        } catch (error) {
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
};

// NOVÁ GEMINI AI IMPLEMENTACE - KOMPLETNĚ PŘEPSÁNA
class GeminiAI {
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    private lastRequestTime = 0;
    private requestCount = 0;
    private dailyLimit = 50; // Free tier limit
    
    constructor(apiKey: string) {
        console.log('🔍 DEBUG: GeminiAI konstruktor - apiKey =', apiKey);
        console.log('🔍 DEBUG: GeminiAI konstruktor - apiKey length =', apiKey?.length);
        this.apiKey = apiKey;
        
        // Load request count from localStorage
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem('gemini_request_date');
        const storedCount = localStorage.getItem('gemini_request_count');
        
        if (storedDate === today && storedCount) {
            this.requestCount = parseInt(storedCount, 10);
        } else {
            // New day, reset counter
            this.requestCount = 0;
            localStorage.setItem('gemini_request_date', today);
            localStorage.setItem('gemini_request_count', '0');
        }
        
        console.log(`📊 Gemini API requests today: ${this.requestCount}/${this.dailyLimit}`);
    }
    
    private updateRequestCount() {
        this.requestCount++;
        localStorage.setItem('gemini_request_count', this.requestCount.toString());
        console.log(`📊 Gemini API requests: ${this.requestCount}/${this.dailyLimit}`);
    }
    
    private async rateLimitDelay() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = 2000; // 2 seconds between requests
        
        if (timeSinceLastRequest < minDelay) {
            const waitTime = minDelay - timeSinceLastRequest;
            console.log(`⏳ Rate limiting: čekám ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }
    
    async generateText(prompt: string): Promise<string> {
        // Check daily quota
        if (this.requestCount >= this.dailyLimit) {
            const errorMsg = `🚫 Denní kvóta Gemini API vyčerpána (${this.requestCount}/${this.dailyLimit}). Zkuste zítra nebo upgradujte plán.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        try {
            // Apply rate limiting
            await this.rateLimitDelay();
            
            // Zjednodušený request body - stejný jako funkční curl
            const requestBody = {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            };
            
            console.log(`🔍 Odesílám request na Gemini API... (${this.requestCount + 1}/${this.dailyLimit})`);
            console.log('🔍 this.apiKey =', this.apiKey.slice(0, 8) + '...');
            console.log('🔍 URL:', `${this.baseUrl}?key=${this.apiKey.slice(0, 8)}...`);
            
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('🔍 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔍 Error response:', errorText);
                
                // Parse error details
                let errorDetails = '';
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        errorDetails = errorData.error.message || errorText;
                    }
                } catch {
                    errorDetails = errorText;
                }
                
                // Handle specific error codes
                if (response.status === 429) {
                    const quotaMsg = `🚫 Gemini API kvóta vyčerpána! Máte limit ${this.dailyLimit} requestů za den. Zkuste zítra nebo upgradujte na placený plán.`;
                    console.error(quotaMsg);
                    throw new Error(quotaMsg);
                } else if (response.status === 403) {
                    throw new Error('🔑 Neplatný API klíč nebo nemáte oprávnění k Gemini API');
                } else if (response.status >= 500) {
                    throw new Error('🔧 Server chyba Gemini API - zkuste později');
                } else {
                    throw new Error(`Gemini API error (${response.status}): ${errorDetails}`);
                }
            }
            
            // Update request count only on successful request
            this.updateRequestCount();
            
            const data = await response.json();
            console.log('🔍 Success response received');
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                const result = data.candidates[0].content.parts[0].text.trim();
                console.log('✅ Extracted text:', result.slice(0, 100) + '...');
                return result;
            }
            
            throw new Error('Neplatný formát odpovědi od Gemini API');
            
        } catch (error) {
            console.error('❌ Gemini AI Error:', error);
            throw error;
        }
    }
}

// Inicializace Gemini AI klienta (po definici třídy)
const geminiClient = GEMINI_API_KEY ? new GeminiAI(GEMINI_API_KEY) : null;

console.log('🔍 DEBUG: geminiClient vytvořen =', !!geminiClient);

// Test funkce pro ověření Gemini API
const testGeminiConnection = async (): Promise<boolean> => {
    if (!geminiClient) {
        console.error('Gemini client není inicializován');
        return false;
    }
    
    try {
        const testResult = await geminiClient.generateText('Odpověz pouze slovem "FUNGUJE" pokud mě slyšíš.');
        console.log('✅ Gemini API test úspěšný:', testResult);
        return testResult.includes('FUNGUJE') || testResult.includes('funguje') || testResult.length > 0;
    } catch (error) {
        console.error('❌ Gemini API test neúspěšný:', error);
        return false;
    }
};

// Automatický test Gemini API při spuštění
if (typeof window !== 'undefined') {
    setTimeout(async () => {
        console.log('🔍 DEBUG: V setTimeout - GEMINI_API_KEY =', GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : 'null');
        if (geminiClient) {
            console.log('🧪 Testuji Gemini API připojení...');
            const isWorking = await testGeminiConnection();
            if (isWorking) {
                console.log('🎉 Gemini AI je připraveno k použití!');
            } else {
                console.warn('⚠️ Gemini API test se nezdařil - zkontrolujte API klíč');
            }
        } else {
            console.warn('⚠️ Gemini API klíč není nastaven v setTimeout');
            console.log('🔍 DEBUG: process.env =', Object.keys(process.env));
        }
    }, 2000);
}

const generateMetadataWithAI = async (field: keyof Book, book: Book): Promise<string> => {
    if (!geminiClient) {
        alert("Gemini API není dostupné - chybí API klíč.");
        return "AI není k dispozici.";
    }
    
    console.log("🔍 Načítám obsah dokumentu pro AI analýzu...");
    console.log("📁 FilePath:", book.filePath);
    console.log("📖 Kniha:", book.title, "od", book.author);
    console.log("🔍 OCR Status:", book.hasOCR ? "✅ Má OCR" : "❌ Nemá OCR");
    
    // KLÍČOVÁ ZMĚNA: Načteme skutečný obsah dokumentu
    let documentContent = "";
    let hasValidContent = false;
    
    try {
        if (book.filePath) {
            console.log("⬇️ Stahuju PDF soubor z databáze...");
            
            // Pro OCR dokumenty použijeme rovnou forceovanou extrakci
            if (book.hasOCR && book.filePath.toLowerCase().endsWith('.pdf')) {
                console.log("🔄 OCR dokument - používám FORCEOVANOU extrakci...");
                const { data: fileData, error } = await supabaseClient.storage.from("Books").download(book.filePath);
                if (!error && fileData) {
                    documentContent = await api.extractPdfTextContent(fileData, true); // FORCE!
                } else {
                    throw new Error(`Nepodařilo se stáhnout OCR soubor: ${error?.message}`);
                }
            } else {
                documentContent = await api.getFileContent(book.filePath);
            }
            
            console.log("✅ Obsah dokumentu načten:", documentContent.length, "znaků");
            
            // Zkontrolujeme, jestli obsahuje validní text
            if (documentContent.includes("KRITICKÁ CHYBA") || 
                documentContent.includes("NEOBSAHUJE DOSTATEČNÝ TEXT PRO AI ANALÝZU") || 
                documentContent.includes("PDF dokument neobsahuje dostatečný čitelný text") ||
                documentContent.includes("CHYBA při zpracování PDF")) {
                console.log("❌ EXTRAKCE SELHALA - obsah není použitelný");
                console.log("📄 Obsah:", documentContent.substring(0, 300) + "...");
                hasValidContent = false;
            } else if (documentContent.includes("=== STRÁNKA") && documentContent.length > 50) {
                console.log("✅ PDF OBSAHUJE STRUKTUROVANÝ TEXT - AI dostane skutečný obsah");
                console.log("📊 Nalezeno stránek s textem:", (documentContent.match(/=== STRÁNKA/g) || []).length);
                hasValidContent = true;
            } else if (documentContent.length > 50) {
                console.log("✅ DOKUMENT OBSAHUJE TEXT - použiji pro AI");
                console.log("📄 Začátek obsahu:", documentContent.substring(0, 200) + "...");
                hasValidContent = true;
            } else if (book.hasOCR && documentContent.length > 10) {
                // Pro OCR dokumenty je práh nižší (10 znaků místo 50)
                console.log("✅ OCR DOKUMENT OBSAHUJE ALESPOŇ NĚJAKÝ TEXT - použiji pro AI");
                console.log("📄 Začátek obsahu:", documentContent.substring(0, 200) + "...");
                hasValidContent = true;
            } else {
                console.log("❌ NEDOSTATEČNÝ OBSAH");
                console.log("📄 Začátek obsahu:", documentContent.substring(0, 200) + "...");
                hasValidContent = false;
            }
            
            // Pro OCR dokumenty už jsme použili forceovanou extrakci na začátku,
            // takže pokud stále nemáme validní obsah, je to skutečně problém
            
            // Omezíme obsah na prvních 50 stránek (přibližně 25 000 slov/150 000 znaků)
            const maxChars = 150000; // Přibližně 25 000 slov = 50 stránek
            if (documentContent.length > maxChars) {
                documentContent = documentContent.substring(0, maxChars) + "...";
                console.log("📝 Obsah zkrácen na prvních 50 stránek (150 000 znaků)");
            }
        } else {
            console.warn("⚠️ Kniha nemá filePath - použiji pouze název");
            documentContent = `Název souboru: ${book.title}`;
            hasValidContent = false;
        }
    } catch (error) {
        console.error("❌ Chyba při načítání obsahu dokumentu:", error);
        documentContent = `Název souboru: ${book.title}`;
        hasValidContent = false;
    }
    
    // Pro dokumenty s OCR=true: pokud stále nemáme validní obsah, je to KRITICKÁ CHYBA
    if (book.hasOCR && !hasValidContent) {
        const criticalErrorMsg = `❌ KRITICKÁ CHYBA: Dokument má OCR=true, ale NEPODAŘILO SE EXTRAHOVAT TEXT!

📊 Detaily problému:
• Dokument ID: ${book.id}
• Název: ${book.title}
• Soubor: ${book.filePath}
• OCR Status: ${book.hasOCR ? 'TRUE' : 'FALSE'}
• Obsah délka: ${documentContent.length} znaků

🔍 PROVEDENÉ POKUSY:
1. ✅ Standardní extrakce textu z PDF
2. ✅ Forceovaná extrakce s agresivními metodami
3. ❌ Všechny pokusy selhaly

⚠️ TENTO DOKUMENT MÁ ZELENOU OCR IKONKU, ALE NEOBSAHUJE ČITELNÝ TEXT!
BUĎTO JE CHYBA V OCR DETEKCI, NEBO JE PDF SKUTEČNĚ BEZ TEXTU.

🛠️ ŘEŠENÍ:
1. Zkontrolujte OCR status tlačítkem "Detekovat OCR"
2. Pokud je PDF skutečně bez textu, označte hasOCR=false
3. Pokud má PDF obsahovat text, zkontrolujte soubor

❌ AI GENEROVÁNÍ METADAT NELZE PROVÉST BEZ TEXTU Z OCR DOKUMENTU!`;
        
        console.error(criticalErrorMsg);
        return criticalErrorMsg;
    }
    
    const bookInfo = `kniha "${book.title}" od ${book.author || "neznámého autora"}`;
    let prompt = "";
    
    // Přidáme obsah dokumentu do každého promptu - pokud máme validní obsah
    const contentContext = hasValidContent && documentContent.length > 50 
        ? `\n\nObsah dokumentu (prvních 50 stránek):\n${documentContent}\n\n` 
        : "\n\n";
    
    // Pro dokumenty bez validního obsahu použijeme fallback přístup s existujícími metadaty
    const fallbackContext = !hasValidContent 
        ? `\n\nInformace o knize:\n- Název souboru: ${book.title}\n- Autor: ${book.author || 'Neznámý'}\n- Nakladatel: ${book.publisher || 'Neznámý'}\n- Rok vydání: ${book.publicationYear || 'Neznámý'}\n- Jazyk: ${book.language || 'Neznámý'}\n\n`
        : "";
    
    const contextToUse = hasValidContent ? contentContext : fallbackContext;
    
    switch (field) {
        case "title":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu najdi správný název publikace "${book.title}". Odpověz pouze názvem bez uvozovek.${contextToUse}`;
            } else {
                prompt = `Na základě názvu souboru "${book.title}" navrhni lepší nebo opravený název knihy. Odpověz pouze názvem bez uvozovek.${contextToUse}`;
            }
            break;
        case "author":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu urči, kdo je autor této knihy. Pokud je více autorů, odděl je čárkou. Odpověz pouze jménem/jmény.${contextToUse}`;
            } else {
                prompt = `Na základě názvu knihy "${book.title}" a dostupných informací zkus určit možného autora. Pokud si nejsi jistý, odpověz "Neznámý".${contextToUse}`;
            }
            break;
        case "publicationYear":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu urči, v jakém roce byla tato kniha poprvé vydána. Odpověz pouze číslem roku.${contextToUse}`;
            } else {
                prompt = `Na základě názvu knihy "${book.title}" a dostupných informací zkus odhadnout rok vydání. Pokud si nejsi jistý, odpověz současným rokem.${contextToUse}`;
            }
            break;
        case "publisher":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu urči, které nakladatelství vydalo tuto knihu. Odpověz pouze názvem nakladatelství nebo instituce.${contextToUse}`;
            } else {
                prompt = `Na základě názvu knihy "${book.title}" a dostupných informací zkus určit možné nakladatelství. Pokud si nejsi jistý, odpověz "Neznámý".${contextToUse}`;
            }
            break;
        case "summary":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu napiš krátkou, výstižnou sumarizaci v češtině. Sumarizace by měla být konkrétní a informativní - po přečtení musí být jasné, o čem kniha je a co se v ní čtenář dozví. 
                Musí obsahovat jasnou sumarizaci obsahu. Nezmiňuj zde že sumarizace je dělaná z prvních 50 stran.${contextToUse}`;
            } else {
                prompt = `Na základě názvu knihy "${book.title}" a dostupných informací napiš obecnou sumarizaci o čem by tato kniha mohla být. Začni slovy "Na základě názvu se zdá, že tato kniha..."${contextToUse}`;
            }
            break;
        case "keywords":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu vygeneruj 5-7 relevantních klíčových slov v češtině. Klíčová slova musí být zaměřena na obsah knihy. Vrať je jako seznam oddělený čárkami.${contextToUse}`;
            } else {
                prompt = `Na základě názvu knihy "${book.title}" vygeneruj 5-7 relevantních klíčových slov v češtině. Vrať je jako seznam oddělený čárkami.${contextToUse}`;
            }
            break;
        case "language":
            if (hasValidContent) {
                prompt = `Na základě obsahu dokumentu urči, v jakém jazyce je tato kniha napsána. Odpověz pouze názvem jazyka v češtině.${contextToUse}`;
            } else {
                prompt = `Na základě názvu knihy "${book.title}" zkus určit jazyk publikace. Pokud název obsahuje česká písmena nebo slova, odpověz "Čeština". Jinak odpověz "Neznámý".${contextToUse}`;
            }
            break;
        default:
            return "Toto pole není podporováno pro AI generování.";
    }
    
    try {
        console.log("🤖 Odesílám prompt do AI...");
        console.log("📊 Typ obsahu:", hasValidContent ? "✅ Validní text z dokumentu" : "⚠️ Fallback přístup");
        console.log("📝 Délka promptu:", prompt.length, "znaků");
        
        const result = await geminiClient.generateText(prompt);
        console.log("✅ AI odpověď:", result);
        
        // Pro dokumenty s OCR=true zalogujeme úspěch
        if (book.hasOCR && hasValidContent) {
            console.log("🎉 ÚSPĚCH: AI generování pro dokument s OCR dokončeno!");
        } else if (book.hasOCR && !hasValidContent) {
            console.log("⚠️ FALLBACK: AI generování pro dokument s OCR pomocí fallback přístupu dokončeno.");
        }
        
        return result || "Nepodařilo se vygenerovat odpověď.";
    } catch (error) {
        console.error(`❌ Chyba při generování ${field}:`, error);
        console.error("📊 Kontext chyby:", {
            hasOCR: book.hasOCR,
            hasValidContent,
            documentLength: documentContent.length,
            filePath: book.filePath
        });
        return "Nepodařilo se vygenerovat data.";
    }
};

// NOVÁ FUNKCE PRO GENEROVÁNÍ VŠECH METADAT V JEDNOM POŽADAVKU
const generateAllMetadataWithAI = async (fields: (keyof Book)[], book: Book): Promise<any[]> => {
    if (!geminiClient) {
        throw new Error("Gemini API není dostupné - chybí API klíč.");
    }
    
    console.log("🔍 Načítám obsah dokumentu pro hromadné AI generování...");
    console.log("📁 FilePath:", book.filePath);
    console.log("📖 Kniha:", book.title, "od", book.author);
    console.log("🔍 OCR Status:", book.hasOCR ? "✅ Má OCR" : "❌ Nemá OCR");
    console.log("📋 Pole k vygenerování:", fields.join(', '));
    
    // Načteme obsah dokumentu (stejná logika jako v generateMetadataWithAI)
    let documentContent = "";
    let hasValidContent = false;
    
    try {
        if (book.filePath) {
            console.log("⬇️ Stahuju PDF soubor z databáze...");
            
            // Pro OCR dokumenty použijeme rovnou forceovanou extrakci
            if (book.hasOCR && book.filePath.toLowerCase().endsWith('.pdf')) {
                console.log("🔄 OCR dokument - používám FORCEOVANOU extrakci...");
                const { data: fileData, error } = await supabaseClient.storage.from("Books").download(book.filePath);
                if (!error && fileData) {
                    documentContent = await api.extractPdfTextContent(fileData, true); // FORCE!
                } else {
                    throw new Error(`Nepodařilo se stáhnout OCR soubor: ${error?.message}`);
                }
            } else {
                documentContent = await api.getFileContent(book.filePath);
            }
            
            console.log("✅ Obsah dokumentu načten:", documentContent.length, "znaků");
            
            // Zkontrolujeme validitu obsahu (stejná logika)
            if (documentContent.includes("KRITICKÁ CHYBA") || 
                documentContent.includes("NEOBSAHUJE DOSTATEČNÝ TEXT PRO AI ANALÝZU") || 
                documentContent.includes("PDF dokument neobsahuje dostatečný čitelný text") ||
                documentContent.includes("CHYBA při zpracování PDF")) {
                console.log("❌ EXTRAKCE SELHALA - obsah není použitelný");
                hasValidContent = false;
            } else if (documentContent.includes("=== STRÁNKA") && documentContent.length > 50) {
                console.log("✅ PDF OBSAHUJE STRUKTUROVANÝ TEXT - AI dostane skutečný obsah");
                hasValidContent = true;
            } else if (documentContent.length > 50) {
                console.log("✅ DOKUMENT OBSAHUJE TEXT - použiji pro AI");
                hasValidContent = true;
            } else if (book.hasOCR && documentContent.length > 10) {
                console.log("✅ OCR DOKUMENT OBSAHUJE ALESPOŇ NĚJAKÝ TEXT - použiji pro AI");
                hasValidContent = true;
            } else {
                console.log("❌ NEDOSTATEČNÝ OBSAH");
                hasValidContent = false;
            }
            
            // Pro OCR dokumenty: pokud stále nemáme validní obsah, je to KRITICKÁ CHYBA
            if (book.hasOCR && !hasValidContent) {
                const criticalErrorMsg = `❌ KRITICKÁ CHYBA: Dokument má OCR=true, ale NEPODAŘILO SE EXTRAHOVAT TEXT!`;
                console.error(criticalErrorMsg);
                throw new Error(criticalErrorMsg);
            }
            
            // Omezíme obsah na prvních 50 stránek
            const maxChars = 150000;
            if (documentContent.length > maxChars) {
                documentContent = documentContent.substring(0, maxChars) + "...";
                console.log("📝 Obsah zkrácen na prvních 50 stránek (150 000 znaků)");
            }
        } else {
            console.warn("⚠️ Kniha nemá filePath - použiji pouze název");
            documentContent = `Název souboru: ${book.title}`;
            hasValidContent = false;
        }
    } catch (error) {
        console.error("❌ Chyba při načítání obsahu dokumentu:", error);
        documentContent = `Název souboru: ${book.title}`;
        hasValidContent = false;
    }
    
    // Vytvoříme jeden komplexní prompt pro všechna pole
    const contentContext = hasValidContent && documentContent.length > 50 
        ? `\n\nObsah dokumentu (prvních 50 stránek):\n${documentContent}\n\n` 
        : "";
    
    const fallbackContext = !hasValidContent 
        ? `\n\nInformace o knize:\n- Název souboru: ${book.title}\n- Autor: ${book.author || 'Neznámý'}\n- Nakladatel: ${book.publisher || 'Neznámý'}\n- Rok vydání: ${book.publicationYear || 'Neznámý'}\n- Jazyk: ${book.language || 'Neznámý'}\n\n`
        : "";
    
    const contextToUse = hasValidContent ? contentContext : fallbackContext;
    
    // Vytvoříme instrukce pro každé pole
    const fieldInstructions = fields.map(field => {
        switch (field) {
            case "title":
                return hasValidContent 
                    ? `NÁZEV: Na základě obsahu dokumentu najdi správný název publikace "${book.title}". Odpověz pouze názvem bez uvozovek.`
                    : `NÁZEV: Na základě názvu souboru "${book.title}" navrhni lepší nebo opravený název knihy. Odpověz pouze názvem bez uvozovek.`;
            case "author":
                return hasValidContent
                    ? `AUTOR: Na základě obsahu dokumentu urči, kdo je autor této knihy. Pokud je více autorů, odděl je čárkou. Odpověz pouze jménem/jmény.`
                    : `AUTOR: Na základě názvu knihy "${book.title}" a dostupných informací zkus určit možného autora. Pokud si nejsi jistý, odpověz "Neznámý".`;
            case "publicationYear":
                return hasValidContent
                    ? `ROK VYDÁNÍ: Na základě obsahu dokumentu urči, v jakém roce byla tato kniha poprvé vydána. Odpověz pouze číslem roku.`
                    : `ROK VYDÁNÍ: Na základě názvu knihy "${book.title}" a dostupných informací zkus odhadnout rok vydání. Pokud si nejsi jistý, odpověz současným rokem.`;
            case "publisher":
                return hasValidContent
                    ? `NAKLADATEL: Na základě obsahu dokumentu urči, které nakladatelství vydalo tuto knihu. Odpověz pouze názvem nakladatelství nebo instituce.`
                    : `NAKLADATEL: Na základě názvu knihy "${book.title}" a dostupných informací zkus určit možné nakladatelství. Pokud si nejsi jistý, odpověz "Neznámý".`;
            case "summary":
                return hasValidContent
                    ? `SUMARIZACE: Na základě obsahu dokumentu napiš krátkou, výstižnou sumarizaci v češtině. Sumarizace by měla být konkrétní a informativní - po přečtení musí být jasné, o čem kniha je a co se v ní čtenář dozví.`
                    : `SUMARIZACE: Na základě názvu knihy "${book.title}" a dostupných informací napiš obecnou sumarizaci o čem by tato kniha mohla být. Začni slovy "Na základě názvu se zdá, že tato kniha..."`;
            case "keywords":
                return hasValidContent
                    ? `KLÍČOVÁ SLOVA: Na základě obsahu dokumentu vygeneruj 5-7 relevantních klíčových slov v češtině. Klíčová slova musí být zaměřena na obsah knihy. Vrať je jako seznam oddělený čárkami.`
                    : `KLÍČOVÁ SLOVA: Na základě názvu knihy "${book.title}" vygeneruj 5-7 relevantních klíčových slov v češtině. Vrať je jako seznam oddělený čárkami.`;
            case "language":
                return hasValidContent
                    ? `JAZYK: Na základě obsahu dokumentu urči, v jakém jazyce je tato kniha napsána. Odpověz pouze názvem jazyka v češtině.`
                    : `JAZYK: Na základě názvu knihy "${book.title}" zkus určit jazyk publikace. Pokud název obsahuje česká písmena nebo slova, odpověz "Čeština". Jinak odpověz "Neznámý".`;
            default:
                return `${field.toUpperCase()}: Toto pole není podporováno.`;
        }
    }).join('\n\n');
    
    const prompt = `Vygeneruj metadata pro knihu na základě poskytnutých informací. Pro každé pole odpověz přesně ve formátu "POLE: odpověď".

${fieldInstructions}

${contextToUse}

DŮLEŽITÉ: Odpověz přesně ve formátu "POLE: odpověď" pro každé požadované pole. Nepiš nic navíc.`;
    
    try {
        console.log("🤖 Odesílám JEDEN komplexní prompt do AI...");
        console.log("📊 Typ obsahu:", hasValidContent ? "✅ Validní text z dokumentu" : "⚠️ Fallback přístup");
        console.log("📝 Délka promptu:", prompt.length, "znaků");
        console.log("📋 Počet polí:", fields.length);
        
        const result = await geminiClient.generateText(prompt);
        console.log("✅ AI odpověď:", result);
        
        // Parsujeme odpověď
        const parsedResults = [];
        const lines = result.split('\n').filter(line => line.trim().length > 0);
        
        for (const field of fields) {
            const fieldPattern = new RegExp(`^${field.toUpperCase()}:\\s*(.+)$`, 'i');
            const matchingLine = lines.find(line => fieldPattern.test(line.trim()));
            
            if (matchingLine) {
                const match = matchingLine.trim().match(fieldPattern);
                const value = match ? match[1].trim() : '';
                parsedResults.push({ field, status: 'fulfilled' as const, value });
                console.log(`✅ ${field}: "${value}"`);
            } else {
                console.warn(`⚠️ Nenalezeno pole ${field} v odpovědi AI`);
                parsedResults.push({ field, status: 'rejected' as const, reason: 'Pole nenalezeno v odpovědi' });
            }
        }
        
        console.log("🎉 ÚSPĚCH: Všechna metadata vygenerována v jednom požadavku!");
        return parsedResults;
        
    } catch (error) {
        console.error(`❌ Chyba při hromadném generování metadat:`, error);
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

// Function to set Gemini API key - can be called from browser console
(window as any).setGeminiApiKey = (apiKey: string) => {
    if (!apiKey || apiKey.trim() === '') {
        console.error('❌ API klíč nemůže být prázdný');
        return false;
    }
    
    localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    console.log('✅ Gemini API klíč uložen do localStorage');
    console.log('🔄 Obnovte stránku pro aktivaci nového API klíče');
    return true;
};

// Function to test current Gemini API key - can be called from browser console
(window as any).testGeminiApiKey = async () => {
    const currentKey = getGeminiApiKey();
    if (!currentKey) {
        console.error('❌ Žádný API klíč není nastaven');
        console.log('💡 Použijte: setGeminiApiKey("váš-api-klíč")');
        return false;
    }
    
    console.log('🧪 Testování Gemini API klíče...');
    const testClient = new GeminiAI(currentKey);
    
    try {
        const result = await testClient.generateText('Odpověz pouze slovem "FUNGUJE" pokud mě slyšíš.');
        console.log('✅ Test úspěšný! Odpověď:', result);
        return true;
    } catch (error) {
        console.error('❌ Test neúspěšný:', error);
        return false;
    }
};

// Function to show current API key status - can be called from browser console
(window as any).checkGeminiStatus = () => {
    const currentKey = getGeminiApiKey();
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('gemini_request_date');
    const storedCount = localStorage.getItem('gemini_request_count');
    
    console.log('🔍 Gemini API Status:');
    console.log('- Environment variable:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.slice(0, 8)}...` : 'not set');
    console.log('- localStorage:', typeof window !== 'undefined' && localStorage.getItem('GEMINI_API_KEY') ? `${localStorage.getItem('GEMINI_API_KEY')!.slice(0, 8)}...` : 'not set');
    console.log('- Final key:', currentKey ? `${currentKey.slice(0, 8)}...` : 'not available');
    console.log('- Client initialized:', !!geminiClient);
    
    // Show quota information
    if (storedDate === today && storedCount) {
        const count = parseInt(storedCount, 10);
        console.log(`📊 Dnešní kvóta: ${count}/50 requestů`);
        if (count >= 50) {
            console.log('🚫 KVÓTA VYČERPÁNA - zkuste zítra nebo upgradujte plán');
        } else if (count >= 40) {
            console.log('⚠️ POZOR - blížíte se limitu kvóty');
        }
    } else {
        console.log('📊 Dnešní kvóta: 0/50 requestů (nový den)');
    }
    
    if (!currentKey) {
        console.log('\n💡 Pro nastavení API klíče použijte:');
        console.log('setGeminiApiKey("váš-gemini-api-klíč")');
    }
};

// Function to reset quota counter - can be called from browser console
(window as any).resetGeminiQuota = () => {
    localStorage.setItem('gemini_request_date', new Date().toDateString());
    localStorage.setItem('gemini_request_count', '0');
    console.log('✅ Gemini kvóta resetována na 0');
};

// Function to check remaining quota - can be called from browser console
(window as any).getGeminiQuota = () => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('gemini_request_date');
    const storedCount = localStorage.getItem('gemini_request_count');
    
    if (storedDate === today && storedCount) {
        const used = parseInt(storedCount, 10);
        const remaining = 50 - used;
        console.log(`📊 Gemini kvóta: ${used}/50 použito, ${remaining} zbývá`);
        return { used, remaining, total: 50 };
    } else {
        console.log('📊 Gemini kvóta: 0/50 použito, 50 zbývá (nový den)');
        return { used: 0, remaining: 50, total: 50 };
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

const App = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    
    // Filters
    const [filter, setFilter] = useState('');
    const [labelFilter, setLabelFilter] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [langFilter, setLangFilter] = useState<string[]>([]);
    const [yearRange, setYearRange] = useState<{from: number|null, to: number|null}>({from: null, to: null});
    const [dateAddedRange, setDateAddedRange] = useState({ from: 0, to: 0 });

    // Modals
    const [isConvertModalOpen, setConvertModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; book: Book | null }>({ isOpen: false, book: null });
    const [isBulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [vectorDbConfirmation, setVectorDbConfirmation] = useState<{ isOpen: boolean; book: Book | null; missingFields: string[] }>({ isOpen: false, book: null, missingFields: [] });
    
    const [allLabels, setAllLabels] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>(['Aromaterapie', 'Masáže', 'Akupunktura', 'Diagnostika']);
    const [allPublicationTypes, setAllPublicationTypes] = useState<string[]>(['public', 'students', 'internal_bewit']);
    const [allLanguages, setAllLanguages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsLoading(true);
        api.getBooks().then(data => {
            setBooks(data);
            const initialLabels = new Set<string>();
            const initialCategories = new Set<string>(['Aromaterapie', 'Masáže', 'Akupunktura', 'Diagnostika']);
            const initialPublicationTypes = new Set<string>(['public', 'students', 'internal_bewit']);
            const initialLangs = new Set<string>();
            data.forEach(book => {
                book.labels.forEach(label => initialLabels.add(label));
                book.categories.forEach(cat => initialCategories.add(cat));
                book.publicationTypes.forEach(type => initialPublicationTypes.add(type));
                if(book.language) initialLangs.add(book.language);
            });
            setAllLabels(Array.from(initialLabels).sort());
            setAllCategories(Array.from(initialCategories).sort());
            setAllPublicationTypes(Array.from(initialPublicationTypes).sort());
            setAllLanguages(Array.from(initialLangs).sort());
            if (data.length > 0 && !selectedBookId) {
                setSelectedBookId(data[0].id);
            }
        }).catch(err => {
            console.error("Failed to fetch books:", err.message, err);
            alert(`Nepodařilo se načíst knihy z databáze: ${err.message}`);
        }).finally(() => {
            setIsLoading(false);
        });
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
                format: file.name.split('.').pop()?.toUpperCase() || 'N/A'
            };
        } catch (error) {
            console.error("❌ Chyba při extrakci metadat:", error);
            return {
                title: file.name.replace(/\.[^/.]+$/, ""),
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
                format: 'PDF'
            };
        } catch (error) {
            console.error("Failed to extract PDF metadata:", error);
            return {
                title: file.name.replace(/\.[^/.]+$/, ""),
                author: 'Neznámý',
                language: 'Neznámý',
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

        setIsLoading(true);
        try {
            // 1. Extract metadata from the file FIRST
            const extractedMetadata = await extractMetadataFromFile(file);
            console.log('📊 Extrahovaná metadata:', {
                title: extractedMetadata.title,
                hasOCR: extractedMetadata.hasOCR,
                format: extractedMetadata.format
            });
            
            // 2. Generate unique ID for this book (will be used for both book and cover)
            const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 3. Upload the original book file with the unique ID
            const { filePath, fileSize } = await api.uploadFileWithId(file, 'Books', bookId);

            // 4. Generate and upload cover if it's a PDF.
            let coverImageUrl = `https://placehold.co/150x225/f3eee8/4a4a4a?text=${extractedMetadata.format || file.name.split('.').pop()?.toUpperCase()}`;
            if (file.type === 'application/pdf') {
                try {
                    console.log('Starting PDF cover generation...');
                    const fileBuffer = await file.arrayBuffer();
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

            // 5. Create book record with extracted metadata
            const newBookData: Omit<Book, 'id' | 'dateAdded' | 'content'> = {
                title: extractedMetadata.title || file.name.replace(/\.[^/.]+$/, ""),
                author: extractedMetadata.author || 'Neznámý',
                publicationYear: extractedMetadata.publicationYear || null,
                publisher: extractedMetadata.publisher || '',
                summary: extractedMetadata.summary || '',
                keywords: extractedMetadata.keywords || [],
                language: extractedMetadata.language || 'Neznámý',
                format: extractedMetadata.format || file.name.split('.').pop()?.toUpperCase() || 'N/A',
                fileSize: fileSize,
                coverImageUrl: coverImageUrl,
                publicationTypes: extractedMetadata.publicationTypes || [],
                labels: extractedMetadata.labels || [],
                categories: extractedMetadata.categories || [],
                filePath: filePath,
                vectorStatus: 'pending',
                hasOCR: extractedMetadata.hasOCR || false,
            };
            
            console.log('📚 Vytvářím knihu s předběžným OCR stavem:', newBookData.hasOCR);
            const createdBook = await api.createBook(newBookData);
            console.log('✅ Kniha vytvořena, nyní detekuji skutečný OCR stav...');

            // 6. Skutečná detekce OCR z nahraného souboru
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

            // Reset filters to ensure the new book is visible
            setFilter(''); 
            setLabelFilter([]); 
            setCategoryFilter([]); 
            setTypeFilter([]); 
            setLangFilter([]); 
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

    const executeDelete = async () => {
        if (!deleteConfirmation.book) return;

        const bookToDelete = deleteConfirmation.book;

        try {
            await api.deleteBook(bookToDelete.id, bookToDelete.filePath, bookToDelete.coverImageUrl);

            // Always update UI - the book should be removed from the list even if there were storage errors
            const originalBookIndex = books.findIndex(b => b.id === bookToDelete.id);
            const newBooks = books.filter(b => b.id !== bookToDelete.id);
            setBooks(newBooks);

            if (selectedBookId === bookToDelete.id) {
                let newSelectedId = null;
                if (newBooks.length > 0) {
                    const newIndex = Math.min(originalBookIndex, newBooks.length - 1);
                    newSelectedId = newBooks[newIndex].id;
                }
                setSelectedBookId(newSelectedId);
            }

            if (selectedBookIds.has(bookToDelete.id)) {
                const newSelectedIds = new Set(selectedBookIds);
                newSelectedIds.delete(bookToDelete.id);
                setSelectedBookIds(newSelectedIds);
            }

            console.log(`Kniha "${bookToDelete.title}" byla úspěšně smazána`);

        } catch (error: any) {
            console.error("Failed to delete book:", error.message, error);
            alert(`Smazání knihy se nezdařilo: ${error.message}`);
        } finally {
            setDeleteConfirmation({ isOpen: false, book: null });
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
        
        try {
            console.log('Odesílání knihy do vektorové databáze:', book.title);
            const result = await api.sendToVectorDatabase(book);
            
            if (result.success) {
                alert(`✅ ${result.message}`);
                // Aktualizujeme knihu v seznamu
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'success'} : b));
            } else {
                alert(`❌ ${result.message}`);
                // Aktualizujeme knihu v seznamu
                setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
            }
        } catch (error) {
            console.error('Chyba při odesílání do vektorové databáze:', error);
            alert('❌ Chyba při odesílání do vektorové databáze');
            // Aktualizujeme knihu v seznamu
            setBooks(prev => prev.map(b => b.id === book.id ? {...b, vectorStatus: 'error'} : b));
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
        const deletePromises = booksToDelete.map(book => api.deleteBook(book.id, book.filePath, book.coverImageUrl));

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
    
    const handleAddNewLabel = (labelName: string) => {
        if(labelName && !allLabels.includes(labelName)) {
            setAllLabels(prev => [...prev, labelName].sort());
        }
    }

    const handleAddNewCategory = (categoryName: string) => {
        if(categoryName && !allCategories.includes(categoryName)) {
            setAllCategories(prev => [...prev, categoryName].sort());
        }
    }

    const handleAddNewPublicationType = (typeName: string) => {
        if(typeName && !allPublicationTypes.includes(typeName)) {
            setAllPublicationTypes(prev => [...prev, typeName].sort());
        }
    }

    const handleDeleteLabel = (labelName: string) => {
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
    };

    const handleDeleteCategory = (categoryName: string) => {
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
    };

    const handleDeletePublicationType = (typeName: string) => {
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
            const matchesLangs = langFilter.length === 0 || langFilter.includes(book.language);
            
            const matchesYear = (!yearRange.from || (book.publicationYear && book.publicationYear >= yearRange.from)) &&
                                (!yearRange.to || (book.publicationYear && book.publicationYear <= yearRange.to));
            
            const fromMonthStr = availableMonths[dateAddedRange.from];
            const toMonthStr = availableMonths[dateAddedRange.to];
            if (!fromMonthStr || !toMonthStr) return true; // Don't filter if range is not ready
            
            const bookDate = new Date(book.dateAdded);
            const bookMonthStr = `${bookDate.getFullYear()}-${String(bookDate.getMonth() + 1).padStart(2, '0')}`;
            const matchesDateAdded = bookMonthStr >= fromMonthStr && bookMonthStr <= toMonthStr;

            return matchesText && matchesLabels && matchesCategories && matchesTypes && matchesLangs && matchesYear && matchesDateAdded;
        }), [books, filter, labelFilter, categoryFilter, typeFilter, langFilter, yearRange, dateAddedRange, availableMonths]);

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
                onExportXml={handleExportXml}
                onConvertClick={() => setConvertModalOpen(true)}
                isAnyBookSelected={selectedBookIds.size > 0}
            />

            <div style={styles.mainContent}>
                <LeftFilterPanel 
                    filter={filter} onFilterChange={setFilter} 
                    allLabels={allLabels} selectedLabels={labelFilter} onLabelFilterChange={setLabelFilter} onAddLabel={handleAddNewLabel} onDeleteLabel={handleDeleteLabel}
                    allCategories={allCategories} selectedCategories={categoryFilter} onCategoryFilterChange={setCategoryFilter} onAddCategory={handleAddNewCategory} onDeleteCategory={handleDeleteCategory}
                    allTypes={allPublicationTypes} selectedTypes={typeFilter} onTypeFilterChange={setTypeFilter} onAddType={handleAddNewPublicationType} onDeleteType={handleDeletePublicationType}
                    allLanguages={allLanguages} selectedLanguages={langFilter} onLanguageFilterChange={setLangFilter}
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
                                onVectorDatabaseAction={handleVectorDatabaseAction}
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
                        <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end'}}>
                            <button style={styles.button} onClick={() => setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] })}>
                                Zavřít
                            </button>
                            <button 
                                style={{...styles.button, backgroundColor: 'var(--primary-color)', color: 'white'}} 
                                onClick={() => {
                                    setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] });
                                    if (vectorDbConfirmation.book) {
                                        setSelectedBookId(vectorDbConfirmation.book.id);
                                    }
                                }}
                            >
                                Upravit knihu
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
                        <p style={{fontSize: '0.9em', color: 'var(--text-secondary)', marginTop: '1rem'}}>
                            ⚠️ Tato operace může trvat několik minut. Kniha bude zpracována n8n workflow a přidána do vektorové databáze.
                        </p>
                        <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end'}}>
                            <button style={styles.button} onClick={() => setVectorDbConfirmation({ isOpen: false, book: null, missingFields: [] })}>
                                Zrušit
                            </button>
                            <button 
                                style={{...styles.button, backgroundColor: 'var(--primary-color)', color: 'white'}} 
                                onClick={confirmVectorDatabaseAction}
                            >
                                <IconDatabase status="pending" /> Odeslat do VDB
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

interface TopToolbarProps {
    onUploadClick: () => void;
    viewMode: 'list' | 'grid';
    onViewModeChange: (mode: 'list' | 'grid') => void;
    selectedCount: number;
    onBulkDelete: () => void;
    onExportXml: () => void;
    onConvertClick: () => void;
    isAnyBookSelected: boolean;
}
const TopToolbar = ({ onUploadClick, viewMode, onViewModeChange, selectedCount, onBulkDelete, onExportXml, onConvertClick, isAnyBookSelected }: TopToolbarProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
        <header style={styles.header}>
            <div style={styles.headerActions}>
                <button style={styles.button} onClick={onUploadClick}><IconUpload /> Přidat knihu</button>
                <button style={styles.button} onClick={onConvertClick} disabled={!isAnyBookSelected}>Konvertovat knihu</button>
                 {selectedCount > 0 && (
                    <div style={{ position: 'relative' }}>
                        <button style={styles.button} onClick={() => setDropdownOpen(o => !o)} onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}>
                            Hromadné akce ({selectedCount}) <IconMoreVertical/>
                        </button>
                        {dropdownOpen && (
                            <div style={styles.dropdownMenu}>
                                <a style={styles.dropdownMenuLink} onClick={() => { onBulkDelete(); setDropdownOpen(false); }}><IconDelete size={14}/> Smazat vybrané</a>
                                <a style={styles.dropdownMenuLink} onClick={() => alert('Stahování není implementováno.')}><IconDownload/> Stáhnout vybrané</a>
                                <a style={styles.dropdownMenuLink} onClick={() => { onExportXml(); setDropdownOpen(false); }}><IconExport/> Exportovat do XML</a>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={styles.viewToggle}>
                <button style={{...styles.iconButton, ...(viewMode === 'list' ? styles.iconButtonActive : {})}} onClick={() => onViewModeChange('list')} aria-label="List view"><IconList/></button>
                <button style={{...styles.iconButton, ...(viewMode === 'grid' ? styles.iconButtonActive : {})}} onClick={() => onViewModeChange('grid')} aria-label="Grid view"><IconGrid/></button>
            </div>
        </header>
    );
}

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
    allLanguages: string[]; selectedLanguages: string[]; onLanguageFilterChange: (langs: string[]) => void;
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
                    <div style={styles.tagList}>
                        {props.allTypes.map(type => (
                            <span key={type} style={{...styles.tag, ...(props.selectedTypes.includes(type) ? styles.tagSelected : {})}} onClick={() => handleTagClick(type, props.selectedTypes, props.onTypeFilterChange)}>
                                {type.replace('_', ' ')}
                            </span>
                        ))}
                    </div>
                </FilterGroup>
                
                <FilterGroup 
                    title="Kategorie" 
                    onAdd={() => openAddModal("Zadejte název nové kategorie", props.onAddCategory)}
                    onDelete={props.onDeleteCategory}
                    allItems={props.allCategories}
                >
                    <div style={styles.tagList}>
                        {props.allCategories.map(cat => (
                            <span key={cat} style={{...styles.tag, ...(props.selectedCategories.includes(cat) ? styles.tagSelected : {})}} onClick={() => handleTagClick(cat, props.selectedCategories, props.onCategoryFilterChange)}>
                                {cat}
                            </span>
                        ))}
                    </div>
                </FilterGroup>

                <FilterGroup 
                    title="Štítky" 
                    onAdd={() => openAddModal("Zadejte název nového štítku", props.onAddLabel)}
                    onDelete={props.onDeleteLabel}
                    allItems={props.allLabels}
                >
                    <div style={styles.tagList}>
                        {props.allLabels.map(label => (
                            <span key={label} style={{...styles.tag, ...(props.selectedLabels.includes(label) ? styles.tagSelected : {})}} onClick={() => handleTagClick(label, props.selectedLabels, props.onLabelFilterChange)}>
                                {label}
                            </span>
                        ))}
                    </div>
                </FilterGroup>

                <FilterGroup title="Jazyky">
                     <div style={styles.tagList}>
                        {props.allLanguages.map(lang => (
                            <span key={lang} style={{...styles.tag, ...(props.selectedLanguages.includes(lang) ? styles.tagSelected : {})}} onClick={() => handleTagClick(lang, props.selectedLanguages, props.onLanguageFilterChange)}>
                                {getFlagEmoji(lang)} {lang}
                            </span>
                        ))}
                    </div>
                </FilterGroup>
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
    onVectorDatabaseAction: (book: Book) => void;
}
const BookListView = ({ books, selectedBookId, selectedBookIds, onSelectBook, onToggleSelection, onSelectAll, onDeleteBook, onVectorDatabaseAction }: BookListViewProps) => {
    const isAllSelected = books.length > 0 && selectedBookIds.size === books.length;
    return (
        <div style={styles.bookTableWrapper}>
            <table style={styles.bookTable}>
                <thead>
                    <tr>
                        <th style={{...styles.th, width: '40px'}}><input type="checkbox" checked={isAllSelected} onChange={e => onSelectAll(e.target.checked)} /></th>
                        <th style={{...styles.th, width: '40px'}}></th>
                        <th style={{...styles.th, width: '40px'}}>OCR</th>
                        <th style={styles.th}>Název</th>
                        <th style={styles.th}>Autor</th>
                        <th style={styles.th}>Kategorie</th>
                        <th style={styles.th}>Štítky</th>
                        <th style={styles.th}>Rok vydání</th>
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
                        <tr key={book.id} style={{ ...styles.tr, ...(book.id === selectedBookId ? styles.trSelected : {}) }} >
                            <td style={styles.td} onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedBookIds.has(book.id)} onChange={() => onToggleSelection(book.id)} /></td>
                            <td style={{...styles.td, textAlign: 'center', cursor: 'pointer'}} onClick={(e) => {e.stopPropagation(); onVectorDatabaseAction(book);}} title={`Stav vektorové databáze: ${book.vectorStatus === 'pending' ? 'čeká na nahrání' : book.vectorStatus === 'success' ? 'úspěšně nahráno' : 'chyba při nahrávání'}\n\nKlikněte pro odeslání do vektorové databáze.\nPřed odesláním budou zkontrolována povinná metadata.`}><IconDatabase status={book.vectorStatus} /></td>
                            <td style={{...styles.td, textAlign: 'center'}} onClick={() => onSelectBook(book.id)} title={`OCR: ${book.hasOCR ? 'Dokument obsahuje rozpoznaný text' : 'Dokument neobsahuje rozpoznaný text'}`}><IconOCR hasOCR={book.hasOCR} /></td>
                            <td style={{...styles.td, ...styles.tdTitle}} onClick={() => onSelectBook(book.id)}>{book.title}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.author}</td>
                            <td style={{...styles.td, minWidth: '150px'}} onClick={() => onSelectBook(book.id)}>{book.categories.join(', ')}</td>
                            <td style={{...styles.td, minWidth: '150px'}} onClick={() => onSelectBook(book.id)}>{book.labels.join(', ')}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.publicationYear || '–'}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.publicationTypes.length ? book.publicationTypes.map(t => t.replace('_',' ')).join(', ') : '–'}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{getFlagEmoji(book.language)}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{book.format}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{formatFileSize(book.fileSize)}</td>
                            <td style={styles.td} onClick={() => onSelectBook(book.id)}>{formatDate(book.dateAdded)}</td>
                            <td style={{...styles.td, ...styles.tdActions}} onClick={e => e.stopPropagation()}>
                                <button style={styles.iconButton} onClick={() => alert('Stahování není implementováno.')} aria-label="Stáhnout knihu"><IconDownload/></button>
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
}
const BookDetailPanel = ({ book, onUpdate, onDelete, onReadClick, allLabels, onAddNewLabel, onDeleteLabel, allCategories, onAddNewCategory, onDeleteCategory, allPublicationTypes, onAddNewPublicationType, onDeletePublicationType }: BookDetailPanelProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localBook, setLocalBook] = useState(book);
    const [isGenerating, setIsGenerating] = useState<Partial<Record<keyof Book, boolean>>>({});
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);

    // Stabilní callback pro setLocalBook
    const updateLocalBook = useCallback((updater: React.SetStateAction<Book>) => {
        setLocalBook(updater);
    }, []);

    useEffect(() => {
        // Pouze aktualizuj localBook pokud se změnilo ID knihy (vybrali jsme jinou knihu)
        // nebo při prvním načtení (když localBook ještě není inicializovaná)
        if (!localBook.id || localBook.id !== book.id) {
            setLocalBook(book);
            setIsEditing(false);
        }
    }, [book.id, localBook.id]); // Reaguje pouze na změnu ID knihy

    const handleAIGenerate = useCallback(async (field: keyof Book) => {
        setIsGenerating(prev => ({ ...prev, [field]: true }));
        const result = await generateMetadataWithAI(field, localBook);
        
        let updatedValue: any = result;
        if (field === 'keywords') {
            updatedValue = result.split(',').map(k => k.trim());
        } else if (field === 'publicationYear') {
            updatedValue = parseInt(result, 10) || localBook.publicationYear;
        }

        updateLocalBook(prev => ({...prev, [field]: updatedValue}));
        setIsGenerating(prev => ({ ...prev, [field]: false }));
    }, [updateLocalBook]); // Odstranil jsem localBook z dependencies

    const handleBulkAIGenerate = async () => {
        setIsBulkGenerating(true);
        const fieldsToFill: (keyof Book)[] = [];

        // Použijeme aktuální localBook pro kontrolu, ale nebudeme ho měnit v dependencies
        const currentBook = localBook;
        
        if (!currentBook.author || currentBook.author === 'Neznámý') fieldsToFill.push('author');
        if (!currentBook.publicationYear) fieldsToFill.push('publicationYear');
        if (!currentBook.publisher) fieldsToFill.push('publisher');
        if (!currentBook.summary) fieldsToFill.push('summary');
        if (!currentBook.keywords || currentBook.keywords.length === 0) fieldsToFill.push('keywords');
        if (!currentBook.language || currentBook.language === 'Neznámý') fieldsToFill.push('language');

        if (fieldsToFill.length === 0) {
            alert("Všechna metadata se zdají být vyplněna.");
            setIsBulkGenerating(false);
            return;
        }

        // NOVÝ PŘÍSTUP: Jeden request do Gemini pro všechna metadata najednou
        console.log(`🤖 Generuji všechna metadata v jednom požadavku pro pole: ${fieldsToFill.join(', ')}`);
        
        let results;
        try {
            results = await generateAllMetadataWithAI(fieldsToFill, localBook);
            console.log("✅ Všechna metadata vygenerována v jednom požadavku:", results);
        } catch (error) {
            console.error("❌ Chyba při hromadném generování:", error);
            // Fallback na původní přístup po jednom
            console.log("🔄 Zkouším fallback přístup - generování po jednotlivých polích...");
            const generationPromises = fieldsToFill.map(field =>
                generateMetadataWithAI(field, localBook)
                    .then(result => ({ field, status: 'fulfilled' as const, value: result }))
                    .catch(error => ({ field, status: 'rejected' as const, reason: error }))
            );
            results = await Promise.all(generationPromises);
        }

        updateLocalBook(prevBook => {
            const newBookData = { ...prevBook };
            results.forEach(item => {
                if (item.status === 'fulfilled') {
                    if (item.value) {
                        let updatedValue: any = item.value;
                        if (item.field === 'keywords') {
                            updatedValue = item.value.split(',').map(k => k.trim());
                        } else if (item.field === 'publicationYear') {
                            updatedValue = parseInt(item.value, 10) || null;
                        }
                        (newBookData as any)[item.field] = updatedValue;
                    }
                } else {
                    console.error(`Failed to generate metadata for ${item.field}:`, item.reason);
                }
            });
            return newBookData;
        });
        
        setIsBulkGenerating(false);
    };

    const handleSave = () => {
        onUpdate(localBook);
        setIsEditing(false);
    };

    const handleCancel = () => {
        updateLocalBook(book);
        setIsEditing(false);
    };
    
    const ReadOnlyView = () => (
        <>
            {renderStaticField("Autor", localBook.author)}
            {renderStaticField("Rok vydání", localBook.publicationYear)}
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
            {renderStaticField("OCR", (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <IconOCR hasOCR={localBook.hasOCR} />
                    <span style={{color: localBook.hasOCR ? '#22c55e' : '#6b7280'}}>
                        {localBook.hasOCR ? 'Dokument obsahuje rozpoznaný text' : 'Dokument neobsahuje rozpoznaný text'}
                    </span>
                    <button 
                        style={{...styles.button, fontSize: '0.8em', padding: '4px 8px', marginLeft: '8px'}}
                        onClick={async () => {
                            try {
                                console.log('🔍 Manuální kontrola OCR...');
                                const realOCRStatus = await api.detectOCRFromStorage(localBook.filePath);
                                console.log('🔍 Detekovaný OCR stav:', realOCRStatus);
                                
                                if (realOCRStatus !== localBook.hasOCR) {
                                    const updatedBook = { ...localBook, hasOCR: realOCRStatus };
                                    updateLocalBook(updatedBook);
                                    await api.updateBook(updatedBook);
                                    alert(`OCR stav aktualizován: ${realOCRStatus ? 'NALEZEN text' : 'NENALEZEN text'}`);
                                } else {
                                    alert(`OCR stav je správný: ${realOCRStatus ? 'NALEZEN text' : 'NENALEZEN text'}`);
                                }
                            } catch (error) {
                                console.error('❌ Chyba při kontrole OCR:', error);
                                alert('Chyba při kontrole OCR stavu');
                            }
                        }}
                        title="Zkontrolovat OCR stav znovu"
                    >
                        🔍 Zkontrolovat
                    </button>
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
                label="Nakladatelství"
                name="publisher"
                value={localBook.publisher}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.publisher || false}
                type="text"
            />
            <EditableField 
                label="Jazyk"
                name="language"
                value={localBook.language}
                setLocalBook={updateLocalBook}
                onAIGenerate={handleAIGenerate}
                isGenerating={isGenerating.language || false}
                type="text"
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
                <label style={styles.label}>OCR</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <IconOCR hasOCR={localBook.hasOCR} />
                    <select 
                        value={localBook.hasOCR ? 'true' : 'false'} 
                        onChange={(e) => updateLocalBook(prev => ({ ...prev, hasOCR: e.target.value === 'true' }))}
                        style={styles.input}
                    >
                        <option value="true">Dokument obsahuje rozpoznaný text</option>
                        <option value="false">Dokument neobsahuje rozpoznaný text</option>
                    </select>
                </div>
            </div>
        </>
    ), [localBook, updateLocalBook, handleAIGenerate, isGenerating, allCategories, onAddNewCategory, onDeleteCategory, allLabels, onAddNewLabel, onDeleteLabel, allPublicationTypes, onAddNewPublicationType, onDeletePublicationType]);

    return (
        <div style={styles.detailContent}>
            <img src={book.coverImageUrl} alt={`Obálka: ${book.title}`} style={styles.detailCover} />
            <h2 style={styles.detailTitle}>{localBook.title || "Bez názvu"}</h2>
            <div style={styles.detailActions}>
                 <button style={styles.button} onClick={onReadClick}>Číst knihu</button>
                 {isEditing ? (
                    <>
                        <button style={styles.button} onClick={handleBulkAIGenerate} disabled={isBulkGenerating}>
                            {isBulkGenerating ? 'Generuji...' : <><IconMagic /> Vyplnit metadata</>}
                        </button>
                        <button style={{...styles.button, ...styles.buttonDanger}} onClick={handleCancel}>Zrušit</button>
                        <button style={{...styles.button, ...styles.buttonSuccess}} onClick={handleSave}><IconSave /> Uložit</button>
                    </>
                 ) : (
                    <>
                    <button style={styles.iconButton} onClick={() => setIsEditing(true)} aria-label="Upravit metadata"><IconEdit /></button>
                    <button style={{...styles.iconButton, color: 'var(--danger-color)'}} onClick={() => onDelete(book.id)} aria-label="Smazat knihu"><IconDelete size={18}/></button>
                    </>
                 )}
            </div>
            <div style={styles.detailMeta}>
                {isEditing ? editableContent : <ReadOnlyView />}
            </div>
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
                    <button onClick={handleAIGenerate} disabled={isGenerating} style={styles.aiButton} aria-label={`Generovat ${label}`}>
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
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', backgroundColor: 'var(--background-secondary)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 },
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
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);