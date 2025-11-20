import React, { useState } from 'react';
import { changePassword, User } from '../../services/customAuthService';

interface ProfileSettingsProps {
    currentUser: User;
    onClose: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validace
        if (!newPassword || !confirmPassword) {
            setError('Vyplňte všechna pole');
            return;
        }

        if (newPassword.length < 6) {
            setError('Nové heslo musí mít alespoň 6 znaků');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Nová hesla se neshodují');
            return;
        }

        setIsLoading(true);

        try {
            // V novém systému potřebujeme současné heslo
            // Pro tento starý ProfileSettings komponent, použijeme prázdný string
            // Doporučujeme použít novou komponentu ChangePassword místo této
            const result = await changePassword('', newPassword);
            
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setNewPassword('');
                setConfirmPassword('');
                
                // Po 2 sekundách zavřít modal
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (err) {
            setError('Neočekávaná chyba při změně hesla');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Nastavení profilu</h2>
                <button onClick={onClose} style={styles.closeButton} aria-label="Zavřít">
                    ✕
                </button>
            </div>

            <div style={styles.userInfo}>
                <div style={styles.userInfoRow}>
                    <span style={styles.label}>Email:</span>
                    <span style={styles.value}>{currentUser.email}</span>
                </div>
                <div style={styles.userInfoRow}>
                    <span style={styles.label}>Role:</span>
                    <span style={styles.value}>
                        {currentUser.role === 'spravce' ? 'Správce' : 'Admin'}
                    </span>
                </div>
            </div>

            <div style={styles.divider} />

            <h3 style={styles.subtitle}>Změna hesla</h3>

            {error && (
                <div style={styles.errorMessage}>
                    {error}
                </div>
            )}

            {success && (
                <div style={styles.successMessage}>
                    ✓ Heslo bylo úspěšně změněno
                </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                    <label style={styles.formLabel} htmlFor="newPassword">
                        Nové heslo
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={styles.input}
                        disabled={isLoading}
                        autoComplete="new-password"
                        minLength={6}
                    />
                    <span style={styles.hint}>Minimálně 6 znaků</span>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.formLabel} htmlFor="confirmPassword">
                        Potvrdit nové heslo
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={styles.input}
                        disabled={isLoading}
                        autoComplete="new-password"
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={styles.cancelButton}
                        disabled={isLoading}
                    >
                        Zrušit
                    </button>
                    <button
                        type="submit"
                        style={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Ukládám...' : 'Změnit heslo'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: '400px',
        maxWidth: '500px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        padding: '0.25rem',
        color: 'var(--text-secondary)',
        transition: 'color 0.2s',
    },
    userInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
    },
    userInfoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    value: {
        color: 'var(--text-primary)',
        fontSize: '0.9rem',
        fontWeight: '600',
    },
    divider: {
        height: '1px',
        background: 'var(--border-color)',
        margin: '0.5rem 0',
    },
    subtitle: {
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
    },
    errorMessage: {
        padding: '0.75rem 1rem',
        background: '#fee',
        border: '1px solid #fcc',
        borderRadius: '6px',
        color: '#c33',
        fontSize: '0.9rem',
    },
    successMessage: {
        padding: '0.75rem 1rem',
        background: '#efe',
        border: '1px solid #cfc',
        borderRadius: '6px',
        color: '#3c3',
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    formLabel: {
        fontSize: '0.9rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
    },
    input: {
        padding: '0.75rem',
        fontSize: '1rem',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    hint: {
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
    },
    buttonGroup: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        marginTop: '0.5rem',
    },
    cancelButton: {
        padding: '0.75rem 1.5rem',
        fontSize: '0.95rem',
        fontWeight: '500',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        background: 'white',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitButton: {
        padding: '0.75rem 1.5rem',
        fontSize: '0.95rem',
        fontWeight: '500',
        border: 'none',
        borderRadius: '6px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
    },
};

export default ProfileSettings;


