import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, HandCoins, Trash2, Search, Calendar, CreditCard, ChevronRight, X, History, DollarSign, User } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const Loans: React.FC = () => {
    const { loans, addLoan, addLoanAbono, deleteLoanAbono, deleteLoan, updateLoan } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [borrowerName, setBorrowerName] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [term, setTerm] = useState('');
    const [dueDate, setDueDate] = useState<string>('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Abono state
    const [abonoAmount, setAbonoAmount] = useState<number>(0);
    const [abonoMethod, setAbonoMethod] = useState('Efectivo');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0 || !borrowerName) return;

        await addLoan({
            borrowerName,
            amount,
            term,
            dueDate,
            description,
            date: new Date(date).toISOString()
        });
        
        setIsModalOpen(false);
        setBorrowerName('');
        setAmount(0);
        setTerm('');
        setDueDate('');
        setDescription('');
    };

    const handleAbonoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan || abonoAmount <= 0) return;

        await addLoanAbono(selectedLoan.id, abonoAmount, abonoMethod);
        setIsAbonoModalOpen(false);
        setAbonoAmount(0);
        setSelectedLoan(null);
    };

    const filteredLoans = loans.filter(l => 
        l.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Préstamos a 3ros</h2>
                    <p className="text-slate-500 font-medium">Control de dineros prestados y recaudos</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Préstamo
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cartera de Préstamos</p>
                    <h3 className="text-2xl font-black text-slate-900">
                        {formatCurrency(filteredLoans.reduce((sum, l) => sum + (l.amount - (l.paidAmount || 0)), 0))}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por beneficiario o descripción..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Prestamista</th>
                                <th className="px-8 py-5">Fecha / Plazo</th>
                                <th className="px-8 py-5 text-center">Estado</th>
                                <th className="px-8 py-5 text-right">Saldo Pendiente</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 italic">
                            {filteredLoans.map(loan => {
                                const balance = loan.amount - (loan.paidAmount || 0);
                                return (
                                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                                                    {loan.borrowerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 not-italic">{loan.borrowerName}</span>
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{loan.description || 'Sin descripción'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {formatDate(loan.date)}
                                                </div>
                                                <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest mt-1">Plazo: {loan.term || 'No definido'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn(
                                                "px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest",
                                                balance > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                            )}>
                                                {balance > 0 ? 'En Deuda' : 'Pagado'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right text-slate-900 font-black text-base tracking-tighter">
                                            <div className="flex flex-col items-end">
                                                {formatCurrency(balance)}
                                                {loan.dueDate && balance > 0 && (
                                                    <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter mt-1">
                                                        Vence: {format(new Date(loan.dueDate + 'T12:00:00'), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                {balance > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedLoan(loan);
                                                            setIsAbonoModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-all"
                                                        title="Abonar"
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        setSelectedLoan(loan);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Historial"
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => {
                                                            if (window.confirm('¿Eliminar registro de préstamo? Esto no reversará movimientos de caja.')) deleteLoan(loan.id);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para Nuevo Préstamo */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="text-center space-y-2">
                            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <HandCoins size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registrar Préstamo</h3>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Para (Beneficiario)</label>
                                <input 
                                    type="text" 
                                    required
                                    autoFocus
                                    value={borrowerName}
                                    onChange={e => setBorrowerName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                    placeholder="Nombre de la persona..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Prestado</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                    <input 
                                        type="number" 
                                        required
                                        value={amount || ''}
                                        onChange={e => setAmount(parseFloat(e.target.value))}
                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-xl font-black text-slate-900"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plazo de Pago</label>
                                    <input 
                                        type="text" 
                                        value={term}
                                        onChange={e => setTerm(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs"
                                        placeholder="Ej: 30 días"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Límite</label>
                                    <input 
                                        type="date" 
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha del Préstamo</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Notas</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-sm h-20"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
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

            {/* Modal para Registrar Abono a Préstamo */}
            {isAbonoModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="text-center space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">RECOBRO / ABONO</h3>
                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{selectedLoan.borrowerName}</p>
                        </header>

                        <div className="p-4 bg-orange-50 rounded-2xl flex justify-between items-center text-orange-700">
                            <span className="text-[10px] font-black uppercase tracking-widest">Saldo Pendiente:</span>
                            <span className="font-black text-lg">{formatCurrency(selectedLoan.amount - (selectedLoan.paidAmount || 0))}</span>
                        </div>

                        <form onSubmit={handleAbonoSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor del Abono</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    max={selectedLoan.amount - (selectedLoan.paidAmount || 0)}
                                    value={abonoAmount || ''}
                                    onChange={e => setAbonoAmount(parseFloat(e.target.value))}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-2xl font-black text-slate-900 text-center tracking-tighter"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Cobro</label>
                                <select 
                                    value={abonoMethod}
                                    onChange={e => setAbonoMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                >
                                    <option value="Efectivo">Efectivo (Caja)</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAbonoModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
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

            {/* Modal de Detalle / Historial */}
            {isDetailModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white h-full w-full max-w-md shadow-3xl flex flex-col animate-in slide-in-from-right duration-300 font-sans italic">
                        <div className="p-8 bg-slate-900 text-white space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black not-italic uppercase tracking-tighter">{selectedLoan.borrowerName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Historial de Recobros</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Prestado</p>
                                    <p className="text-lg font-black not-italic">{formatCurrency(selectedLoan.amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                    <p className="text-2xl font-black text-orange-500 not-italic">{formatCurrency(selectedLoan.amount - (selectedLoan.paidAmount || 0))}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <History size={16} className="text-slate-400" />
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abonos Realizados</h4>
                            </div>

                            <div className="space-y-4">
                                {selectedLoan.payments && selectedLoan.payments.map((p: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span className="text-xs font-black text-slate-900 not-italic">{formatDate(p.date)}</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Método: {p.method}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-green-600">+{formatCurrency(p.amount)}</span>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('¿Eliminar abono? Se ajustará el saldo del préstamo.')) {
                                                            deleteLoanAbono(selectedLoan.id, idx);
                                                            setIsDetailModalOpen(false);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!selectedLoan.payments || selectedLoan.payments.length === 0) && (
                                    <div className="py-10 text-center text-slate-300 italic text-sm">
                                        No se han registrado abonos aún.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Loans;
