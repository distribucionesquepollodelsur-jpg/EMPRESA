import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Scissors, Package, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Plus, Lock, Search, History, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { format } from 'date-fns';

const Despresaje: React.FC = () => {
    const { products, purchases, processings, addProcessing } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    
    const [purchaseId, setPurchaseId] = useState('');
    const [wholeChickenId, setWholeChickenId] = useState('');
    const [bulkQuantity, setBulkQuantity] = useState(0);
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

    const availableDerivations = products.filter(p => p.id !== wholeChickenId);

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
        if (!purchaseId || !wholeChickenId || bulkQuantity <= 0 || derivations.length === 0) return;
        
        try {
            await addProcessing({
                purchaseId,
                inputProductId: wholeChickenId,
                inputQuantity: bulkQuantity,
                outputItems: derivations,
                totalOutputWeight: derivations.reduce((sum, d) => sum + (d.quantity || 0), 0)
            });
            
            // Reset
            setPurchaseId('');
            setWholeChickenId('');
            setBulkQuantity(0);
            setDerivations([]);
            alert('Proceso de despresaje completado exitosamente y relacionado a la factura seleccionada.');
        } catch (error) {
            console.error("Processing failed:", error);
            alert("Error al procesar el despresaje.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Módulo de Despresaje</h1>
                    <p className="text-slate-500 font-medium tracking-tight italic">Relacione facturas de compra con la transformación de productos.</p>
                </div>
            </div>

            <form onSubmit={handleProcess} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Source Selection - Column 1-4 */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <h3 className="font-bold uppercase text-sm tracking-widest">Origen: Factura de Compra</h3>
                        </div>

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
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad a Usar de esta Factura</label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            required
                                            value={bulkQuantity || ''}
                                            onChange={e => setBulkQuantity(e.target.value ? parseFloat(e.target.value) : 0)}
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                            <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                            <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                                El sistema vinculará este despresaje a la factura seleccionada para el control de inventario.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transformations - Column 5-12 */}
                <div className="lg:col-span-8 space-y-6 flex flex-col">
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
                                    <div className="w-full sm:w-32">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Peso/Cant.</label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            required
                                            value={d.quantity || ''}
                                            onChange={e => updateDerivation(index, 'quantity', e.target.value ? parseFloat(e.target.value) : 0)}
                                            className="w-full p-3 bg-slate-700 border-none rounded-xl font-bold text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                                            placeholder="0.00"
                                        />
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
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Rendimiento</p>
                                    <p className="text-xl font-black text-white">{derivations.reduce((sum, d) => sum + (d.quantity || 0), 0).toFixed(2)} Kg/Und</p>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!purchaseId || !wholeChickenId || bulkQuantity <= 0 || derivations.length === 0 || !isAdmin}
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {processings.slice().reverse().map(p => {
                                    const purchase = purchases.find(pur => pur.id === p.purchaseId);
                                    const inputProd = products.find(prod => prod.id === p.inputProductId);
                                    const merma = p.inputQuantity - p.totalOutputWeight;

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 font-medium text-slate-600">{formatDate(p.date)}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{purchase?.supplierName || 'Desconocido'}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">Ref: C-{(purchase?.purchaseNumber || 0).toString().padStart(6, '0')}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{p.inputQuantity.toFixed(2)} {inputProd?.unit || 'Kg'}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{inputProd?.name}</span>
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
