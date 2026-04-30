import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
    Plus, 
    Trash2, 
    Search, 
    Truck, 
    Tv, 
    Zap, 
    Cog, 
    Table, 
    Box, 
    Calendar, 
    DollarSign, 
    FileText,
    AlertCircle,
    ArrowLeft,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Asset } from '../types';

const Assets: React.FC = () => {
    const { assets, addAsset, updateAsset, deleteAsset } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [isIdModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [category, setCategory] = useState<Asset['category']>('Otro');
    const [value, setValue] = useState<number>(0);
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    const resetForm = () => {
        setName('');
        setCategory('Otro');
        setValue(0);
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setSelectedAsset(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const assetData = {
            name,
            category,
            value,
            purchaseDate,
            description
        };

        if (selectedAsset) {
            await updateAsset(selectedAsset.id, assetData);
        } else {
            await addAsset(assetData);
        }
        setIsModalOpen(false);
        resetForm();
    };

    const openEditModal = (asset: Asset) => {
        setSelectedAsset(asset);
        setName(asset.name);
        setCategory(asset.category);
        setValue(asset.value);
        setPurchaseDate(asset.purchaseDate);
        setDescription(asset.description || '');
        setIsModalOpen(true);
    };

    const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

    const getCategoryIcon = (cat: Asset['category']) => {
        switch (cat) {
            case 'Vehículo': return <Truck size={20} />;
            case 'Electrodoméstico': return <Zap size={20} />;
            case 'Maquinaria': return <Cog size={20} />;
            case 'Mueble': return <Table size={20} />;
            default: return <Box size={20} />;
        }
    };

    const categoryColors = {
        'Vehículo': 'bg-blue-50 text-blue-600 border-blue-100',
        'Electrodoméstico': 'bg-yellow-50 text-yellow-600 border-yellow-100',
        'Maquinaria': 'bg-purple-50 text-purple-600 border-purple-100',
        'Mueble': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Otro': 'bg-slate-50 text-slate-600 border-slate-100'
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Activos Fijos</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Electrodomésticos, Vehículos y Maquinaria</p>
                    </div>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                    >
                        <Plus size={18} /> Registrar Activo
                    </button>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={120} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total Activos</p>
                        <h3 className="text-3xl font-black tracking-tighter text-orange-400">{formatCurrency(totalValue)}</h3>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                            <ShieldCheck size={12} className="text-green-400" /> Capital de Inversión
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad de Activos</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{assets.length}</h3>
                        <span className="text-xs font-bold text-slate-400">Unidades registradas</span>
                    </div>
                </div>

                <div className="bg-orange-50 p-8 rounded-[40px] border border-orange-100 border-dashed flex flex-col justify-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">Categoría Principal</p>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                        {assets.length > 0 ? (() => {
                            const counts = assets.reduce((acc, curr) => {
                                acc[curr.category] = (acc[curr.category] || 0) + 1;
                                return acc;
                            }, {} as any);
                            return Object.entries(counts).sort((a,b) => (b[1] as any) - (a[1] as any))[0][0];
                        })() : 'Ninguna'}
                    </h3>
                </div>
            </div>

            {/* Search & List */}
            <div className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o categoría..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-3xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map(asset => (
                        <div key={asset.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("p-4 rounded-2xl border", categoryColors[asset.category])}>
                                        {getCategoryIcon(asset.category)}
                                    </div>
                                    <div className="flex gap-2">
                                        {isAdmin && (
                                            <>
                                                <button 
                                                    onClick={() => openEditModal(asset)}
                                                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('¿Eliminar este activo?')) deleteAsset(asset.id);
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1 mb-6">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{asset.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.category}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <Calendar size={14} />
                                        <span className="text-xs font-bold">Compra: {formatDate(asset.purchaseDate)}</span>
                                    </div>
                                    {asset.description && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-xs text-slate-500 italic leading-relaxed">{asset.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valorado en</span>
                                <span className="text-lg font-black text-slate-900">{formatCurrency(asset.value)}</span>
                            </div>
                        </div>
                    ))}
                    
                    {filteredAssets.length === 0 && (
                        <div className="col-span-full py-20 bg-slate-50 rounded-[40px] border border-slate-200 border-dashed text-center">
                            <Box size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No se encontraron activos.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isIdModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 space-y-8">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-orange-500 mx-auto">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">
                                        {selectedAsset ? 'Editar Activo' : 'Registrar Activo'}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Ingresa los detalles del activo de la empresa</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 col-span-full">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Activo</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-950 text-sm"
                                            placeholder="Ej: Camioneta entrega"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                                        <select 
                                            required 
                                            value={category}
                                            onChange={e => setCategory(e.target.value as any)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-950 text-sm appearance-none"
                                        >
                                            <option value="Vehículo">Vehículo</option>
                                            <option value="Electrodoméstico">Electrodoméstico</option>
                                            <option value="Maquinaria">Maquinaria</option>
                                            <option value="Mueble">Mueble</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Comercial (Aproximado)</label>
                                        <div className="relative">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                                                <DollarSign size={16} />
                                            </div>
                                            <input 
                                                type="number" 
                                                required 
                                                value={isNaN(value) ? '' : value}
                                                onChange={e => setValue(parseFloat(e.target.value))}
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-950 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-full">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Adquisición</label>
                                        <div className="relative">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Calendar size={16} />
                                            </div>
                                            <input 
                                                type="date" 
                                                required 
                                                value={purchaseDate}
                                                onChange={e => setPurchaseDate(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-950 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-full">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Detalles</label>
                                        <textarea 
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-950 text-sm min-h-[100px]"
                                            placeholder="Placas, serial, marca, estado..."
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-6">
                                    <button className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
                                        {selectedAsset ? 'Actualizar Activo' : 'Registrar Activo'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)} 
                                        className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assets;
