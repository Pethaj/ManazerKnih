import React, { useState } from 'react';
import { changePassword, validatePassword } from '../../services/customAuthService';

interface ChangePasswordProps {
    onClose: () => void;
}

const IconClose = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const IconEye = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const IconEyeOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
);

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validace
        const { valid, error: validationError } = validatePassword(newPassword);
        if (!valid) {
            setError(validationError || 'Neplatné heslo');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Nová hesla se neshodují');
            return;
        }

        setIsLoading(true);

        try {
            // Změna hesla
            const { success: changeSuccess, error: changeError } = await changePassword(
                currentPassword,
                newPassword
            );

            if (!changeSuccess || changeError) {
                setError(changeError || 'Nepodařilo se změnit heslo');
                setIsLoading(false);
                return;
            }

            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Automaticky zavřít po 2 sekundách
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError('Neočekávaná chyba při změně hesla');
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
                        Změna hesla
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
                    {success ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: '#d1fae5',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h4 style={{
                                margin: '0 0 8px 0',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#22c55e',
                                fontFamily: 'Inter, sans-serif'
                            }}>
                                Heslo změněno
                            </h4>
                            <p style={{
                                margin: 0,
                                color: '#7a7a7a',
                                fontSize: '14px',
                                fontFamily: 'Inter, sans-serif'
                            }}>
                                Vaše heslo bylo úspěšně změněno
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Současné heslo */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Současné heslo
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        style={{
                                            width: '100%',
                                            padding: '12px 48px 12px 16px',
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
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: '#7a7a7a'
                                        }}
                                    >
                                        {showCurrentPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>
                            </div>

                            {/* Nové heslo */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Nové heslo
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        minLength={6}
                                        style={{
                                            width: '100%',
                                            padding: '12px 48px 12px 16px',
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
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: '#7a7a7a'
                                        }}
                                    >
                                        {showNewPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>
                                {newPassword.length > 0 && newPassword.length < 6 && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#dc2626',
                                        marginTop: '4px',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        Heslo musí mít alespoň 6 znaků
                                    </div>
                                )}
                            </div>

                            {/* Potvrzení nového hesla */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4a4a4a',
                                    marginBottom: '8px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    Potvrzení nového hesla
                                    <span style={{ color: '#d9534f', marginLeft: '4px' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        style={{
                                            width: '100%',
                                            padding: '12px 48px 12px 16px',
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
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: '#7a7a7a'
                                        }}
                                    >
                                        {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#dc2626',
                                        marginTop: '4px',
                                        fontFamily: 'Inter, sans-serif'
                                    }}>
                                        Hesla se neshodují
                                    </div>
                                )}
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
                                    {isLoading ? 'Mění se...' : 'Změnit heslo'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;

