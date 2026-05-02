import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Scissors, Package, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Plus, Lock, Search, History, FileText } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { format } from 'date-fns';

const Despresaje: React.FC = () => {
    const { products, purchases, processings, addProcessing, updateProcessing, deleteProcessing } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || [
        'distribucionesquepollodelsur@gmail.com',
        'alex.b19h@gmail.com',
        'alex@quepollo.com',
        'admin@quepollo.com'
    ].includes(user?.email || '');
    
    const [mode, setMode] = useState<'purchase' | 'manual'>('purchase');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [purchaseId, setPurchaseId] = useState('');
    const [wholeChickenId, setWholeChickenId] = useState('');
    const [bulkQuantity, setBulkQuantity] = useState(0);
    const [inputItems, setInputItems] = useState<{ productId: string, quantity: number }[]>([]);
    const [derivations, setDerivations] = useState<{ productId: string, quantity: number }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Recent purchases that might have chicken
    const purchaseOptions = useMemo(() => {
        return purchases
            .slice()
            .reverse()
            .slice(0, 50); // Last 50 purchases
    }, [purchases]);

    const selectedPurchase = purchases.find(p => p.id === purchaseId);
    
    // Items in the selected purchase
    const purchaseItems = useMemo(() => {
        if (!selectedPurchase) return [];
        return selectedPurchase.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                ...item,
                product
            };
        });
    }, [selectedPurchase, products]);

    const inputIds = mode === 'purchase' ? [wholeChickenId] : inputItems.map(i => i.productId);
    const availableDerivations = products.filter(p => !inputIds.includes(p.id));

    const addInputItem = () => {
        setInputItems(prev => [...prev, { productId: '', quantity: 0 }]);
    };

    const updateInputItem = (index: number, key: string, value: any) => {
        setInputItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [key]: value };
            return copy;
        });
    };

    const removeInputItem = (index: number) => {
        setInputItems(prev => prev.filter((_, i) => i !== index));
    };

    const addDerivation = () => {
        setDerivations(prev => [...prev, { productId: '', quantity: 0 }]);
    };

    const updateDerivation = (index: number, key: string, value: any) => {
        setDerivations(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [key]: value };
            return copy;
        });
    };

    const removeDerivation = (index: number) => {
        setDerivations(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const totalOutWeight = derivations.reduce((sum, d) => {
            const product = products.find(p => p.id === d.productId);
            const weight = (product?.name.toLowerCase().includes('picada') || product?.unit === 'und') 
                ? (d.quantity * 0.475) 
                : d.quantity;
            return sum + (weight || 0);
        }, 0);
        
        try {
            const data = mode === 'purchase' 
                ? {
                    purchaseId,
                    inputProductId: wholeChickenId,
                    inputQuantity: bulkQuantity,
                    outputItems: derivations,
                    totalOutputWeight: totalOutWeight
                }
                : {
                    inputItems: inputItems,
                    outputItems: derivations,
                    totalOutputWeight: totalOutWeight
                };

            if (editingId) {
                await updateProcessing(editingId, data);
                alert('Registro de despresaje actualizado exitosamente.');
            } else {
                await addProcessing(data);
                alert('Proceso de despresaje completado exitosamente.');
            }
            
            // Reset
            setEditingId(null);
            setPurchaseId('');
            setWholeChickenId('');
            setBulkQuantity(0);
            setInputItems([]);
            setDerivations([]);
        } catch (error) {
            console.error("Processing failed:", error);
            alert("Error al procesar el despresaje.");
        }
    };

    const handleEdit = (p: any) => {
        setEditingId(p.id);
        setDerivations(p.outputItems || []);
        
        if (p.purchaseId) {
            setMode('purchase');
            setPurchaseId(p.purchaseId);
            setWholeChickenId(p.inputProductId);
            setBulkQuantity(p.inputQuantity);
            setInputItems([]);
        } else {
            setMode('manual');
            setInputItems(p.inputItems || []);
            setPurchaseId('');
            setWholeChickenId('');
            setBulkQuantity(0);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro? Esto revertirá los cambios en el inventario.')) return;
        try {
            await deleteProcessing(id);
        } catch (error) {
            alert('Error al eliminar el registro.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                        {editingId ? 'Editando Despresaje' : 'Módulo de Despresaje'}
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight italic">Transformación de productos y control de rendimiento.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {editingId && (
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setPurchaseId('');
                                setWholeChickenId('');
                                setBulkQuantity(0);
                                setInputItems([]);
                                setDerivations([]);
                            }}
                            className="px-6 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                        >
                            Cancelar Edición
                        </button>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button 
                            onClick={() => setMode('purchase')}
                            disabled={!!editingId}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'purchase' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 cursor-not-allowed opacity-50'}`}
                            style={{ opacity: editingId ? 0.5 : 1 }}
                        >
                            Por Factura
                        </button>
                        <button 
                            onClick={() => setMode('manual')}
                            disabled={!!editingId}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 cursor-not-allowed opacity-50'}`}
                            style={{ opacity: editingId ? 0.5 : 1 }}
                        >
                            Multiproducto / Manual
                        </button>
                    </div>
                </div>
            </div>

            <form onSubmit={handleProcess} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Source Selection - Column 1-4 */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <h3 className="font-bold uppercase text-sm tracking-widest">
                                {mode === 'purchase' ? 'Origen: Factura de Compra' : 'Origen: Insumos / Productos a Despresar'}
                            </h3>
                        </div>

                        {mode === 'purchase' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seleccionar Factura</label>
                                    <select 
                                        required
                                        value={purchaseId}
                                        onChange={e => {
                                            setPurchaseId(e.target.value);
                                            setWholeChickenId('');
                                        }}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">Seleccionar Factura...</option>
                                        {purchaseOptions.map(p => (
                                            <option key={p.id} value={p.id}>
                                                Ref: C-{(p.purchaseNumber || 0).toString().padStart(6, '0')} - {p.supplierName} ({format(new Date(p.date), 'dd/MM')})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {purchaseId && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Producto a Despresar</label>
                                            <select 
                                                required
                                                value={wholeChickenId}
                                                onChange={e => setWholeChickenId(e.target.value)}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                            >
                                                <option value="">Seleccionar Producto de la Factura...</option>
                                                {purchaseItems.map(item => (
                                                    <option key={item.productId} value={item.productId}>
                                                        {item.product?.name} ({item.quantity} {item.product?.unit} comprados)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad a Usar</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                required
                                                value={bulkQuantity || ''}
                                                onChange={e => setBulkQuantity(parseFloat(e.target.value))}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insumos (Ej: Pernil, Huesos)</span>
                                    <button 
                                        type="button"
                                        onClick={addInputItem}
                                        className="text-orange-600 font-bold text-[10px] uppercase tracking-widest hover:underline"
                                    >
                                        + Añadir Insumo
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {inputItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 animate-in fade-in zoom-in duration-200">
                                            <div className="flex-1 space-y-1">
                                                <select 
                                                    required
                                                    value={item.productId}
                                                    onChange={e => updateInputItem(idx, 'productId', e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 outline-none text-xs"
                                                >
                                                    <option value="">Insumo...</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                                    ))}
                                                </select>
                                                {item.productId && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-2">
                                                        Costo: {formatCurrency(products.find(p => p.id === item.productId)?.cost || 0)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={item.quantity || ''}
                                                    onChange={e => updateInputItem(idx, 'quantity', parseFloat(e.target.value))}
                                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 outline-none text-xs"
                                                    placeholder="Cant."
                                                />
                                                {item.productId && item.quantity > 0 && (
                                                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter block text-right pr-2">
                                                        {formatCurrency((products.find(p => p.id === item.productId)?.cost || 0) * item.quantity)}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => removeInputItem(idx)}
                                                className="p-3 text-slate-300 hover:text-red-500 transition-colors self-start"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {inputItems.length === 0 && (
                                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                                            Seleccione Pernil, Huesos u otros insumos
                                        </div>
                                    )}
                                </div>
                                {inputItems.length > 0 && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4 animate-pulse">
                                            <p className="text-[9px] text-blue-700 font-black uppercase leading-tight">
                                                Nota: El peso total de una Picada no debe exceder los 475 gramos (0.475 kg). 
                                                Asegurése de balancear Pernil y Hueso.
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400 font-bold mb-1">
                                            <span className="text-[10px] uppercase tracking-widest">Peso Total:</span>
                                            <span className="text-xs">{inputItems.reduce((sum, i) => sum + (i.quantity || 0), 0).toFixed(2)} Kg/Und</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-900 font-black">
                                            <span className="text-[10px] uppercase tracking-widest opacity-50">Valor Transformado:</span>
                                            <span className="text-lg tracking-tighter">
                                                {formatCurrency(inputItems.reduce((sum, i) => {
                                                    const cost = products.find(p => p.id === i.productId)?.cost || 0;
                                                    return sum + (cost * (i.quantity || 0));
                                                }, 0))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                            <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                            <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                                {mode === 'purchase' 
                                    ? 'El sistema descontará el stock directamente de la factura seleccionada.' 
                                    : 'El sistema descontará el stock de cada insumo agregado manualmente.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transformations - Column 5-12 */}
                <div className="lg:col-span-7 space-y-6 flex flex-col">
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-xl flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2 text-white">
                                <div className="p-2 bg-slate-800 text-slate-400 rounded-lg">
                                    <Scissors size={20} />
                                </div>
                                <h3 className="font-bold uppercase text-sm tracking-widest">Producción: Presas Sacadas</h3>
                            </div>
                            {isAdmin && (
                                <button 
                                    type="button"
                                    onClick={addDerivation}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all uppercase tracking-widest"
                                >
                                    <Plus size={16} /> Añadir Presa
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {derivations.map((d, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800 rounded-2xl items-end relative group transition-all">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Presa Resultante</label>
                                        <select 
                                            required
                                            value={d.productId}
                                            onChange={e => updateDerivation(index, 'productId', e.target.value)}
                                            className="w-full p-3 bg-slate-700 border-none rounded-xl font-bold text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {availableDerivations.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full sm:w-40">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                {products.find(p => p.id === d.productId)?.unit === 'und' ? 'Unidades' : 'Peso (Kg)'}
                                            </label>
                                            {products.find(p => p.id === d.productId)?.name.toLowerCase().includes('picada') && (
                                                <span className="text-[8px] font-black text-orange-400 uppercase tracking-tighter">
                                                    {(d.quantity * 0.475).toFixed(2)} Kg
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                step={products.find(p => p.id === d.productId)?.unit === 'und' ? "1" : "0.01"}
                                                required
                                                value={d.quantity || ''}
                                                onChange={e => updateDerivation(index, 'quantity', parseFloat(e.target.value))}
                                                className={cn(
                                                    "w-full p-3 border-none rounded-xl font-bold text-white outline-none focus:ring-1 text-sm transition-all bg-slate-700 focus:ring-orange-500"
                                                )}
                                                placeholder="0.00"
                                            />
                                            {products.find(p => p.id === d.productId)?.unit === 'und' && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">Unds</span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => removeDerivation(index)}
                                        className="p-3 text-slate-600 hover:text-red-400 transition-colors"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            ))}

                            {derivations.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-20 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-3xl">
                                    <ArrowRight size={40} className="mb-4 opacity-10" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-center">Registra los pesos de las presas obtenidas para cargar al inventario</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between gap-6 items-center">
                            {!isAdmin && (
                                <div className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                    <Lock size={18} className="text-red-400" />
                                    <span className="text-[10px] text-red-400 font-black uppercase tracking-widest">Solo Administrador</span>
                                </div>
                            )}
                            <div className="flex items-center gap-4 ml-auto">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Peso Total Resultante</p>
                                    <p className="text-xl font-black text-white">
                                        {derivations.reduce((sum, d) => {
                                            const prod = products.find(p => p.id === d.productId);
                                            const w = (prod?.name.toLowerCase().includes('picada') || prod?.unit === 'und') ? (d.quantity * 0.475) : d.quantity;
                                            return sum + (w || 0);
                                        }, 0).toFixed(2)} Kg
                                    </p>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={
                                        (mode === 'purchase' ? (!purchaseId || !wholeChickenId || bulkQuantity <= 0) : (inputItems.length === 0)) || 
                                        derivations.length === 0 || 
                                        !isAdmin
                                    }
                                    className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-orange-600 disabled:opacity-30 transition-all active:scale-95 shadow-xl shadow-orange-500/10"
                                >
                                    <CheckCircle2 size={24} /> Guardar Despresaje
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="space-y-6 pt-12 border-t border-slate-200">
                <div className="flex items-center gap-2 text-slate-900">
                    <History size={24} className="text-slate-400" />
                    <h2 className="text-xl font-black uppercase tracking-tight">Historial de Despresajes (Control)</h2>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-5">Fecha</th>
                                    <th className="px-8 py-5">Factura Relacionada</th>
                                    <th className="px-8 py-5">Bruto Usado</th>
                                    <th className="px-8 py-5">Rendimiento (Presas)</th>
                                    <th className="px-8 py-5">Merma / Pérdida</th>
                                    {isAdmin && <th className="px-8 py-5 text-right whitespace-nowrap">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {processings.slice().reverse().map(p => {
                                    const purchase = purchases.find(pur => pur.id === p.purchaseId);
                                    const inputProd = products.find(prod => prod.id === p.inputProductId);
                                    
                                    const totalIn = p.inputItems && p.inputItems.length > 0 
                                        ? p.inputItems.reduce((sum, i) => sum + i.quantity, 0)
                                        : (p.inputQuantity || 0);

                                    const merma = totalIn - p.totalOutputWeight;

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 font-medium text-slate-600">{formatDate(p.date)}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{purchase?.supplierName || (p.inputItems ? 'Multiproducto' : 'Directo')}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {purchase ? `Ref: C-${(purchase.purchaseNumber || 0).toString().padStart(6, '0')}` : 'Manual'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{totalIn.toFixed(2)} Kg/Und</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                        {inputProd ? inputProd.name : `${p.inputItems?.length || 0} Insumos`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{p.totalOutputWeight.toFixed(2)} Kg/Und</span>
                                                    <div className="flex gap-1 flex-wrap mt-1">
                                                        {p.outputItems.slice(0, 3).map((oi, i) => {
                                                            const oProd = products.find(pr => pr.id === oi.productId);
                                                            return (
                                                                <span key={i} className="text-[8px] bg-slate-100 px-1 rounded font-bold text-slate-500 uppercase">
                                                                    {oProd?.name}: {oi.quantity}
                                                                </span>
                                                            );
                                                        })}
                                                        {p.outputItems.length > 3 && <span className="text-[8px] text-slate-400">...</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`font-bold ${merma > 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {merma.toFixed(2)} Kg
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-8 py-5 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleEdit(p)}
                                                            className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(p.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Scissors size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {processings.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-slate-300 italic font-medium">No hay registros de despresaje en el sistema</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Despresaje;
