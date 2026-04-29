import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, User, Phone, MapPin, Search, Trash2, Wallet, CreditCard, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Customer } from '../types';

const Customers: React.FC = () => {
    const { customers, sales, addCustomer, updateCustomer, deleteCustomer } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [initialDebt, setInitialDebt] = useState<number>(0);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const getCustomerBalance = (customerId: string) => {
        const customerSales = sales.filter(s => s.customerId === customerId);
        const totalDebt = customerSales.reduce((sum, s) => sum + (s.total - (s.paidAmount || 0)), 0);
        return totalDebt;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customerData = {
            name,
            phone,
            address,
            initialDebt: editingCustomer ? editingCustomer.initialDebt : initialDebt,
            initialDebtDate: editingCustomer ? editingCustomer.initialDebtDate : new Date().toISOString()
        };

        if (editingCustomer) {
            updateCustomer(editingCustomer.id, customerData);
        } else {
            addCustomer(customerData);
        }

        closeModal();
    };

    const openModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer);
            setName(customer.name);
            setPhone(customer.phone);
            setAddress(customer.address || '');
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

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
                                <th className="px-8 py-5">Estado Cartera</th>
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
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{customer.name}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Phone size={10} /> {customer.phone}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <MapPin size={14} className="text-slate-400" />
                                                {customer.address || 'Sin dirección'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={cn(
                                                "inline-flex flex-col px-3 py-1.5 rounded-xl font-bold transition-all",
                                                balance > 0 ? "bg-red-50 text-red-600 ring-1 ring-red-100" : "bg-green-50 text-green-600 ring-1 ring-green-100"
                                            )}>
                                                <span className="text-sm">{formatCurrency(balance)}</span>
                                                <span className="text-[8px] uppercase tracking-widest">
                                                    {balance > 0 ? 'Con Deuda' : 'Al Día'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => openModal(customer)}
                                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <CreditCard size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('¿Eliminar cliente?')) deleteCustomer(customer.id);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter">
                                    {editingCustomer ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
                                </h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Información de contacto y crédito</p>
                            </div>
                            <User size={32} className="text-slate-700" />
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
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
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
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
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                                    <input 
                                        type="text" 
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                                        placeholder="Barrio / Ciudad"
                                    />
                                </div>
                            </div>

                            {!editingCustomer && (
                                <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 text-orange-600">
                                        <Wallet size={18} />
                                        <span className="text-xs font-black uppercase tracking-widest">Saldo Inicial</span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest ml-1">Deuda Pendiente (Opcional)</label>
                                        <input 
                                            type="number" 
                                            value={initialDebt}
                                            onChange={e => setInitialDebt(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-black text-orange-600"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200 active:scale-95"
                                >
                                    {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
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
