import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * Stránka pro reset hesla
 * Zpracovává token z emailového odkazu a umožňuje uživateli nastavit nové heslo
 */
export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validatingToken, setValidatingToken] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Kontrola, zda máme hash v URL
        const checkSession = async () => {
            try {
                // Supabase automaticky zpracuje hash z URL a vytvoří session
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Chyba při získávání session:', error);
                    setError('Odkaz pro reset hesla je neplatný nebo vypršel. Požádejte o nový odkaz.');
                    setValidatingToken(false);
                    return;
                }

                if (!session) {
                    setError('Odkaz pro reset hesla je neplatný nebo vypršel. Požádejte o nový odkaz.');
                    setValidatingToken(false);
                    return;
                }

                console.log('✅ Token validován, uživatel může nastavit nové heslo');
                setValidatingToken(false);
            } catch (err) {
                console.error('Neočekávaná chyba při validaci tokenu:', err);
                setError('Došlo k neočekávané chybě. Zkuste to prosím znovu.');
                setValidatingToken(false);
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Validace
        if (!newPassword || newPassword.length < 6) {
            setError('Heslo musí mít alespoň 6 znaků');
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Hesla se neshodují');
            setLoading(false);
            return;
        }

        try {
            // Aktualizace hesla
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                console.error('Chyba při změně hesla:', updateError);
                setError(updateError.message);
                setLoading(false);
                return;
            }

            setSuccess(true);
            setLoading(false);

            // Po 2 sekundách přesměrovat na hlavní stránku
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            console.error('Neočekávaná chyba při změně hesla:', err);
            setError('Došlo k neočekávané chybě. Zkuste to prosím znovu.');
            setLoading(false);
        }
    };

    if (validatingToken) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.title}>Ověřuji odkaz...</h2>
                    <p style={styles.text}>Prosím čekejte, ověřujeme váš odkaz pro reset hesla.</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.successIcon}>✓</div>
                    <h2 style={styles.title}>Heslo bylo změněno</h2>
                    <p style={styles.text}>
                        Vaše heslo bylo úspěšně změněno. Za chvíli budete přesměrováni na přihlašovací stránku.
                    </p>
                </div>
            </div>
        );
    }

    if (error && validatingToken === false && !newPassword) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.errorIcon}>✕</div>
                    <h2 style={styles.title}>Neplatný odkaz</h2>
                    <p style={styles.text}>{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        style={styles.backButton}
                    >
                        Zpět na přihlášení
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Nastavení nového hesla</h2>
                <p style={styles.subtitle}>Zadejte své nové heslo</p>

                {error && (
                    <div style={styles.errorMessage}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label htmlFor="newPassword" style={styles.label}>
                            Nové heslo
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Zadejte nové heslo"
                            style={styles.input}
                            required
                            minLength={6}
                            disabled={loading}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label htmlFor="confirmPassword" style={styles.label}>
                            Potvrďte heslo
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Zadejte heslo znovu"
                            style={styles.input}
                            required
                            minLength={6}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            ...styles.submitButton,
                            ...(loading ? styles.submitButtonDisabled : {})
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Ukládám...' : 'Změnit heslo'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '20px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
    },
    title: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '8px',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
        textAlign: 'center',
    },
    text: {
        fontSize: '14px',
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: '1.5',
    },
    successIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#10b981',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        margin: '0 auto 20px',
    },
    errorIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#ef4444',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        margin: '0 auto 20px',
    },
    errorMessage: {
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '20px',
        color: '#991b1b',
        fontSize: '14px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
    },
    input: {
        padding: '10px 14px',
        fontSize: '14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    submitButton: {
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '12px',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        marginTop: '10px',
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
        cursor: 'not-allowed',
    },
    backButton: {
        backgroundColor: '#6b7280',
        color: 'white',
        padding: '12px',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        marginTop: '20px',
        width: '100%',
    },
};

