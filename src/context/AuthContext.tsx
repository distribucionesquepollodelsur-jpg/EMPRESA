import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';

interface AuthUser {
    email: string;
    name: string;
    role: 'admin' | 'employee';
    employeeId?: string;
    photo?: string | null;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    login: (email: string, pass: string) => Promise<boolean>;
    loginWithGoogle: () => Promise<void>;
    logout: () => void;
    hasEnteredBase: boolean;
    setHasEnteredBase: (val: boolean) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'que_pollo_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { employees, cashFlow } = useData();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasEnteredBase, setHasEnteredBase] = useState(false);

    const isAuthenticated = !!user;

    useEffect(() => {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
            setUser(JSON.parse(saved));
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Si hay un usuario de Google/Email (legacy) lo manejamos
                if (firebaseUser.email) {
                    const email = firebaseUser.email.toLowerCase();
                    const hardcodedAdmins = ['alex.b19h@gmail.com', 'distribucionesquepollodelsur@gmail.com'];
                    
                    if (hardcodedAdmins.includes(email)) {
                        setUser({ email, name: 'Admin', role: 'admin' });
                    } else {
                        const emp = (employees || []).find(e => e.email?.toLowerCase() === email);
                        if (emp) {
                            setUser({
                                email,
                                name: emp.name,
                                role: emp.role || 'employee',
                                employeeId: emp.id
                            });
                        }
                    }
                } else {
                    // Si es usuario anónimo, respetamos el usuario local si existe
                    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
                    if (savedSession) {
                        setUser(JSON.parse(savedSession));
                    }
                }
            } else {
                // Si no hay sesión en Firebase pero hay local, intentamos reconectar
                const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
                if (savedSession && !auth.currentUser) {
                    signInAnonymously(auth).catch(console.error);
                } else if (!savedSession) {
                    setUser(null);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [employees]);

    useEffect(() => {
        if (user) {
            const today = new Date().toISOString().split('T')[0];
            const baseExists = user.role === 'admin' || cashFlow.some(m => 
                m.date && m.date.startsWith(today) && 
                m.reason.includes('Base Inicial') && 
                m.reason.includes(user.name)
            );
            setHasEnteredBase(baseExists);
        } else {
            setHasEnteredBase(false);
        }
    }, [user, cashFlow]);

    const loginWithGoogle = async () => {
        // Deshabilitado por solicitud del usuario
        alert("El acceso con Google ha sido deshabilitado.");
    };

    const login = async (email: string, pass: string) => {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPass = (pass || '').trim();

        const hardcodedAdmins = ['distribucionesquepollodelsur@gmail.com', 'alex.b19h@gmail.com'];
        const adminPass = ['060224Jc!', 'quepollo2024'];

        const isAdminLogin = hardcodedAdmins.includes(cleanEmail) && adminPass.includes(cleanPass);
        const emp = (employees || []).find(e => e.email?.toLowerCase() === cleanEmail && e.password === cleanPass);

        if (isAdminLogin || emp) {
            try {
                if (!auth.currentUser) await signInAnonymously(auth);
                
                const userData: AuthUser = isAdminLogin ? {
                    email: cleanEmail,
                    name: 'Admin',
                    role: 'admin'
                } : {
                    email: cleanEmail,
                    name: emp!.name,
                    role: emp!.role || 'employee',
                    employeeId: emp!.id,
                    photo: emp!.photo
                };

                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
                setUser(userData);
                return true;
            } catch (err) {
                console.error("Auth error:", err);
                throw err;
            }
        }
        return false;
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (e) {}
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, loginWithGoogle, logout, hasEnteredBase, setHasEnteredBase, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
