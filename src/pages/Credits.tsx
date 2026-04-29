import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
    Wallet, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Search, 
    ChevronRight, 
    Plus,
    History,
    CreditCard,
    Lock
} from 'lucide-react';

const Credits: React.FC = () => {
    const { purchases, sales, addPurchasePayment, addSalePayment } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'toPay' | 'toCollect'>('toPay');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');

    const pendingPurchases = useMemo(() => 
        purchases.filter(p => p.total > p.paidAmount)
    , [purchases]);

    const pendingSales = useMemo(() => 
        sales.filter(s => s.total > (s.paidAmount || 0))
    , [sales]);

    const filteredItems = activeTab === 'toPay' 
        ? pendingPurchases.filter(p => p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
        : pendingSales.filter(s => (s.customerName || 'Cliente').toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || paymentAmount <= 0) return;

        if (activeTab === 'toPay') {
            addPurchasePayment(selectedItem.id, paymentAmount, paymentMethod);
        } else {
            addSalePayment(selectedItem.id, paymentAmount, paymentMethod);
        }

        setSelectedItem(null);
        setPaymentAmount(0);
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestión de Cuentas</h1>
                <p className="text-slate-500 font-medium italic">Control de deudas con proveedores y créditos a clientes.</p>
            </header>

            <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('toPay')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'toPay' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Cuentas por Pagar ({pendingPurchases.length})
                </button>
                <button 
                    onClick={() => setActiveTab('toCollect')}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'toCollect' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Cuentas por Cobrar ({pendingSales.length})
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder={activeTab === 'toPay' ? "Buscar por proveedor..." : "Buscar por cliente..."}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold"
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredItems.map(item => {
                    const pending = item.total - (item.paidAmount || 0);
                    return (
                        <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    activeTab === 'toPay' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                                )}>
                                    {activeTab === 'toPay' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight">
                                        {activeTab === 'toPay' ? item.supplierName : (item.customerName || 'Venta de Mostrador')}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Fecha: {formatDate(item.date)} • Ref: {item.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                <div className="text-center md:text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                                    <p className="font-bold text-slate-600">{formatCurrency(item.total)}</p>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagado</p>
                                    <p className="font-bold text-green-600">{formatCurrency(item.paidAmount || 0)}</p>
                                </div>
                                <div className="text-center md:text-left col-span-2 md:col-span-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                    <p className="font-black text-slate-900 text-lg">{formatCurrency(pending)}</p>
                                </div>
                            </div>

                            {isAdmin ? (
                                <button 
                                    onClick={() => setSelectedItem(item)}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    Registrar Abono <Plus size={16} />
                                </button>
                            ) : (
                                <div className="px-6 py-3 bg-slate-50 text-slate-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-100 italic text-xs">
                                    <Lock size={14} /> Solo Lectura
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredItems.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Wallet className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-400 font-bold italic">No hay cuentas pendientes en esta categoría.</p>
                    </div>
                )}
            </div>

            {/* Modal de Abono */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CreditCard size={32} />
                            </div>
                            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tighter">Registrar Abono</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">
                                {activeTab === 'toPay' ? 'Pago a Proveedor' : 'Cobro a Cliente'}
                            </p>
                        </header>

                        <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Actual</p>
                            <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedItem.total - (selectedItem.paidAmount || 0))}</p>
                        </div>

                        <form onSubmit={handleAddPayment} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto del Abono</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                    <input 
                                        type="number" 
                                        required
                                        autoFocus
                                        max={selectedItem.total - (selectedItem.paidAmount || 0)}
                                        value={paymentAmount || ''}
                                        onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-black text-xl text-slate-900"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Método de Pago</label>
                                <select 
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-900"
                                >
                                    <option value="Efectivo">Efectivo (Caja)</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setSelectedItem(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all text-xs uppercase tracking-widest shadow-xl shadow-slate-950/20">
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

export default Credits;
