/**
 * VLASTNÍ AUTENTIZAČNÍ SYSTÉM
 * Bez Supabase Authentication - používáme pouze vlastní tabulku users
 */

import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'spravce';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    createdAt: string;
}

export interface UserSession {
    userId: string;
    email: string;
    role: UserRole;
    token: string;
    expiresAt: string;
}

// Klíč pro uložení session v localStorage
const SESSION_STORAGE_KEY = 'app_user_session';
const SESSION_EXPIRY_DAYS = 7;

/**
 * Generování náhodného tokenu pro session
 */
function generateToken(): string {
    return Math.random().toString(36).substring(2) + 
           Math.random().toString(36).substring(2) + 
           Date.now().toString(36);
}

/**
 * Získání aktuální session z localStorage
 */
export function getCurrentSession(): UserSession | null {
    try {
        const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!sessionStr) return null;

        const session: UserSession = JSON.parse(sessionStr);
        
        // Kontrola expirace
        if (new Date(session.expiresAt) < new Date()) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }

        return session;
    } catch (err) {
        console.error('Chyba při načítání session:', err);
        return null;
    }
}

/**
 * Uložení session do localStorage
 */
function saveSession(session: UserSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Smazání session z localStorage
 */
function clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Přihlášení uživatele
 */
export async function login(
    email: string, 
    password: string
): Promise<{ user: User | null; error: string | null }> {
    try {
        console.log('🔐 Přihlašování uživatele:', email);

        // 1. Najít uživatele podle emailu
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (fetchError || !userData) {
            console.error('❌ Uživatel nenalezen:', fetchError);
            return { user: null, error: 'Nesprávný email nebo heslo' };
        }

        // 2. Ověření hesla
        const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
        
        if (!isPasswordValid) {
            console.error('❌ Nesprávné heslo');
            return { user: null, error: 'Nesprávný email nebo heslo' };
        }

        // 3. Vytvoření session
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

        // 4. Uložení session do databáze
        const { error: sessionError } = await supabase
            .from('user_sessions')
            .insert({
                user_id: userData.id,
                token: token,
                expires_at: expiresAt.toISOString()
            });

        if (sessionError) {
            console.error('⚠️ Nepodařilo se uložit session do DB:', sessionError);
            // Pokračujeme i bez DB session (fallback na localStorage)
        }

        // 5. Uložení session do localStorage
        const session: UserSession = {
            userId: userData.id,
            email: userData.email,
            role: userData.role as UserRole,
            token: token,
            expiresAt: expiresAt.toISOString()
        };
        saveSession(session);

        // 6. Vytvoření User objektu
        const user: User = {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role as UserRole,
            createdAt: userData.created_at
        };

        console.log('✅ Přihlášení úspěšné:', user.email);
        return { user, error: null };

    } catch (err) {
        console.error('❌ Chyba při přihlášení:', err);
        return { user: null, error: 'Neočekávaná chyba při přihlášení' };
    }
}

/**
 * Odhlášení uživatele
 */
export async function logout(): Promise<{ error: string | null }> {
    try {
        const session = getCurrentSession();
        
        if (session) {
            // Smazat session z databáze
            await supabase
                .from('user_sessions')
                .delete()
                .eq('token', session.token);
        }

        // Smazat session z localStorage
        clearSession();

        console.log('✅ Odhlášení úspěšné');
        return { error: null };
    } catch (err) {
        console.error('❌ Chyba při odhlášení:', err);
        clearSession(); // I při chybě smažeme lokální session
        return { error: null }; // Nehlásíme chybu uživateli
    }
}

/**
 * Získání aktuálně přihlášeného uživatele
 */
export async function getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    try {
        const session = getCurrentSession();
        
        if (!session) {
            return { user: null, error: null };
        }

        // Načíst aktuální údaje uživatele z databáze
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.userId)
            .single();

        if (fetchError || !userData) {
            console.error('❌ Nepodařilo se načíst uživatele:', fetchError);
            clearSession(); // Session je neplatná
            return { user: null, error: 'Uživatel nenalezen' };
        }

        const user: User = {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            role: userData.role as UserRole,
            createdAt: userData.created_at
        };

        return { user, error: null };
    } catch (err) {
        console.error('❌ Chyba při získávání uživatele:', err);
        return { user: null, error: 'Chyba při načítání uživatele' };
    }
}

/**
 * Kontrola, zda je uživatel správce
 */
export async function isAdmin(): Promise<boolean> {
    const { user } = await getCurrentUser();
    return user?.role === 'spravce';
}

/**
 * Změna hesla aktuálního uživatele
 * Nevyžaduje ověření starého hesla - uživatel už je přihlášený
 */
export async function changePassword(
    newPassword: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { user } = await getCurrentUser();
        
        if (!user) {
            return { success: false, error: 'Uživatel není přihlášen' };
        }

        console.log('🔐 Měním heslo pro uživatele:', user.id);

        // 1. Zahashovat nové heslo
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        console.log('✅ Heslo zahashováno');

        // 2. Aktualizovat heslo v databázi
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newPasswordHash })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Chyba při změně hesla:', updateError);
            return { success: false, error: 'Nepodařilo se změnit heslo' };
        }

        console.log('✅ Heslo úspěšně změněno');
        return { success: true, error: null };

    } catch (err) {
        console.error('❌ Chyba při změně hesla:', err);
        return { success: false, error: 'Neočekávaná chyba při změně hesla' };
    }
}

/**
 * Validace hesla (minimální požadavky)
 */
export function validatePassword(password: string): { valid: boolean; error: string | null } {
    if (password.length < 6) {
        return { valid: false, error: 'Heslo musí mít alespoň 6 znaků' };
    }
    return { valid: true, error: null };
}

/**
 * Vyčištění vypršelých sessions (volat periodicky)
 */
export async function cleanupExpiredSessions(): Promise<void> {
    try {
        await supabase.rpc('cleanup_expired_sessions');
    } catch (err) {
        console.error('Chyba při čištění sessions:', err);
    }
}

