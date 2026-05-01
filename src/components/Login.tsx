import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
    const { login, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError('Error al iniciar sesión con Google.');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const success = await login(email, password);
            if (!success) {
                setError('Credenciales incorrectas. Para acceso completo desde cualquier dispositivo, use Google.');
                setLoading(false);
            }
        } catch (err) {
            setError('Error al iniciar sesión. Intente con Google.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-full mb-4">
                        <LogIn className="text-orange-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Bienvenido</h2>
                    <p className="text-slate-400">Sistema de Gestión · Que Pollo</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value.trim())}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="admin@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value.trim())}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3 text-slate-500 hover:text-slate-300"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/20">
                            <ShieldAlert size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all transform active:scale-95 border border-slate-700"
                    >
                        {loading ? 'Verificando...' : 'Acceso por Usuario/PIN'}
                    </button>

                    <div className="relative flex items-center justify-center my-6">
                        <div className="border-t border-slate-800 w-full"></div>
                        <span className="bg-slate-900 px-4 text-xs font-black text-red-500 uppercase tracking-widest whitespace-nowrap animate-pulse">Acceso Recomendado</span>
                        <div className="border-t border-slate-800 w-full"></div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold uppercase text-center mb-4 leading-relaxed">
                        Si vas a trabajar desde tu celular o tablet nueva, <br />
                        usa el botón de abajo para sincronizar correctamente.
                    </p>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-900 font-black rounded-[24px] transition-all transform active:scale-95 shadow-2xl flex items-center justify-center gap-3 ring-4 ring-slate-800"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                        ENTRAR CON GOOGLE
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-500">
                        &copy; 2024 Distribuciones Que Pollo del Sur. Todos los derechos reservados.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
