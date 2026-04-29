import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Scissors, Package, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const Despresaje: React.FC = () => {
    const { products, processDespresaje } = useData();
    
    const [wholeChickenId, setWholeChickenId] = useState('');
    const [bulkQuantity, setBulkQuantity] = useState(0);
    const [derivations, setDerivations] = useState<{ productId: string, quantity: number }[]>([]);

    const wholeChickenOptions = products.filter(p => 
        p.unit === 'und' && p.stock > 0
    );

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

    const handleProcess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wholeChickenId || bulkQuantity <= 0 || derivations.length === 0) return;
        
        processDespresaje(wholeChickenId, bulkQuantity, derivations);
        
        // Reset
        setWholeChickenId('');
        setBulkQuantity(0);
        setDerivations([]);
        alert('Proceso de despresaje completado exitosamente.');
    };

    return (
        <div className="max-w-5xl space-y-8">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Módulo de Despresaje</h1>
                <p className="text-slate-500 font-medium tracking-tight italic">Transformación de pollo entero a presas y derivados.</p>
            </div>

            <form onSubmit={handleProcess} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Source Selection */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <Package size={20} />
                            </div>
                            <h3 className="font-bold uppercase text-sm tracking-widest">Insumo Base</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pollo Entero / Lote</label>
                                <select 
                                    required
                                    value={wholeChickenId}
                                    onChange={e => setWholeChickenId(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">Seleccionar Producto...</option>
                                    {wholeChickenOptions.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Stock: {p.stock})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad a Transformar</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    value={bulkQuantity}
                                    onChange={e => setBulkQuantity(parseFloat(e.target.value))}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                            <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                            <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                                El sistema restará automáticamente esta cantidad del stock del producto seleccionado.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transformations */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-xl flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2 text-white">
                                <div className="p-2 bg-slate-800 text-slate-400 rounded-lg">
                                    <Scissors size={20} />
                                </div>
                                <h3 className="font-bold uppercase text-sm tracking-widest">Productos Resultantes</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={addDerivation}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all uppercase tracking-widest"
                            >
                                <Plus size={16} /> Añadir Resultado
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            {derivations.map((d, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-800 rounded-2xl items-end relative group">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Producto Final</label>
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
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cantidad Obtenida</label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            required
                                            value={d.quantity}
                                            onChange={e => updateDerivation(index, 'quantity', parseFloat(e.target.value))}
                                            className="w-full p-3 bg-slate-700 border-none rounded-xl font-bold text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => removeDerivation(index)}
                                        className="p-3 text-slate-600 hover:text-red-400"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            ))}

                            {derivations.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-20 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-3xl">
                                    <ArrowRight size={40} className="mb-4 opacity-10" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Define los productos resultantes de la transformación</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800 flex justify-end gap-4 items-center">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Rendimiento</p>
                                <p className="text-xl font-black text-white">{derivations.reduce((sum, d) => sum + (d.quantity || 0), 0).toFixed(2)} Kg/Und</p>
                            </div>
                            <button 
                                type="submit"
                                disabled={!wholeChickenId || bulkQuantity <= 0 || derivations.length === 0}
                                className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-orange-600 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-orange-500/10"
                            >
                                <CheckCircle2 size={24} /> Procesar Transformación
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Despresaje;
