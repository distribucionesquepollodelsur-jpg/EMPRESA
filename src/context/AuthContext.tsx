import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';

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
    logout: () => void;
    hasEnteredBase: boolean;
    setHasEnteredBase: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'que_pollo_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { employees, cashFlow } = useData();
    const [user, setUser] = useState<AuthUser | null>(() => {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    });

    const [hasEnteredBase, setHasEnteredBase] = useState(false);

    const isAuthenticated = !!user;

    useEffect(() => {
        if (user) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
            
            // Auto check if base exists today for this user
            const today = new Date().toISOString().split('T')[0];
            const baseExists = user.role === 'admin' || cashFlow.some(m => 
                m.date.startsWith(today) && 
                m.reason.includes('Base Inicial') && 
                m.reason.includes(user.name)
            );
            setHasEnteredBase(baseExists);
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            setHasEnteredBase(false);
        }
    }, [user, cashFlow]);

    const login = (email: string, pass: string) => {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPass = (pass || '').trim();

        console.log(`Login attempt for: ${cleanEmail}`);
        console.log(`Available employees: ${employees?.length || 0}`);

        // Admin check
        if (
            (cleanEmail === 'alex.b19h@gmail.com' || cleanEmail === 'distribucionesquepollodelsur@gmail.com') && 
            (cleanPass === '060224Jc!' || cleanPass === 'quepollo2024')
        ) {
            setUser({
                email: cleanEmail,
                name: 'Administrador',
                role: 'admin'
            });
            return true;
        }

        // Employee check
        const emp = (employees || []).find(e => {
            if (!e || !e.email || !e.password) return false;
            
            const employeeEmail = e.email.toString().trim().toLowerCase();
            const employeePassword = e.password.toString().trim();
            
            const match = employeeEmail === cleanEmail && employeePassword === cleanPass;
            if (match) console.log(`Matched employee: ${e.name}`);
            return match && e.active !== false;
        });
        
        if (emp) {
            setUser({
                email: emp.email || cleanEmail,
                name: emp.name,
                role: emp.role || 'employee',
                employeeId: emp.id,
                photo: emp.photo
            });
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, hasEnteredBase, setHasEnteredBase }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
