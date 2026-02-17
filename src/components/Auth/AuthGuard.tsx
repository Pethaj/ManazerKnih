import React, { useState, useEffect } from 'react';
import { getCurrentUser, User } from '../../services/customAuthService';
import LoginForm from './LoginForm';

interface AuthGuardProps {
    children: (user: User) => React.ReactNode;
}

/**
 * AUTH GUARD S VLASTNÍ AUTENTIZACÍ
 * 
 * - ✅ Vyžaduje přihlášení pro přístup do aplikace
 * - ✅ Po refreshi stránky zachová session z localStorage
 * - ✅ Jednoduché, bez Supabase Auth
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialCheck, setIsInitialCheck] = useState(true);

    const checkAuth = async () => {
        
        try {
            const { user: currentUser, error: authError } = await getCurrentUser();
            
            if (authError) {
                setUser(null);
            } else if (currentUser) {
                setUser(currentUser);
            } else {
                setUser(null);
            }
        } catch (err) {
            setUser(null);
        } finally {
            setIsLoading(false);
            setIsInitialCheck(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const handleLoginSuccess = () => {
        checkAuth();
    };

    // Zobrazení loading stavu pouze při prvním načtení
    if (isLoading && isInitialCheck) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #e5e7eb',
                        borderTopColor: '#667eea',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }} />
                    <p style={{
                        color: '#374151',
                        fontSize: '16px',
                        fontWeight: '500',
                        margin: 0
                    }}>
                        Načítání session...
                    </p>
                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    // Pokud není uživatel přihlášen a už proběhla kontrola, zobrazit login formulář
    if (!user) {
        return <LoginForm onLoginSuccess={handleLoginSuccess} />;
    }

    // Pokud je uživatel přihlášen, zobrazit chráněný obsah
    return <>{children(user)}</>;
};

export default AuthGuard;


