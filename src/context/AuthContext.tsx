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

        console.log(`Intentando login para: ${cleanEmail}`);
        
        // 1. Hardcoded Admin check (Fallback for initial setup or owners not in list)
        // We check this FIRST to ensure owners can always get back in even if they created an employee account with the same email.
        const hardcodedAdmins = [
            'alex.b19h@gmail.com',
            'distribucionesquepollodelsur@gmail.com',
            'alex@quepollo.com',
            'admin@quepollo.com'
        ];

        const hardcodedPass = ['060224Jc!', 'quepollo2024'];

        if (hardcodedAdmins.includes(cleanEmail) && hardcodedPass.includes(cleanPass)) {
            setUser({
                email: cleanEmail,
                name: 'Administrador Principal',
                role: 'admin'
            });
            return true;
        }

        // 2. Employee check (Check the registered users in the database)
        const employeesList = (employees || []);
        
        const emp = employeesList.find(e => {
            if (!e || !e.email) return false;
            return e.email.toString().trim().toLowerCase() === cleanEmail;
        });

        if (emp) {
            const storedPass = (emp.password || '').toString().trim();
            if (storedPass === cleanPass) {
                if (emp.active === false) {
                    console.warn("Cuenta desactivada");
                    return false;
                }
                
                setUser({
                    email: emp.email || cleanEmail,
                    name: emp.name,
                    role: emp.role || 'employee',
                    employeeId: emp.id,
                    photo: emp.photo
                });
                return true;
            }
        }

        console.warn(`Login fallido para ${cleanEmail}`);
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
