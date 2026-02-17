/**
 * ADMIN SLUŽBY PRO SPRÁVU UŽIVATELŮ
 * Vytváření, mazání a úprava uživatelů bez Supabase Auth
 */

import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { isAdmin, User, UserRole } from './customAuthService';

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

/**
 * Generování hesla podle vzorce: 4 písmena z příjmení + 4 náhodné číslice
 * Například: "haj d2847" pro příjmení "Hajduk"
 */
function generatePasswordFromSurname(surname: string): string {
    // Vezme první 4 písmena z příjmení (nebo méně, pokud je příjmení kratší)
    const surnamePart = surname.substring(0, 4).toLowerCase();
    
    // Vygeneruje 4 náhodné číslice (1000-9999)
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    
    return surnamePart + randomDigits;
}

/**
 * Generování jednoduchého hesla (fallback)
 */
function generateSimplePassword(): string {
    // Výchozí heslo pokud není zadáno příjmení
    return 'heslo123';
}

/**
 * Vytvoření nového uživatele (pouze pro adminy)
 */
export async function adminCreateUser(
    email: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    password?: string // Pokud není zadáno, vygeneruje se
): Promise<{ success: boolean; error: string | null; password?: string; user?: UserProfile }> {
    try {
        // Kontrola, zda je aktuální uživatel admin
        const isUserAdmin = await isAdmin();
        if (!isUserAdmin) {
            return { success: false, error: 'Pouze správce může vytvářet uživatele' };
        }

        // Kontrola, zda email již existuje
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return { success: false, error: 'Uživatel s tímto emailem již existuje' };
        }

        // Generovat nebo použít zadané heslo
        const userPassword = password || generatePasswordFromSurname(lastName);
        
        // Zahashovat heslo
        const passwordHash = await bcrypt.hash(userPassword, 10);

        // Vytvořit uživatele
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                first_name: firstName,
                last_name: lastName,
                role: role
            })
            .select()
            .single();

        if (insertError || !newUser) {
            return { success: false, error: 'Nepodařilo se vytvořit uživatele' };
        }

        const userProfile: UserProfile = {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            role: newUser.role as UserRole,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at
        };

        return { 
            success: true, 
            error: null, 
            password: userPassword,
            user: userProfile
        };

    } catch (err) {
        return { success: false, error: 'Neočekávaná chyba při vytváření uživatele' };
    }
}

/**
 * Získání seznamu všech uživatelů (pouze pro adminy)
 */
export async function adminListUsers(): Promise<{ users: UserProfile[] | null; error: string | null }> {
    try {
        // Kontrola, zda je aktuální uživatel admin
        const isUserAdmin = await isAdmin();
        if (!isUserAdmin) {
            return { users: null, error: 'Pouze správce může zobrazit seznam uživatelů' };
        }

        const { data: usersData, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchError) {
            return { users: null, error: 'Nepodařilo se načíst seznam uživatelů' };
        }

        const users: UserProfile[] = (usersData || []).map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role as UserRole,
            created_at: user.created_at,
            updated_at: user.updated_at
        }));

        return { users, error: null };
    } catch (err) {
        return { users: null, error: 'Neočekávaná chyba při načítání uživatelů' };
    }
}

/**
 * Smazání uživatele (pouze pro adminy)
 */
export async function adminDeleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        // Kontrola, zda je aktuální uživatel admin
        const isUserAdmin = await isAdmin();
        if (!isUserAdmin) {
            return { success: false, error: 'Pouze správce může mazat uživatele' };
        }

        // Smazat všechny session uživatele
        await supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', userId);

        // Smazat uživatele
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            return { success: false, error: 'Nepodařilo se smazat uživatele' };
        }

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: 'Neočekávaná chyba při mazání uživatele' };
    }
}

/**
 * Aktualizace role uživatele (pouze pro adminy)
 */
export async function adminUpdateUserRole(
    userId: string,
    newRole: UserRole
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Kontrola, zda je aktuální uživatel admin
        const isUserAdmin = await isAdmin();
        if (!isUserAdmin) {
            return { success: false, error: 'Pouze správce může měnit role uživatelů' };
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        if (updateError) {
            return { success: false, error: 'Nepodařilo se změnit roli' };
        }

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: 'Neočekávaná chyba při změně role' };
    }
}

/**
 * Reset hesla uživatele (pouze pro adminy)
 * Vygeneruje nové heslo a vrátí ho
 */
export async function adminResetUserPassword(
    userId: string
): Promise<{ success: boolean; error: string | null; newPassword?: string }> {
    try {
        // Kontrola, zda je aktuální uživatel admin
        const isUserAdmin = await isAdmin();
        if (!isUserAdmin) {
            return { success: false, error: 'Pouze správce může resetovat hesla' };
        }

        // Vygenerovat nové heslo
        const newPassword = generateSimplePassword();
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Aktualizovat heslo
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', userId);

        if (updateError) {
            return { success: false, error: 'Nepodařilo se resetovat heslo' };
        }

        // Smazat všechny session uživatele (vynutit opětovné přihlášení)
        await supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', userId);

        return { success: true, error: null, newPassword };
    } catch (err) {
        return { success: false, error: 'Neočekávaná chyba při resetu hesla' };
    }
}

/**
 * Aktualizace údajů uživatele (pouze pro adminy)
 */
export async function adminUpdateUser(
    userId: string,
    updates: {
        email?: string;
        firstName?: string;
        lastName?: string;
        role?: UserRole;
    }
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Kontrola, zda je aktuální uživatel admin
        const isUserAdmin = await isAdmin();
        if (!isUserAdmin) {
            return { success: false, error: 'Pouze správce může upravovat uživatele' };
        }

        // Připravit data pro update
        const updateData: any = {};
        if (updates.email !== undefined) updateData.email = updates.email.toLowerCase();
        if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
        if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
        if (updates.role !== undefined) updateData.role = updates.role;

        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (updateError) {
            return { success: false, error: 'Nepodařilo se aktualizovat uživatele' };
        }

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: 'Neočekávaná chyba při aktualizaci uživatele' };
    }
}

