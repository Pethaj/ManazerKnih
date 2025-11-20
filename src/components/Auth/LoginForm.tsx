import React, { useState } from 'react';
import { login } from '../../services/customAuthService';

interface LoginFormProps {
    onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { user, error: loginError } = await login(email, password);

            if (loginError || !user) {
                setError(loginError || 'Přihlášení se nezdařilo');
                setIsLoading(false);
                return;
            }

            // Úspěšné přihlášení
            onLoginSuccess();
        } catch (err) {
            setError('Neočekávaná chyba při přihlášení');
            setIsLoading(false);
        }
    };


    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fdfaf6',
            padding: '20px'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '48px',
                width: '100%',
                maxWidth: '420px',
                border: '1px solid #eaddd7'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <img 
                        src="https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/web/image-removebg-preview%20(1).png"
                        alt="MedBase Logo"
                        style={{
                            height: '80px',
                            width: 'auto',
                            objectFit: 'contain',
                            margin: '0 auto'
                        }}
                    />
                </div>

                <form onSubmit={handleSubmit}>
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
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="vas.email@example.com"
                            autoComplete="email"
                            name="email"
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

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#4a4a4a',
                            marginBottom: '8px',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            Heslo
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="Vaše heslo"
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
                                onClick={() => setShowPassword(!showPassword)}
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
                                    justifyContent: 'center',
                                    color: '#7a7a7a'
                                }}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
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


                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'white',
                            backgroundColor: isLoading ? '#9ca3af' : '#5d7fa3',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isLoading ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                            fontFamily: 'Inter, sans-serif'
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
                        {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
                    </button>
                </form>

                <div style={{
                    marginTop: '24px',
                    paddingTop: '24px',
                    borderTop: '1px solid #eaddd7',
                    fontSize: '12px',
                    color: '#7a7a7a',
                    textAlign: 'center',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    Pro vytvoření nového účtu kontaktujte správce systému
                </div>
            </div>
        </div>
    );
};

export default LoginForm;

