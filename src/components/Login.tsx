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
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements for depth */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <img 
                    src="/icon.svg" 
                    alt="" 
                    className="absolute -top-24 -right-24 w-96 h-96 blur-3xl opacity-20" 
                />
                <img 
                    src="/icon.svg" 
                    alt="" 
                    className="absolute -bottom-24 -left-24 w-96 h-96 blur-3xl opacity-20" 
                />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl rounded-[40px] border border-white/5 p-10 shadow-2xl relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white/5 rounded-[32px] mb-6 p-4 shadow-inner">
                        <img 
                            src="/icon.svg" 
                            alt="Logo" 
                            className="w-full h-full object-contain brightness-0 invert" 
                        />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Que Pollo</h2>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mt-2">Sistema de Gestión Integral</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value.trim())}
                            className="w-full px-5 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600 font-medium"
                            placeholder="admin@quepollo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value.trim())}
                                className="w-full px-5 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600 font-medium"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-4 text-zinc-600 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 text-red-400 bg-red-400/5 p-4 rounded-2xl text-[10px] font-black uppercase border border-red-400/10 tracking-wider">
                            <ShieldAlert size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-black rounded-2xl transition-all transform active:scale-[0.98] shadow-xl uppercase tracking-widest text-xs mt-4"
                    >
                        {loading ? 'Identificando...' : 'Entrar al Sistema'}
                    </button>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black">
                            <span className="bg-zinc-900 px-4 text-zinc-600 tracking-[0.2em]">O continuar con</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-5 bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 font-black rounded-2xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-xs border border-white/5"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                            />
                        </svg>
                        Google
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                        &copy; 2024 Distribuciones Que Pollo del Sur
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
