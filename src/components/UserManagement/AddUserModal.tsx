import React, { useState } from 'react';
import { adminCreateUser } from '../../services/customAdminService';
import { UserRole } from '../../services/customAuthService';
import PasswordPopup from './PasswordPopup';

interface AddUserModalProps {
    onClose: () => void;
    onUserAdded: () => void;
}

const IconClose = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const IconCopy = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

export const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onUserAdded }) => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [role, setRole] = useState<UserRole>('admin');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [previewPassword, setPreviewPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const [showPasswordPopup, setShowPasswordPopup] = useState(false);

    // Funkce pro náhled hesla při psaní jména
    const handleFirstNameChange = (value: string) => {
        setFirstName(value);
    };

    // Funkce pro náhled hesla při psaní příjmení
    const handleSurnameChange = (value: string) => {
        setSurname(value);
        // Náhled hesla: 4 písmena z příjmení + 4 náhodné číslice
        if (value.length >= 4) {
            const surnamePart = value.substring(0, 4).toLowerCase();
            setPreviewPassword(surnamePart + 'XXXX'); // Ukážeme vzorec
        } else if (value.length > 0) {
            setPreviewPassword(value.toLowerCase() + 'XXXX');
        } else {
            setPreviewPassword('');
        }
    };

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!email.trim()) {
            setError('Vyplňte email');
            setIsLoading(false);
            return;
        }

        if (!firstName.trim() || firstName.trim().length < 2) {
            setError('Jméno musí mít alespoň 2 znaky');
            setIsLoading(false);
            return;
        }

        if (!surname.trim() || surname.trim().length < 2) {
            setError('Příjmení musí mít alespoň 2 znaky');
            setIsLoading(false);
            return;
        }

        const { success: createSuccess, error: createError, password } = await adminCreateUser(
            email.trim(),
            firstName.trim(),
            surname.trim(),
            role,
            undefined // Použije výchozí heslo "heslo123"
        );

        setIsLoading(false);

        if (createError) {
            setError(createError);
            return;
        }

        if (createSuccess && password) {
            setGeneratedPassword(password);
            setShowPasswordPopup(true); // ZOBRAZIT POPUP!
        } else {
            setError('Nepodařilo se vytvořit uživatele');
        }
    };

    return (
        <>
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
                border: '1px solid #eaddd7',
                fontFamily: 'Inter, sans-serif'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #eaddd7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#4a4a4a',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        Pozvat nového uživatele
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            color: '#6b7280'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3eee8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                        }}
                    >
                        <IconClose />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    <form onSubmit={handleSubmit}>
                            <div style={{
                                padding: '16px',
                                background: '#e6f2f9',
                                border: '1px solid #C8A97E',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                fontSize: '13px',
                                color: '#4a4a4a',
                                lineHeight: '1.6',
                                fontFamily: 'Inter, sans-serif'
                            }}>
                                <strong>Poznámka:</strong> Heslo bude automaticky vygenerováno z příjmení (4 písmena) + 4 náhodné číslice (např. <strong>haj d2847</strong>). 
                                Uživatel se může přihlásit s tímto heslem a následně si ho změnit v nastavení.
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Email
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    placeholder="uzivatel@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        border: '1px solid #eaddd7',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        fontFamily: 'Inter, sans-serif',
                                        backgroundColor: '#ffffff'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#5d7fa3';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(93, 127, 163, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#eaddd7';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Jméno
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => handleFirstNameChange(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    placeholder="Jméno uživatele"
                                    minLength={2}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        border: '1px solid #eaddd7',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        fontFamily: 'Inter, sans-serif',
                                        backgroundColor: '#ffffff'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#5d7fa3';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(93, 127, 163, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#eaddd7';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {firstName.length > 0 && firstName.length < 2 && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#dc2626',
                                        marginTop: '4px',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        Jméno musí mít alespoň 2 znaky
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Příjmení
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={surname}
                                    onChange={(e) => handleSurnameChange(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    placeholder="Příjmení uživatele"
                                    minLength={2}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        border: '1px solid #eaddd7',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        fontFamily: 'Inter, sans-serif',
                                        backgroundColor: '#ffffff'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#5d7fa3';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(93, 127, 163, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#eaddd7';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {surname.length > 0 && surname.length < 2 && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#dc2626',
                                        marginTop: '4px',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        Příjmení musí mít alespoň 2 znaky
                                    </div>
                                )}
                                {previewPassword && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        Náhled hesla: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{previewPassword}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Role
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    disabled={isLoading}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        border: '1px solid #eaddd7',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                        color: '#4a4a4a'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#5d7fa3';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(93, 127, 163, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#eaddd7';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    <option value="admin">Admin (může přidávat/upravovat knihy)</option>
                                    <option value="spravce">Správce (plný přístup k systému)</option>
                                </select>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '12px 16px',
                                    marginBottom: '20px',
                                    background: '#fee2e2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: '#991b1b',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    {error}
                                </div>
                            )}

                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#4a4a4a',
                                        background: '#f3eee8',
                                        border: '1px solid #eaddd7',
                                        borderRadius: '8px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        opacity: isLoading ? 0.5 : 1,
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.background = '#eaddd7';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.background = '#f3eee8';
                                        }
                                    }}
                                >
                                    Zrušit
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: 'white',
                                        backgroundColor: isLoading ? '#9ca3af' : '#5d7fa3',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: isLoading ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.backgroundColor = '#4a6582';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.backgroundColor = '#5d7fa3';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                        }
                                    }}
                                >
                                    {isLoading ? 'Vytváření...' : 'Vytvořit uživatele'}
                                </button>
                            </div>
                        </form>
                </div>
            </div>
        </div>

        {/* POPUP S HESLEM - ZOBRAZÍ SE VŽDY PO VYTVOŘENÍ */}
        {showPasswordPopup && generatedPassword && (
            <PasswordPopup
                email={email}
                password={generatedPassword}
                onClose={() => {
                    setShowPasswordPopup(false);
                    onUserAdded();
                }}
            />
        )}
        </>
    );
};

export default AddUserModal;

