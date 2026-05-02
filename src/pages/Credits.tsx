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
    Edit2,
    Lock,
    Trash2
} from 'lucide-react';

const Credits: React.FC = () => {
    const { 
        purchases, 
        sales, 
        addPurchasePayment, 
        addSalePayment, 
        deletePurchasePayment,
        deleteSalePayment,
        updatePurchase, 
        updateSale,
        customers,
        suppliers,
        addCustomerDebtAbono,
        deleteCustomerDebtAbono,
        addSupplierDebtAbono,
        deleteSupplierDebtAbono,
        updateCustomer,
        updateSupplier
    } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'toPay' | 'toCollect'>('toPay');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isEditTotalModalOpen, setIsEditTotalModalOpen] = useState(false);
    const [newTotal, setNewTotal] = useState<number>(0);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [paidCashModal, setPaidCashModal] = useState<number>(0);
    const [paidTransferModal, setPaidTransferModal] = useState<number>(0);

    const pendingPurchases = useMemo(() => {
        // Exclude 'saldo-inicial' purchases to avoid double counting with initials logic
        const items = purchases
            .filter(p => (p.total - (p.paidAmount || 0)) > 0 && !p.items.some(i => i.productId === 'saldo-inicial'))
            .map(p => ({ ...p, isInitial: false }));
            
        const initials = suppliers
            .filter(s => (s.initialDebt || 0) > 0)
            .map(s => ({
                id: `init-sup-${s.id}`,
                supplierId: s.id,
                supplierName: s.name,
                total: (s.initialDebt || 0) + (s.initialDebtPayments?.reduce((sum, p) => sum + p.amount, 0) || 0),
                paidAmount: s.initialDebtPayments?.reduce((sum, p) => sum + p.amount, 0) || 0,
                date: s.initialDebtDate || new Date().toISOString(),
                isInitial: true,
                payments: s.initialDebtPayments || []
            }));
        return [...items, ...initials];
    }, [purchases, suppliers]);

    const pendingSales = useMemo(() => {
        // Exclude 'saldo-inicial' sales to avoid double counting with initials logic
        const items = sales
            .filter(s => (s.total - (s.paidAmount || 0)) > 0 && !s.items.some(i => i.productId === 'saldo-inicial'))
            .map(s => ({ ...s, isInitial: false }));
            
        const initials = customers
            .filter(c => (c.initialDebt || 0) > 0)
            .map(c => ({
                id: `init-cus-${c.id}`,
                customerId: c.id,
                customerName: c.name,
                total: (c.initialDebt || 0) + (c.initialDebtPayments?.reduce((sum, p) => sum + p.amount, 0) || 0),
                paidAmount: c.initialDebtPayments?.reduce((sum, p) => sum + p.amount, 0) || 0,
                date: c.initialDebtDate || new Date().toISOString(),
                isInitial: true,
                payments: c.initialDebtPayments || []
            }));
        return [...items, ...initials];
    }, [sales, customers]);

    const filteredItems = activeTab === 'toPay' 
        ? pendingPurchases.filter(p => p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
        : pendingSales.filter(s => (s.customerName || 'Cliente').toLowerCase().includes(searchTerm.toLowerCase()));

    const sortedFilteredItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredItems]);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        const executePayment = async (method: string, amount: number) => {
            if (activeTab === 'toPay') {
                if (selectedItem.isInitial) {
                    await addSupplierDebtAbono(selectedItem.supplierId, amount, method);
                } else {
                    await addPurchasePayment(selectedItem.id, amount, method);
                }
            } else {
                if (selectedItem.isInitial) {
                    await addCustomerDebtAbono(selectedItem.customerId, amount, method);
                } else {
                    await addSalePayment(selectedItem.id, amount, method);
                }
            }
        };

        if (paymentMethod === 'Mixto') {
            if (paidCashModal > 0) await executePayment('Efectivo', paidCashModal);
            if (paidTransferModal > 0) await executePayment('Transferencia', paidTransferModal);
        } else {
            if (paymentAmount <= 0) return;
            await executePayment(paymentMethod, paymentAmount);
        }

        setSelectedItem(null);
        setPaymentAmount(0);
        setPaidCashModal(0);
        setPaidTransferModal(0);
    };

    const handleEditTotal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        if (activeTab === 'toPay') {
            if (selectedItem.isInitial) {
                updateSupplier(selectedItem.supplierId, { initialDebt: newTotal });
            } else {
                updatePurchase(selectedItem.id, { total: newTotal });
            }
        } else {
            if (selectedItem.isInitial) {
                updateCustomer(selectedItem.customerId, { initialDebt: newTotal });
            } else {
                updateSale(selectedItem.id, { total: newTotal });
            }
        }

        setSelectedItem(null);
        setIsEditTotalModalOpen(false);
        setNewTotal(0);
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
                {sortedFilteredItems.map(item => {
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
                                        {item.isInitial ? (
                                            <span className="text-orange-600 font-black">SALDO INICIAL / ANTIGUO</span>
                                        ) : (
                                            `Fecha: ${formatDate(item.date)} • Ref: ${item.id.slice(0, 8)}`
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                <div className="text-center md:text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-600">{formatCurrency(item.total)}</p>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setNewTotal(item.total);
                                                    setIsEditTotalModalOpen(true);
                                                }}
                                                className="p-1 text-blue-500 hover:text-blue-700 bg-blue-50 rounded-md transition-all"
                                                title="Corregir Total"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        )}
                                    </div>
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

            {/* Modal para Corregir Total */}
            {isEditTotalModalOpen && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-10 space-y-8 text-center border border-blue-100">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 scale-110">
                            <Edit2 size={32} />
                        </div>
                        <header className="space-y-1">
                            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tighter">Corregir Saldo</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {activeTab === 'toPay' ? 'Proveedor' : 'Cliente'}: {activeTab === 'toPay' ? selectedItem.supplierName : (selectedItem.customerName || 'Mostrador')}
                            </p>
                        </header>

                        <form onSubmit={handleEditTotal} className="space-y-6 text-left">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block text-center">Nuevo Valor Total del Documento</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    value={newTotal || ''}
                                    onChange={e => setNewTotal(parseFloat(e.target.value))}
                                    className="w-full px-4 py-6 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-3xl text-slate-900 text-center tracking-tighter"
                                />
                                <p className="text-[8px] text-blue-500 font-bold italic text-center uppercase tracking-widest">Este cambio ajustará el balance sin afectar los abonos registrados.</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setSelectedItem(null); setIsEditTotalModalOpen(false); }} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black active:scale-95 transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20">
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Abono */}
            {selectedItem && !isEditTotalModalOpen && (
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
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('Efectivo')}
                                        className={cn(
                                            "py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                            paymentMethod === 'Efectivo' ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400"
                                        )}
                                    >
                                        Efectivo
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('Transferencia')}
                                        className={cn(
                                            "py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                            paymentMethod === 'Transferencia' ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400"
                                        )}
                                    >
                                        Transfer
                                    </button>
                                    {!selectedItem.isInitial && (
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentMethod('Mixto')}
                                            className={cn(
                                                "py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                                paymentMethod === 'Mixto' ? "bg-purple-600 border-purple-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400"
                                            )}
                                        >
                                            Mixto
                                        </button>
                                    )}
                                </div>

                                {paymentMethod === 'Mixto' ? (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Efectivo</label>
                                            <input 
                                                type="number" 
                                                value={paidCashModal || ''}
                                                onChange={e => setPaidCashModal(parseFloat(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transfer</label>
                                            <input 
                                                type="number" 
                                                value={paidTransferModal || ''}
                                                onChange={e => setPaidTransferModal(parseFloat(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
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
                                )}
                            </div>

                            {/* Historial de Abonos */}
                            {selectedItem.payments && selectedItem.payments.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <History size={12} /> Historial de Abonos
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {selectedItem.payments.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency(p.amount)}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{formatDate(p.date)} • {p.method}</p>
                                                </div>
                                                {isAdmin && (
                                                    <button 
                                                        type="button"
                                                        onClick={async () => {
                                                            if (window.confirm('¿Eliminar este abono? El dinero regresará o saldrá de caja según corresponda.')) {
                                                                if (activeTab === 'toPay') {
                                                                    if (selectedItem.isInitial) {
                                                                        await deleteSupplierDebtAbono(selectedItem.supplierId, idx);
                                                                    } else {
                                                                        await deletePurchasePayment(selectedItem.id, idx);
                                                                    }
                                                                } else {
                                                                    if (selectedItem.isInitial) {
                                                                        await deleteCustomerDebtAbono(selectedItem.customerId, idx);
                                                                    } else {
                                                                        await deleteSalePayment(selectedItem.id, idx);
                                                                    }
                                                                }
                                                                setSelectedItem(null);
                                                            }
                                                        }}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
