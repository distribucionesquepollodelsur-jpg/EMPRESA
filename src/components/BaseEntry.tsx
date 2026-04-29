import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Wallet, ArrowRight, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/utils';

const BaseEntry: React.FC = () => {
    const { user, logout, setHasEnteredBase } = useAuth();
    const { addCashMovement } = useData();
    const [amount, setAmount] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) return;
        setLoading(true);

        setTimeout(() => {
            addCashMovement({
                type: 'entry',
                amount: amount,
                reason: `Base Inicial - ${user?.name}`
            });
            setHasEnteredBase(true);
            setLoading(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 p-10 shadow-2xl space-y-8"
            >
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-2">
                        <Wallet className="text-green-500" size={40} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Base Inicial</h2>
                        <p className="text-slate-400 text-sm font-medium">Hola {user?.name}, ingresa el efectivo inicial en caja para comenzar tu turno.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500">$</span>
                        <input
                            type="number"
                            required
                            autoFocus
                            value={amount || ''}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            className="w-full pl-12 pr-6 py-6 bg-slate-800 border border-slate-700 rounded-2xl text-white text-3xl font-black focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-slate-700"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="w-full py-5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all transform active:scale-95 shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 uppercase tracking-widest"
                        >
                            {loading ? 'Registrando...' : 'Empezar Turno'}
                            {!loading && <ArrowRight size={20} />}
                        </button>
                        
                        <button
                            type="button"
                            onClick={logout}
                            className="flex items-center justify-center gap-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                            <LogOut size={14} /> Salir del Sistema
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default BaseEntry;
