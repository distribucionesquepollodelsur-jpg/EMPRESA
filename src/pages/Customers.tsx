import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, User, Phone, MapPin, Search, Trash2, Wallet, CreditCard, History, ChevronRight, X, Calendar, Edit2, Coins, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Customer, Sale } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

const Customers: React.FC = () => {
    const { customers, sales, addCustomer, updateCustomer, updateCustomerBalance, deleteCustomer, addSalePayment, deleteSalePayment, updateSale } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || [
        'distribucionesquepollodelsur@gmail.com',
        'alex.b19h@gmail.com',
        'alex@quepollo.com',
        'admin@quepollo.com'
    ].includes(user?.email || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditTotalModalOpen, setIsEditTotalModalOpen] = useState(false);
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    
    // Selection state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [initialDebt, setInitialDebt] = useState<number>(0);

    // Payment state
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Edit total state
    const [newTotal, setNewTotal] = useState<number>(0);

    // Balance logic
    const [balanceAmount, setBalanceAmount] = useState<number>(0);
    const [balanceReason, setBalanceReason] = useState('');

    const handleBalanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || balanceAmount <= 0) return;
        
        try {
            await updateCustomerBalance(selectedCustomer.id, balanceAmount, balanceReason);
            setIsBalanceModalOpen(false);
            setBalanceAmount(0);
            setBalanceReason('');
            alert('Saldo a favor registrado exitosamente.');
        } catch (error) {
            alert('Error al registrar saldo.');
        }
    };

    const getCustomerBalance = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        const initial = customer?.initialDebt || 0;

        const customerSales = sales.filter(s => s.customerId === customerId);
        
        // Filter out "Saldo Inicial" sales to avoid double counting
        const regularSales = customerSales.filter(s => !s.items.some(item => item.productId === 'saldo-inicial'));
        const saldoInicialSales = customerSales.filter(s => s.items.some(item => item.productId === 'saldo-inicial'));

        const regularDebt = regularSales.reduce((sum, s) => sum + (s.total - (s.paidAmount || 0)), 0);
        const saldoInicialPaid = saldoInicialSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

        return initial + regularDebt - saldoInicialPaid;
    };

    const getCustomerSales = (customerId: string) => {
        return sales
            .filter(s => s.customerId === customerId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const isClientOverdue = (customerId: string) => {
        const customerSales = sales.filter(s => s.customerId === customerId && s.total > (s.paidAmount || 0));
        if (customerSales.length === 0) return false;

        const oldestSale = customerSales.reduce((oldest, s) => {
            return new Date(s.date) < new Date(oldest.date) ? s : oldest;
        });

        return differenceInDays(new Date(), parseISO(oldestSale.date)) >= 5;
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        const customerData = {
            name,
            phone,
            address,
            initialDebt: isAdmin ? initialDebt : (editingCustomer ? editingCustomer.initialDebt : initialDebt),
            initialDebtDate: editingCustomer ? editingCustomer.initialDebtDate : new Date().toISOString()
        };

        try {
            setIsSubmitting(true);
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, customerData);
            } else {
                await addCustomer(customerData);
            }
            closeModal();
        } catch (error: any) {
            console.error('Error in handleSubmit:', error);
            let message = 'Hubo un error al guardar el cliente. Por favor intente de nuevo.';
            
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
        if (!selectedSale || paymentAmount <= 0) return;
        
        addSalePayment(selectedSale.id, paymentAmount, paymentMethod);
        setIsPaymentModalOpen(false);
        setPaymentAmount(0);
        setSelectedSale(null);
    };

    const handleEditTotalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSale) return;
        
        updateSale(selectedSale.id, { total: newTotal });
        setIsEditTotalModalOpen(false);
        setNewTotal(0);
        setSelectedSale(null);
    };

    const openModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer);
            setName(customer.name);
            setPhone(customer.phone);
            setAddress(customer.address || '');
            setInitialDebt(customer.initialDebt || 0);
        } else {
            setEditingCustomer(null);
            setName('');
            setPhone('');
            setAddress('');
            setInitialDebt(0);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setName('');
        setPhone('');
        setAddress('');
        setInitialDebt(0);
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">CLIENTES</h2>
                    <p className="text-slate-500 font-medium">Gestión de cartera y créditos de clientes</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200 active:scale-95"
                >
                    <Plus size={20} /> Nuevo Cliente
                </button>
            </div>

            {/* Overdue Banner */}
            {customers.some(c => isClientOverdue(c.id)) && (
                <div className="bg-red-600 text-white p-4 rounded-3xl flex items-center justify-between shadow-xl shadow-red-200 animate-pulse">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={24} className="shrink-0" />
                        <div>
                            <p className="font-black text-sm uppercase tracking-tight">¡Atención! Cobros Pendientes</p>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Hay clientes con deudas superando los 5 días de retraso.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Clientes</p>
                    <h3 className="text-2xl font-black text-slate-900">{customers.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm ring-2 ring-blue-50">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Cartera Total</p>
                    <h3 className="text-2xl font-black text-blue-600">
                        {formatCurrency(customers.reduce((sum, c) => sum + getCustomerBalance(c.id), 0))}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o teléfono..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5">Ubicación</th>
                                <th className="px-8 py-5 text-center">Estado Cartera</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredCustomers.map(customer => {
                                const balance = getCustomerBalance(customer.id);
                                return (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{customer.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                        {customer.phone}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <MapPin size={14} className="text-slate-400" />
                                                {customer.address || 'Sin dirección'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className={cn(
                                                "inline-flex flex-col px-4 py-2 rounded-2xl font-black transition-all",
                                                balance > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                            )}>
                                                <span className="text-base tracking-tighter">{formatCurrency(balance)}</span>
                                                <span className="text-[8px] uppercase tracking-widest opacity-60">
                                                    {balance > 0 ? 'Con Deuda' : 'Al Día'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setIsBalanceModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                    title="Registrar Saldo a Favor (Trueque)"
                                                >
                                                    <Coins size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Ver Detalles"
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => openModal(customer)}
                                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('¿Eliminar cliente?')) deleteCustomer(customer.id);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium">
                                        No se encontraron clientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle de Cartera */}
            {isDetailModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white h-full w-full max-w-2xl shadow-3xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 bg-blue-600 text-white space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black tracking-tighter uppercase">{selectedCustomer.name}</h3>
                                        <p className="text-blue-100 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
                                            <Phone size={14} /> {selectedCustomer.phone}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            
                        <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Deuda Cliente</p>
                                    <p className="text-2xl font-black text-white tracking-tighter">
                                        {formatCurrency(getCustomerBalance(selectedCustomer.id))}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Saldo Favor (Trueque)</p>
                                    <p className="text-2xl font-black text-white tracking-tighter">
                                        {formatCurrency(selectedCustomer.balance || 0)}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Ventas Totales</p>
                                    <p className="text-2xl font-black tracking-tighter">
                                        {getCustomerSales(selectedCustomer.id).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <History size={16} /> Historial de Créditos
                                </h4>
                                
                                <div className="space-y-6">
                                    {getCustomerSales(selectedCustomer.id).map(sale => {
                                        const balance = sale.total - (sale.paidAmount || 0);
                                        return (
                                            <div key={sale.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                                                <div className="p-5 bg-slate-50/80 flex items-center justify-between border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-900 font-black uppercase tracking-tight">{formatDate(sale.date)}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Venta: V-{(sale.saleNumber || 0).toString().padStart(6, '0')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Facturado</p>
                                                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                                            <p className="font-black text-slate-900">{formatCurrency(sale.total)}</p>
                                                            {isAdmin && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedSale(sale);
                                                                        setNewTotal(sale.total);
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
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-100 pb-1">Abonos Realizados</p>
                                                        {sale.payments && sale.payments.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {sale.payments.map((payment, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center text-xs group/payment">
                                                                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                                            <span>{formatDate(payment.date)}</span>
                                                                            <span className="text-[8px] uppercase font-black opacity-50 px-1 bg-slate-100 rounded">{payment.method}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="font-black text-green-600">+{formatCurrency(payment.amount)}</span>
                                                                            {isAdmin && (
                                                                                <button 
                                                                                    onClick={async () => {
                                                                                        if (window.confirm('¿Eliminar este abono?')) {
                                                                                            await deleteSalePayment(sale.id, idx);
                                                                                        }
                                                                                    }}
                                                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/payment:opacity-100"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-300 italic">Sin abonos previos.</p>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 mt-2 border-t border-slate-50 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Restante</span>
                                                            <span className={cn(
                                                                "text-lg font-black tracking-tighter",
                                                                balance > 0 ? "text-red-500" : "text-green-600"
                                                            )}>
                                                                {formatCurrency(balance)}
                                                            </span>
                                                        </div>
                                                        {balance > 0 && (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedSale(sale);
                                                                    setIsPaymentModalOpen(true);
                                                                }}
                                                                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-950/10 active:scale-95"
                                                            >
                                                                <CreditCard size={14} /> Abonar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {getCustomerSales(selectedCustomer.id).length === 0 && (
                                        <div className="py-20 text-center text-slate-300 italic border-2 border-dotted border-slate-100 rounded-3xl">
                                            Sin historial de ventas a crédito.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Corregir Total (ADMIN) */}
            {isEditTotalModalOpen && selectedSale && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-6 text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Edit2 size={32} />
                        </div>
                        <header className="space-y-1">
                            <h3 className="text-xl font-black tracking-tighter uppercase text-slate-900">Corregir Saldo</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">
                                Venta V-{(selectedSale.saleNumber || 0).toString().padStart(6, '0')}
                            </p>
                        </header>

                        <form onSubmit={handleEditTotalSubmit} className="space-y-6 text-left">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Nuevo Valor de Venta</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    value={newTotal || ''}
                                    onChange={e => setNewTotal(parseFloat(e.target.value))}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-2xl font-black text-slate-900 text-center tracking-tighter"
                                />
                                <p className="text-[9px] text-blue-500 font-bold italic text-center">Esto recalcula el balance automáticamente sin afectar la caja.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditTotalModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Registrar Abono a Venta */}
            {isPaymentModalOpen && selectedSale && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="space-y-1">
                            <h3 className="text-xl font-black tracking-tighter uppercase">Registrar Abono</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                Venta V-{(selectedSale.saleNumber || 0).toString().padStart(6, '0')}
                            </p>
                        </header>

                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente:</span>
                            <span className="font-black text-red-500 text-lg">{formatCurrency(selectedSale.total - (selectedSale.paidAmount || 0))}</span>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor del Abono</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    max={selectedSale.total - (selectedSale.paidAmount || 0)}
                                    value={paymentAmount || ''}
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none text-2xl font-black text-slate-900 text-center tracking-tighter"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Captura</label>
                                <select 
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold"
                                >
                                    <option value="cash">Efectivo (Caja)</option>
                                    <option value="transfer">Transferencia Bancaria</option>
                                    {selectedCustomer && (selectedCustomer.balance || 0) > 0 && (
                                        <option value="balance">Saldo a Favor (Trueque)</option>
                                    )}
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

            {/* Modal para Registrar Saldo a Favor / Trueque */}
            {isBalanceModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="space-y-1">
                            <h3 className="text-xl font-black tracking-tighter uppercase">Saldo Favor (Trueque)</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">
                                {selectedCustomer.name}
                            </p>
                        </header>

                        <div className="p-4 bg-green-50 rounded-2xl flex justify-between items-center text-green-700">
                            <span className="text-[10px] font-black uppercase tracking-widest">Saldo Actual:</span>
                            <span className="font-black text-lg">{formatCurrency(selectedCustomer.balance || 0)}</span>
                        </div>

                        <form onSubmit={handleBalanceSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor a Cargar</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    value={balanceAmount || ''}
                                    onChange={e => setBalanceAmount(parseFloat(e.target.value))}
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 outline-none text-2xl font-black text-slate-900 text-center tracking-tighter"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo / Concepto</label>
                                <textarea 
                                    required
                                    value={balanceReason}
                                    onChange={e => setBalanceReason(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-sm h-24"
                                    placeholder="Ej: Intercambio por servicios, devolución, etc."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsBalanceModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-900/20 active:scale-95 transition-all">
                                    Cargar Saldo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-sm">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter italic uppercase">
                                    {editingCustomer ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
                                </h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de Perfil</p>
                            </div>
                            <User size={32} className="text-slate-700" />
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                                    placeholder="Nombre del cliente..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                                        placeholder="300 000 0000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                                    <input 
                                        type="text" 
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                                        placeholder="Barrio / Ciudad"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2 text-slate-900">
                                    <Wallet size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Saldo Inicial {editingCustomer ? '(Editar)' : '(Deuda Antigua)'}</span>
                                </div>
                                <div className="space-y-2">
                                    <input 
                                        type="number" 
                                        value={initialDebt || ''}
                                        onChange={e => setInitialDebt(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-black text-lg text-red-600"
                                        placeholder="0.00"
                                    />
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                                        {editingCustomer ? 'Modifique este valor si desea corregir el saldo inicial registrado para este cliente.' : 'Se registrará como un saldo pendiente al crear el cliente.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-950/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'GUARDANDO...' : (editingCustomer ? 'GUARDAR' : 'CREAR')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
