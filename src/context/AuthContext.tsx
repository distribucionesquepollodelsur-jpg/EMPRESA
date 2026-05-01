import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

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
    login: (email: string, pass: string) => boolean;
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
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const email = firebaseUser.email?.toLowerCase();
                
                // Admin check
                const hardcodedAdmins = [
                    'alex.b19h@gmail.com',
                    'distribucionesquepollodelsur@gmail.com',
                    'alex@quepollo.com',
                    'admin@quepollo.com',
                    'quepollo@admin.com',
                    'alex.quepollo@gmail.com'
                ];

                if (email && hardcodedAdmins.includes(email)) {
                    setUser({
                        email: email,
                        name: firebaseUser.displayName || 'Administrador',
                        role: 'admin',
                        photo: firebaseUser.photoURL
                    });
                } else if (email) {
                    // Employee check
                    const emp = (employees || []).find(e => e.email?.toLowerCase() === email);
                    if (emp) {
                        setUser({
                            email: email,
                            name: emp.name || firebaseUser.displayName || 'Empleado',
                            role: emp.role || 'employee',
                            employeeId: emp.id,
                            photo: emp.photo || firebaseUser.photoURL
                        });
                    } else {
                        // Not registered employee but logged in? 
                        // We might want to allow them but with limited access or just logout
                        setUser({
                            email: email,
                            name: firebaseUser.displayName || 'Usuario',
                            role: 'employee'
                        });
                    }
                }
            } else {
                setUser(null);
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
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google login error:", error);
            throw error;
        }
    };

    const login = (email: string, pass: string) => {
        // This is the legacy internal login. 
        // WARNING: This won't satisfy Firestore rules unless we also sign in to Firebase.
        // For simplicity, we'll encourage Google Login.
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPass = (pass || '').trim();

        const hardcodedAdmins = ['distribucionesquepollodelsur@gmail.com'];
        const hardcodedPass = ['060224Jc!'];

        if (hardcodedAdmins.includes(cleanEmail) && hardcodedPass.includes(cleanPass)) {
            setUser({ email: cleanEmail, name: 'Admin', role: 'admin' });
            return true;
        }

        const emp = (employees || []).find(e => e.email?.toLowerCase() === cleanEmail);
        if (emp && emp.password === cleanPass) {
            setUser({
                email: cleanEmail,
                name: emp.name,
                role: emp.role || 'employee',
                employeeId: emp.id
            });
            return true;
        }
        return false;
    };

    const logout = async () => {
        await signOut(auth);
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
