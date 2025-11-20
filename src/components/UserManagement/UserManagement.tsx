import React, { useState, useEffect } from 'react';
import { adminListUsers, adminDeleteUser, adminUpdateUserRole, UserProfile } from '../../services/customAdminService';
import { UserRole } from '../../services/customAuthService';
import AddUserModal from './AddUserModal';

interface UserManagementProps {
    currentUserId: string;
    onClose: () => void;
}

const IconUser = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const IconClose = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const IconDelete = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

const IconAdd = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserId, onClose }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const loadUsers = async () => {
        setIsLoading(true);
        setError(null);

        const { users: loadedUsers, error: loadError } = await adminListUsers();

        if (loadError) {
            setError(loadError);
            setIsLoading(false);
            return;
        }

        setUsers(loadedUsers || []);
        setIsLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (userId === currentUserId) {
            alert('Nemůžete smazat svůj vlastní účet');
            return;
        }

        if (!confirm(`Opravdu chcete smazat uživatele ${userEmail}?`)) {
            return;
        }

        setDeletingUserId(userId);

        const { success, error: deleteError } = await adminDeleteUser(userId);

        if (deleteError) {
            alert(`Chyba při mazání uživatele: ${deleteError}`);
            setDeletingUserId(null);
            return;
        }

        if (success) {
            // Znovu načíst seznam uživatelů
            await loadUsers();
        }

        setDeletingUserId(null);
    };

    const handleToggleRole = async (userId: string, currentRole: UserRole) => {
        if (userId === currentUserId) {
            alert('Nemůžete změnit svou vlastní roli');
            return;
        }

        const newRole: UserRole = currentRole === 'admin' ? 'spravce' : 'admin';
        
        if (!confirm(`Opravdu chcete změnit roli na "${newRole}"?`)) {
            return;
        }

        const { success, error: updateError } = await adminUpdateUserRole(userId, newRole);

        if (updateError) {
            alert(`Chyba při změně role: ${updateError}`);
            return;
        }

        if (success) {
            // Znovu načíst seznam uživatelů
            await loadUsers();
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        return role === 'spravce' 
            ? { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' }
            : { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' };
    };

    const getRoleLabel = (role: UserRole) => {
        return role === 'spravce' ? 'Správce' : 'Admin';
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
                zIndex: 1000,
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '24px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <IconUser />
                            <h2 style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#1a202c'
                            }}>
                                Správa uživatelů
                            </h2>
                        </div>
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
                                e.currentTarget.style.background = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                            }}
                        >
                            <IconClose />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '24px'
                    }}>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '4px solid #e5e7eb',
                                    borderTopColor: '#667eea',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto'
                                }} />
                                <p style={{ marginTop: '16px', color: '#6b7280' }}>Načítání uživatelů...</p>
                            </div>
                        ) : error ? (
                            <div style={{
                                padding: '16px',
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                color: '#991b1b'
                            }}>
                                {error}
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <IconAdd />
                                        Přidat uživatele
                                    </button>
                                </div>

                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    overflow: 'hidden'
                                }}>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse'
                                    }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#6b7280',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    Email
                                                </th>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#6b7280',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    Role
                                                </th>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#6b7280',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    Vytvořeno
                                                </th>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'right',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#6b7280',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    Akce
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => {
                                                const roleColors = getRoleBadgeColor(user.role);
                                                const isCurrentUser = user.id === currentUserId;
                                                
                                                return (
                                                    <tr key={user.id} style={{
                                                        borderTop: '1px solid #e5e7eb',
                                                        background: isCurrentUser ? '#f0fdf4' : 'white'
                                                    }}>
                                                        <td style={{ padding: '16px' }}>
                                                            <div style={{
                                                                fontSize: '14px',
                                                                color: '#1a202c',
                                                                fontWeight: isCurrentUser ? '600' : '400'
                                                            }}>
                                                                {user.email}
                                                                {isCurrentUser && (
                                                                    <span style={{
                                                                        marginLeft: '8px',
                                                                        fontSize: '12px',
                                                                        color: '#059669',
                                                                        fontWeight: '500'
                                                                    }}>
                                                                        (Vy)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                color: roleColors.text,
                                                                background: roleColors.bg,
                                                                border: `1px solid ${roleColors.border}`,
                                                                borderRadius: '12px'
                                                            }}>
                                                                {getRoleLabel(user.role)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <span style={{
                                                                fontSize: '14px',
                                                                color: '#6b7280'
                                                            }}>
                                                                {new Date(user.created_at).toLocaleDateString('cs-CZ')}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                {!isCurrentUser && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleToggleRole(user.id, user.role)}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '500',
                                                                                color: '#4338ca',
                                                                                background: '#e0e7ff',
                                                                                border: '1px solid #c7d2fe',
                                                                                borderRadius: '6px',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.background = '#c7d2fe';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.background = '#e0e7ff';
                                                                            }}
                                                                        >
                                                                            Změnit roli
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteUser(user.id, user.email)}
                                                                            disabled={deletingUserId === user.id}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '500',
                                                                                color: '#991b1b',
                                                                                background: '#fee2e2',
                                                                                border: '1px solid #fecaca',
                                                                                borderRadius: '6px',
                                                                                cursor: deletingUserId === user.id ? 'not-allowed' : 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                opacity: deletingUserId === user.id ? 0.5 : 1
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                if (deletingUserId !== user.id) {
                                                                                    e.currentTarget.style.background = '#fecaca';
                                                                                }
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (deletingUserId !== user.id) {
                                                                                    e.currentTarget.style.background = '#fee2e2';
                                                                                }
                                                                            }}
                                                                        >
                                                                            <IconDelete />
                                                                            Smazat
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {users.length === 0 && (
                                        <div style={{
                                            padding: '40px',
                                            textAlign: 'center',
                                            color: '#6b7280'
                                        }}>
                                            Nebyli nalezeni žádní uživatelé
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onUserAdded={() => {
                        setShowAddModal(false);
                        loadUsers();
                    }}
                />
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default UserManagement;


