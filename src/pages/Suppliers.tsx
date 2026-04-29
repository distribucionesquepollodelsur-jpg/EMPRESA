import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Truck, Plus, Phone, Edit2, Trash2, Search, User, Wallet, History, ChevronRight, X, CreditCard, Calendar } from 'lucide-react';
import { Supplier, Purchase } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const Suppliers: React.FC = () => {
    const { suppliers, purchases, addSupplier, updateSupplier, deleteSupplier, addPurchasePayment, updatePurchase } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [isEditTotalModalOpen, setIsEditTotalModalOpen] = useState(false);
    const [newTotal, setNewTotal] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [initialDebt, setInitialDebt] = useState<number>(0);
    const [initialDebtDate, setInitialDebtDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Payment form
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        try {
            setIsSubmitting(true);
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, { 
                    name, 
                    phone,
                    initialDebt: isAdmin ? initialDebt : editingSupplier.initialDebt,
                    initialDebtDate: isAdmin ? initialDebtDate : editingSupplier.initialDebtDate
                });
            } else {
                await addSupplier({ 
                    name, 
                    phone, 
                    initialDebt: initialDebt > 0 ? initialDebt : undefined,
                    initialDebtDate: initialDebt > 0 ? initialDebtDate : undefined
                });
            }
            resetForm();
        } catch (error: any) {
            console.error('Error in handleSubmit:', error);
            let message = 'Hubo un error al guardar el proveedor. Por favor intente de nuevo.';
            
            // Try to extract more detail if it's a Firestore JSON error
            try {
                const parsed = JSON.parse(error.message);
                if (parsed.error) message += `\nDetalle: ${parsed.error}`;
            } catch (e) {
                if (error.message) message += `\nError: ${error.message}`;
            }
            
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPurchase || paymentAmount <= 0) return;
        
        addPurchasePayment(selectedPurchase.id, paymentAmount, paymentMethod);
        setIsPaymentModalOpen(false);
        setPaymentAmount(0);
        
        // Update selected purchase in the detail view if needed (it will auto-update via context)
        setSelectedPurchase(null);
    };

    const handleEditTotalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPurchase) return;
        
        updatePurchase(selectedPurchase.id, { total: newTotal });
        setIsEditTotalModalOpen(false);
        setNewTotal(0);
        setSelectedPurchase(null);
    };

    const resetForm = () => {
        setName('');
        setPhone('');
        setInitialDebt(0);
        setInitialDebtDate(new Date().toISOString().split('T')[0]);
        setEditingSupplier(null);
        setIsModalOpen(false);
    };

    const handleEdit = (s: Supplier, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSupplier(s);
        setName(s.name);
        setPhone(s.phone);
        setInitialDebt(s.initialDebt || 0);
        setInitialDebtDate(s.initialDebtDate ? s.initialDebtDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar proveedor?')) {
            deleteSupplier(id);
        }
    };

    const getSupplierBalance = (supplierId: string, supplierName: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        const initial = supplier?.initialDebt || 0;
        
        const supplierPurchases = purchases.filter(p => 
            p.supplierId === supplierId || 
            (p.supplierName && supplierName && p.supplierName.toLowerCase() === supplierName.toLowerCase())
        );
        
        // We filter out any purchase that was created as "Saldo Inicial" to avoid double counting if we include supplier.initialDebt
        const regularPurchases = supplierPurchases.filter(p => !p.items.some(item => item.productId === 'saldo-inicial'));
        const saldoInicialPurchases = supplierPurchases.filter(p => p.items.some(item => item.productId === 'saldo-inicial'));
        
        const regularBalance = regularPurchases.reduce((sum, p) => sum + (p.total - p.paidAmount), 0);
        const saldoInicialPayments = saldoInicialPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
        
        return initial + regularBalance - saldoInicialPayments;
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSupplierPurchases = (s: Supplier) => {
        return purchases
            .filter(p => 
                p.supplierId === s.id || 
                (p.supplierName && s.name && p.supplierName.toLowerCase() === s.name.toLowerCase())
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <header>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">PROVEEDORES</h2>
                    <p className="text-slate-500 font-medium">Gestión de cuentas por pagar y abonos</p>
                </header>
                {isAdmin && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-950/20 font-bold active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Proveedor
                    </button>
                )}
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar proveedor..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(s => {
                    const balance = getSupplierBalance(s.id, s.name);
                    return (
                        <div 
                            key={s.id} 
                            onClick={() => setSelectedSupplier(s)}
                            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <Truck size={24} />
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEdit(s, e)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg border border-slate-100">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={(e) => handleDelete(s.id, e)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-lg border border-slate-100">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{s.name}</h3>
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                    <Phone size={12} />
                                    <span>{s.phone || 'Sin teléfono'}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                    <p className={cn(
                                        "text-xl font-black tracking-tight",
                                        balance > 0 ? "text-red-600" : "text-green-600"
                                    )}>
                                        {formatCurrency(balance)}
                                    </p>
                                </div>
                                <div className="p-2 bg-slate-50 text-slate-300 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-all">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 font-medium bg-white rounded-3xl border border-dashed border-slate-200">
                        <Wallet className="mx-auto mb-4 text-slate-200" size={48} />
                        No se encontraron proveedores registrados.
                    </div>
                )}
            </div>

            {/* Modal de Detalle (Saldo Anterior y Abonos por fecha) */}
            {selectedSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white h-full w-full max-w-2xl shadow-3xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 bg-slate-900 text-white space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <Truck size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black tracking-tighter uppercase">{selectedSupplier.name}</h3>
                                        <p className="text-slate-400 font-bold flex items-center gap-2">
                                            <Phone size={14} /> {selectedSupplier.phone}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cuentas por Pagar</p>
                                    <p className="text-2xl font-black text-red-400">
                                        {formatCurrency(getSupplierBalance(selectedSupplier.id, selectedSupplier.name))}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Compras</p>
                                    <p className="text-2xl font-black">
                                        {getSupplierPurchases(selectedSupplier).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <History size={16} /> Historial de Saldos (Por Fecha)
                                </h4>
                                
                                <div className="space-y-6">
                                    {getSupplierPurchases(selectedSupplier).map(purchase => {
                                        const purchaseBalance = purchase.total - purchase.paidAmount;
                                        return (
                                            <div key={purchase.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                                                <div className="p-5 bg-slate-50/80 flex items-center justify-between border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{formatDate(purchase.date)}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Factura: C-{(purchase.purchaseNumber || 0).toString().padStart(6, '0')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Facturado</p>
                                                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                                            <p className="font-black text-slate-900">{formatCurrency(purchase.total)}</p>
                                                            {isAdmin && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedPurchase(purchase);
                                                                        setNewTotal(purchase.total);
                                                                        setIsEditTotalModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all"
                                                                    title="Corregir Total"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-5 space-y-4">
                                                    {/* Abonos section */}
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-100 pb-1">Pagos y Abonos realizados</p>
                                                        {purchase.payments && purchase.payments.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {purchase.payments.map((payment, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                                        <div className="flex items-center gap-2 text-slate-500">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                                            <span className="font-bold">{formatDate(payment.date)}</span>
                                                                            <span className="text-[10px] uppercase font-black opacity-50">({payment.method})</span>
                                                                        </div>
                                                                        <span className="font-black text-green-600">+{formatCurrency(payment.amount)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-300 italic">No se han registrado abonos adicionales.</p>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 mt-2 border-t border-slate-50 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Restante</span>
                                                            <span className={cn(
                                                                "text-lg font-black tracking-tighter",
                                                                purchaseBalance > 0 ? "text-red-500" : "text-green-600"
                                                            )}>
                                                                {formatCurrency(purchaseBalance)}
                                                            </span>
                                                        </div>
                                                        {purchaseBalance > 0 && (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedPurchase(purchase);
                                                                    setIsPaymentModalOpen(true);
                                                                }}
                                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-950/10 active:scale-95"
                                                            >
                                                                <CreditCard size={14} /> Abonar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {getSupplierPurchases(selectedSupplier).length === 0 && (
                                        <div className="py-20 text-center text-slate-300 italic border-2 border-dotted border-slate-100 rounded-3xl">
                                            Este proveedor no tiene facturas registradas.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Corregir Total */}
            {isEditTotalModalOpen && selectedPurchase && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-6 text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Edit2 size={32} />
                        </div>
                        <header className="space-y-1">
                            <h3 className="text-xl font-black tracking-tighter uppercase text-slate-900">Corregir Saldo</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                Factura C-{(selectedPurchase.purchaseNumber || 0).toString().padStart(6, '0')}
                            </p>
                        </header>

                        <form onSubmit={handleEditTotalSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuevo Valor Total</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    value={newTotal || ''}
                                    onChange={e => setNewTotal(parseFloat(e.target.value))}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-2xl font-black text-slate-900 text-center tracking-tighter"
                                />
                                <p className="text-[10px] text-blue-500 font-bold italic">Esto cambiará el balance sin registrar un pago.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditTotalModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all">
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Registrar Abono */}
            {isPaymentModalOpen && selectedPurchase && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="space-y-1">
                            <h3 className="text-xl font-black tracking-tighter uppercase">Registrar Abono</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                Factura C-{(selectedPurchase.purchaseNumber || 0).toString().padStart(6, '0')}
                            </p>
                        </header>

                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo Pendiente:</span>
                            <span className="font-black text-red-500">{formatCurrency(selectedPurchase.total - selectedPurchase.paidAmount)}</span>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor del Abono</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    max={selectedPurchase.total - selectedPurchase.paidAmount}
                                    value={paymentAmount || ''}
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none text-2xl font-black text-slate-900 text-center tracking-tighter"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                                <select 
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                >
                                    <option value="cash">Efectivo</option>
                                    <option value="transfer">Transferencia</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-950/20 active:scale-95 transition-all">
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8">
                        <h2 className="text-xl font-black mb-6 uppercase tracking-tight">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                        placeholder="Ej: Pollo Granjas"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono / Celular</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        type="text" 
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                        placeholder="300 000 0000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Antiguo {editingSupplier ? '(Editar)' : ''}</label>
                                    <input 
                                        type="number" 
                                        value={initialDebt || ''}
                                        onChange={e => setInitialDebt(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Saldo</label>
                                    <input 
                                        type="date" 
                                        value={initialDebtDate}
                                        onChange={e => setInitialDebtDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={resetForm} className="flex-1 py-3 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Guardando...' : (editingSupplier ? 'Guardar' : 'Registrar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
