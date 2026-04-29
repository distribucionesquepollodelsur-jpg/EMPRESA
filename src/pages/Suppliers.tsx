import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Truck, Plus, Phone, Edit2, Trash2, Search, User } from 'lucide-react';
import { Supplier } from '../types';

const Suppliers: React.FC = () => {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [initialDebt, setInitialDebt] = useState<number>(0);
    const [initialDebtDate, setInitialDebtDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            updateSupplier(editingSupplier.id, { name, phone });
        } else {
            addSupplier({ 
                name, 
                phone, 
                initialDebt: initialDebt > 0 ? initialDebt : undefined,
                initialDebtDate: initialDebt > 0 ? initialDebtDate : undefined
            });
        }
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setPhone('');
        setInitialDebt(0);
        setInitialDebtDate(new Date().toISOString().split('T')[0]);
        setEditingSupplier(null);
        setIsModalOpen(false);
    };

    const handleEdit = (s: Supplier) => {
        setEditingSupplier(s);
        setName(s.name);
        setPhone(s.phone);
        setIsModalOpen(true);
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <header>
                    <h1 className="text-2xl font-bold text-slate-900">Directorio de Proveedores</h1>
                    <p className="text-slate-500 text-sm">Gestiona tus contactos de abastecimiento</p>
                </header>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 font-bold"
                >
                    <Plus size={20} /> Nuevo Proveedor
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar proveedor..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">
                                <Truck size={24} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(s)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => { if(window.confirm('¿Eliminar proveedor?')) deleteSupplier(s.id); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{s.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Phone size={14} />
                            <span>{s.phone || 'Sin teléfono'}</span>
                        </div>
                    </div>
                ))}

                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                        No se encontraron proveedores registrados.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8">
                        <h2 className="text-xl font-black mb-6 uppercase tracking-tight">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                                        placeholder="Ej: Pollo Granjas"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono / Celular</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        type="text" 
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                                        placeholder="300 000 0000"
                                    />
                                </div>
                            </div>

                            {!editingSupplier && (
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Antiguo</label>
                                        <input 
                                            type="number" 
                                            value={initialDebt || ''}
                                            onChange={e => setInitialDebt(parseFloat(e.target.value))}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Saldo</label>
                                        <input 
                                            type="date" 
                                            value={initialDebtDate}
                                            onChange={e => setInitialDebtDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={resetForm} className="flex-1 py-3 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-950/20 active:scale-95 transition-all">
                                    {editingSupplier ? 'Guardar' : 'Registrar'}
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
