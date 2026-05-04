import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, HandCoins, Trash2, Search, Calendar, CreditCard, ChevronRight, X, History, DollarSign, User } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const Loans: React.FC = () => {
    const { loans, businessLoans, addLoan, addLoanAbono, deleteLoanAbono, deleteLoan, addBusinessLoan, addBusinessLoanAbono, deleteBusinessLoanAbono, deleteBusinessLoan } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'thirdParty' | 'business'>('thirdParty');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [borrowerName, setBorrowerName] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [cashAmount, setCashAmount] = useState<number>(0);
    const [isEntry, setIsEntry] = useState(false);
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

        if (activeTab === 'thirdParty') {
            await addLoan({
                borrowerName,
                amount,
                cashAmount,
                isEntry,
                term,
                dueDate,
                description,
                date: new Date(date).toISOString()
            });
        } else {
            await addBusinessLoan({
                lenderName: borrowerName,
                amount,
                cashAmount, // Using the editable cashAmount instead of hardcoded amount
                description,
                date: new Date(date).toISOString()
            });
        }
        
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setBorrowerName('');
        setAmount(0);
        setCashAmount(0);
        setIsEntry(false);
        setTerm('');
        setDueDate('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleAbonoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan || abonoAmount <= 0) return;

        if (activeTab === 'thirdParty') {
            await addLoanAbono(selectedLoan.id, abonoAmount, abonoMethod);
        } else {
            await addBusinessLoanAbono(selectedLoan.id, abonoAmount, abonoMethod);
        }
        setIsAbonoModalOpen(false);
        setAbonoAmount(0);
        setSelectedLoan(null);
    };

    const currentLoans = activeTab === 'thirdParty' ? loans : businessLoans.map(bl => ({
        ...bl,
        borrowerName: bl.lenderName, // standardizing for the list
    }));

    const filteredLoans = currentLoans.filter(l => 
        l.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOwed = activeTab === 'thirdParty' 
        ? loans.reduce((sum, l) => sum + (l.amount - (l.paidAmount || 0)), 0)
        : businessLoans.reduce((sum, l) => sum + (l.amount - (l.paidAmount || 0)), 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <HandCoins size={32} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Préstamos</h2>
                        <p className="text-slate-500 font-medium tracking-tight">Gestión de capital prestado y deudas base.</p>
                    </div>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                    >
                        <Plus size={20} /> {activeTab === 'thirdParty' ? 'Nuevo Préstamo' : 'Nueva Deuda Base'}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('thirdParty')}
                    className={cn(
                        "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        activeTab === 'thirdParty' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Préstamos a 3ros (Cobrar)
                </button>
                <button 
                    onClick={() => setActiveTab('business')}
                    className={cn(
                        "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        activeTab === 'business' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Préstamos Base (Pagar)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <DollarSign size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {activeTab === 'thirdParty' ? 'Total por Recuperar' : 'Total por Pagar'}
                    </p>
                    <h3 className={cn(
                        "text-3xl font-black tracking-tighter",
                        activeTab === 'thirdParty' ? "text-slate-900" : "text-red-600"
                    )}>
                        {formatCurrency(totalOwed)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            activeTab === 'thirdParty' ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Activo</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'thirdParty' ? "Buscar beneficiario..." : "Buscar prestamista..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold placeholder:text-slate-300"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-10 py-6">Detalle</th>
                                <th className="px-10 py-6">Fecha {activeTab === 'thirdParty' ? '/ Plazo' : ''}</th>
                                <th className="px-10 py-6 text-center">Estado</th>
                                <th className="px-10 py-6 text-right">Saldo Pendiente</th>
                                <th className="px-10 py-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 italic">
                            {filteredLoans.map(loan => {
                                const balance = loan.amount - (loan.paidAmount || 0);
                                return (
                                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                                                    activeTab === 'thirdParty' ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"
                                                )}>
                                                    {loan.borrowerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 not-italic text-base">{loan.borrowerName}</span>
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{loan.description || 'Sin descripción'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {formatDate(loan.date)}
                                                </div>
                                                {activeTab === 'thirdParty' && (
                                                    <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest mt-1 italic">Plazo: {loan.term || 'No definido'}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest",
                                                    balance > 0 ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                )}>
                                                    {balance > 0 ? 'Pendiente' : 'Saldado'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-slate-900 text-xl tracking-tighter not-italic">{formatCurrency(balance)}</span>
                                                {loan.dueDate && balance > 0 && activeTab === 'thirdParty' && (
                                                    <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter mt-1 italic">
                                                        Vence: {format(new Date(loan.dueDate + 'T12:00:00'), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                {balance > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedLoan(loan);
                                                            setIsAbonoModalOpen(true);
                                                        }}
                                                        className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md"
                                                        title={activeTab === 'thirdParty' ? "Cobrar Abono" : "Pagar Abono"}
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        setSelectedLoan(loan);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Historial"
                                                >
                                                    <History size={20} />
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => {
                                                            const msg = activeTab === 'thirdParty' 
                                                                ? '¿Eliminar registro de préstamo? Esto no reversará movimientos de caja.'
                                                                : '¿Eliminar registro de deuda base?';
                                                            if (window.confirm(msg)) {
                                                                if (activeTab === 'thirdParty') deleteLoan(loan.id);
                                                                else deleteBusinessLoan(loan.id);
                                                            }
                                                        }}
                                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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

            {/* Modal para Nuevo Préstamo / Deuda Base */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 space-y-8 animate-in zoom-in duration-200">
                        <header className="text-center space-y-3">
                            <div className={cn(
                                "w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-lg",
                                activeTab === 'thirdParty' ? "bg-orange-50 text-orange-500" : "bg-red-50 text-red-500"
                            )}>
                                <HandCoins size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                {activeTab === 'thirdParty' ? 'Registrar Préstamo a 3ro' : 'Registrar Deuda Base'}
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">
                                {activeTab === 'thirdParty' 
                                    ? 'Dinero de la empresa entregado a un tercero' 
                                    : 'Dinero inyectado a la empresa que debe devolverse'}
                            </p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {activeTab === 'thirdParty' ? 'Para (Beneficiario)' : 'Desde (Prestamista)'}
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    autoFocus
                                    value={borrowerName}
                                    onChange={e => setBorrowerName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none font-bold placeholder:text-slate-300"
                                    placeholder="Nombre de la persona..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Total</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                        <input 
                                            type="number" 
                                            required
                                            value={amount || ''}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                setAmount(val);
                                                if (activeTab === 'business') setCashAmount(val);
                                            }}
                                            className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none text-xl font-black text-slate-900"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Afecta Caja Hoy</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                        <input 
                                            type="number" 
                                            value={cashAmount || ''}
                                            onChange={e => setCashAmount(parseFloat(e.target.value))}
                                            className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none text-xl font-black text-slate-900"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase italic mt-1">
                                        {activeTab === 'thirdParty' 
                                            ? 'Monto real que sale del cajón. Si es una suma de cuentas viejas, puede ser 0.' 
                                            : 'Monto real que ingresa al cajón.'}
                                    </p>
                                </div>
                            </div>

                            {activeTab === 'thirdParty' && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sentido del Movimiento en Caja</p>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setIsEntry(false)}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all",
                                                !isEntry ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100"
                                            )}
                                        >
                                            Salida (-)
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setIsEntry(true)}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all",
                                                isEntry ? "bg-emerald-600 text-white" : "bg-white text-slate-400 border border-slate-100"
                                            )}
                                        >
                                            Entrada (+)
                                        </button>
                                    </div>
                                    <p className="text-[8px] text-slate-400 italic">
                                        * Elija "Entrada" si el préstamo curiosamente suma a su caja (según su requerimiento).
                                    </p>
                                </div>
                            )}

                            {activeTab === 'thirdParty' ? (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plazo de Pago</label>
                                        <input 
                                            type="text" 
                                            value={term}
                                            onChange={e => setTerm(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none font-bold text-sm"
                                            placeholder="Ej: 30 días"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Límite</label>
                                        <input 
                                            type="date" 
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha del Préstamo</label>
                                <input 
                                    type="date" 
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none font-bold text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Notas</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none font-bold text-sm h-24 italic"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
                                    Confirmar Registro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Registrar Abono */}
            {isAbonoModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-10 space-y-8 animate-in zoom-in duration-200">
                        <header className="text-center space-y-3">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                                {activeTab === 'thirdParty' ? 'RECOBRO / ABONO' : 'PAGO / ABONO'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedLoan.borrowerName}</p>
                        </header>

                        <div className="p-6 bg-slate-900 rounded-3xl text-white flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Saldo Pendiente Actualmente</span>
                            <span className="font-black text-3xl tracking-tighter">{formatCurrency(selectedLoan.amount - (selectedLoan.paidAmount || 0))}</span>
                        </div>

                        <form onSubmit={handleAbonoSubmit} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">
                                    {activeTab === 'thirdParty' ? 'Valor a Recaudar' : 'Valor a Pagar'}
                                </label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    max={selectedLoan.amount - (selectedLoan.paidAmount || 0)}
                                    value={abonoAmount || ''}
                                    onChange={e => setAbonoAmount(parseFloat(e.target.value))}
                                    className="w-full px-6 py-6 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-slate-900/10 outline-none text-3xl font-black text-slate-900 text-center tracking-tighter"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Método de Operación</label>
                                <select 
                                    value={abonoMethod}
                                    onChange={e => setAbonoMethod(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-900/10 outline-none font-bold text-sm"
                                >
                                    <option value="Efectivo">Efectivo (Caja)</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
                                    Confirmar {activeTab === 'thirdParty' ? 'Recaudo' : 'Pago'}
                                </button>
                                <button type="button" onClick={() => setIsAbonoModalOpen(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalle / Historial */}
            {isDetailModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white h-full w-full max-w-lg shadow-3xl flex flex-col animate-in slide-in-from-right duration-300 font-sans italic">
                        <div className={cn(
                            "p-10 text-white space-y-8 relative overflow-hidden",
                            activeTab === 'thirdParty' ? "bg-slate-900" : "bg-red-900"
                        )}>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex gap-6 items-center">
                                    <div className="w-16 h-16 bg-white/10 rounded-[28px] flex items-center justify-center border border-white/10 shadow-inner">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black not-italic uppercase tracking-tighter leading-none">{selectedLoan.borrowerName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-2">Detalle Integral de Operación</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                                    <X size={28} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Monto Inicial</p>
                                    <p className="text-xl font-black not-italic tracking-tighter">{formatCurrency(selectedLoan.amount)}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Saldo Remanente</p>
                                    <p className="text-3xl font-black text-orange-400 not-italic tracking-tighter">{formatCurrency(selectedLoan.amount - (selectedLoan.paidAmount || 0))}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <History size={18} />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronograma de {activeTab === 'thirdParty' ? 'Recobros' : 'Egresos'} realizados</h4>
                            </div>

                            <div className="space-y-4">
                                {selectedLoan.payments && selectedLoan.payments.map((p: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex justify-between items-center group transition-all hover:shadow-md hover:scale-[1.02]">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="text-sm font-black text-slate-900 not-italic">{formatDate(p.date)}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Método: <span className="text-slate-600">{p.method}</span></p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className={cn(
                                                "font-black text-xl tracking-tighter not-italic",
                                                activeTab === 'thirdParty' ? "text-emerald-600" : "text-red-600"
                                            )}>
                                                {activeTab === 'thirdParty' ? '+' : '-'}{formatCurrency(p.amount)}
                                            </span>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('¿Anular registro de este abono?')) {
                                                            if (activeTab === 'thirdParty') deleteLoanAbono(selectedLoan.id, idx);
                                                            else deleteBusinessLoanAbono(selectedLoan.id, idx);
                                                            setIsDetailModalOpen(false);
                                                        }
                                                    }}
                                                    className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!selectedLoan.payments || selectedLoan.payments.length === 0) && (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <HandCoins size={48} className="text-slate-100" />
                                        <p className="text-sm text-slate-300 italic">No se registran movimientos para esta operación.</p>
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
