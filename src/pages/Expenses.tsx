import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Receipt, Trash2, Search, Calendar, Filter, DollarSign, Tag } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

const Expenses: React.FC = () => {
    const { expenses, addExpense, deleteExpense } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Form state
    const [amount, setAmount] = useState<number>(0);
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const categories = [
        'Arriendo',
        'Refrigerios',
        'Servicios Públicos',
        'Mantenimiento',
        'Papelería',
        'Transporte',
        'Marketing',
        'Otros'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0 || !category) return;

        await addExpense({
            amount,
            category,
            description,
            date: new Date(date).toISOString()
        });
        
        setIsModalOpen(false);
        setAmount(0);
        setCategory('');
        setDescription('');
    };

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             exp.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Gastos Operativos</h2>
                    <p className="text-slate-500 font-medium">Registro detallado de gastos de la empresa</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Gasto
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm ring-2 ring-red-50">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Gasto Mensual Total</p>
                    <h3 className="text-3xl font-black text-red-600 tracking-tighter">
                        {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </h3>
                </div>
                
                <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Distribución por Categoría</p>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => {
                            const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                            if (total === 0) return null;
                            return (
                                <div key={cat} className="flex flex-col bg-slate-50 border border-slate-100 p-3 rounded-2xl min-w-[120px]">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(total)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar gastos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" />
                        <select 
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 font-bold text-sm"
                        >
                            <option value="all">Todas las categorías</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Categoría</th>
                                <th className="px-8 py-5">Descripción</th>
                                <th className="px-8 py-5 text-right">Monto</th>
                                {isAdmin && <th className="px-8 py-5 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredExpenses.map(expense => (
                                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 font-medium text-slate-600">
                                            <Calendar size={14} className="text-slate-400" />
                                            {formatDate(expense.date)}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-wider">
                                            <Tag size={10} />
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-900">{expense.description}</p>
                                    </td>
                                    <td className="px-8 py-5 text-right text-red-600 font-black">
                                        {formatCurrency(expense.amount)}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm('¿Eliminar gasto?')) deleteExpense(expense.id);
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">No se encontraron gastos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="text-center space-y-2">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Receipt size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registrar Gasto</h3>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto del Gasto</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input 
                                        type="number" 
                                        required
                                        autoFocus
                                        value={amount || ''}
                                        onChange={e => setAmount(parseFloat(e.target.value))}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none text-2xl font-black text-slate-900"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                                <select 
                                    required
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                >
                                    <option value="">Seleccionar Categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                                <input 
                                    type="date" 
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                                <textarea 
                                    required
                                    placeholder="Ej: Pago de arriendo local bodega..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-sm h-24"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
