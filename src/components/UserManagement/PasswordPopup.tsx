import React, { useState } from 'react';

interface PasswordPopupProps {
    email: string;
    password: string;
    onClose: () => void;
}

const IconCopy = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

export const PasswordPopup: React.FC<PasswordPopupProps> = ({ email, password, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Chyba při kopírování:', err);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                textAlign: 'center'
            }}>
                {/* Zelený checkmark */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: '#22c55e',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px'
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <h2 style={{
                    margin: '0 0 16px 0',
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#1a1a1a',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    Uživatel vytvořen!
                </h2>

                <p style={{
                    margin: '0 0 32px 0',
                    fontSize: '16px',
                    color: '#666',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    Zkopírujte heslo a předejte ho uživateli
                </p>

                {/* Email */}
                <div style={{
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                    textAlign: 'left'
                }}>
                    <div style={{
                        fontSize: '12px',
                        color: '#888',
                        marginBottom: '8px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        Email
                    </div>
                    <div style={{
                        fontSize: '18px',
                        color: '#1a1a1a',
                        fontFamily: 'monospace',
                        fontWeight: '600'
                    }}>
                        {email}
                    </div>
                </div>

                {/* Heslo s tlačítkem kopírovat */}
                <div style={{
                    background: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '32px',
                    textAlign: 'left'
                }}>
                    <div style={{
                        fontSize: '12px',
                        color: '#856404',
                        marginBottom: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        Heslo
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            fontSize: '32px',
                            color: '#1a1a1a',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            letterSpacing: '3px',
                            flex: 1
                        }}>
                            {password}
                        </div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            style={{
                                padding: '14px 20px',
                                background: copied ? '#22c55e' : '#5d7fa3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '16px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: '700',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            onMouseEnter={(e) => {
                                if (!copied) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!copied) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }
                            }}
                        >
                            <IconCopy />
                            {copied ? 'Zkopírováno!' : 'Kopírovat'}
                        </button>
                    </div>
                </div>

                {/* Tlačítko Zavřít */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        padding: '16px 48px',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'white',
                        background: '#22c55e',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#16a34a';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#22c55e';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                    }}
                >
                    Hotovo
                </button>
            </div>
        </div>
    );
};

export default PasswordPopup;

