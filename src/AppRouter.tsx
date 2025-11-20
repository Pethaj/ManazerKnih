import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Import hlavní App komponenty z main.tsx
// POZNÁMKA: Toto bude potřeba upravit podle skutečné struktury
// Prozatím předpokládáme, že App je exportována z index.tsx
interface AppRouterProps {
    MainApp: React.ComponentType;
}

/**
 * Router pro aplikaci
 * Spravuje routing mezi hlavní aplikací a reset password stránkou
 * Magic link používá defaultní Supabase flow - automaticky zpracováno pomocí detectSessionInUrl
 */
export default function AppRouter({ MainApp }: AppRouterProps) {
    return (
        <BrowserRouter>
            <Routes>
                {/* Reset hesla - přístupná pro všechny */}
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
                {/* Hlavní aplikace */}
                <Route path="/" element={<MainApp />} />
                
                {/* Fallback - přesměrování na home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}


