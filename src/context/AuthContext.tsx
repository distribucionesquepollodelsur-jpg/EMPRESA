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

        const employeesList = (employees || []);
        console.log(`Intentando login para: ${cleanEmail}`);
        console.log(`Buscando en ${employeesList.length} registros...`);
        
        // 1. HARDCODED ADMIN CHECK FIRST
        const hardcodedAdmins = [
            'alex.b19h@gmail.com',
            'distribucionesquepollodelsur@gmail.com',
            'alex@quepollo.com',
            'admin@quepollo.com',
            'quepollo@admin.com',
            'alex.quepollo@gmail.com'
        ];

        const hardcodedPass = ['060224Jc!', 'quepollo2024', 'admin123'];

        if (hardcodedAdmins.includes(cleanEmail) && hardcodedPass.includes(cleanPass)) {
            console.log(`Login exitoso como Administrador (Sistema): ${cleanEmail}`);
            setUser({
                email: cleanEmail,
                name: 'Administrador Principal',
                role: 'admin'
            });
            return true;
        }

        // 2. REGISTERED USERS CHECK (Employees)
        const emp = employeesList.find(e => 
            e && e.email && e.email.toString().trim().toLowerCase() === cleanEmail
        );

        if (emp) {
            const storedPass = (emp.password || '').toString().trim();
            if (storedPass === cleanPass) {
                if (emp.active === false) {
                    console.warn(`Cuenta desactivada: ${cleanEmail}`);
                    return false;
                }
                
                setUser({
                    email: emp.email || cleanEmail,
                    name: emp.name,
                    role: emp.role || 'employee',
                    employeeId: emp.id,
                    photo: emp.photo
                });
                console.log(`Login exitoso como: ${emp.name} (${emp.role})`);
                return true;
            }
            console.warn(`Contraseña incorrecta para usuario registrado: ${cleanEmail}`);
        }

        console.warn(`Login fallido: ${cleanEmail}. No coincide con Administradores ni con registros.`);
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
