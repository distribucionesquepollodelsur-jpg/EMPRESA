import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Search, Edit2, Trash2, ArrowUpRight, ArrowDownRight, FileText, History, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { Product, Unit } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Inventory: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, config, isInventoryRequired, verifyInventory, inventoryLogs } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || [
        'distribucionesquepollodelsur@gmail.com',
        'alex.b19h@gmail.com',
        'alex@quepollo.com',
        'admin@quepollo.com'
    ].includes(user?.email || '');
    const [activeTab, setActiveTab] = useState<'products' | 'audit'>('products');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [unit, setUnit] = useState<Unit>('kg');
    const [price, setPrice] = useState(0);
    const [cost, setCost] = useState(0);
    const [stock, setStock] = useState(0);
    const [initialStock, setInitialStock] = useState(0);
    const [adjustmentReason, setAdjustmentReason] = useState('');

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            updateProduct(editingProduct.id, { name, unit, price, cost, stock }, adjustmentReason || 'Corrección manual de stock', user?.name);
        } else {
            addProduct({ name, unit, price, cost, stock: initialStock, initialStock });
        }
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setUnit('kg');
        setPrice(0);
        setCost(0);
        setStock(0);
        setInitialStock(0);
        setAdjustmentReason('');
        setEditingProduct(null);
        setIsModalOpen(false);
    };

    const handleEdit = (p: Product) => {
        setEditingProduct(p);
        setName(p.name);
        setUnit(p.unit);
        setPrice(p.price);
        setCost(p.cost);
        setStock(p.stock);
        setIsModalOpen(true);
    };

    const generateInventoryReport = () => {
        const doc = new jsPDF();
        let y = 20;

        if (config.logo) {
            try {
                doc.addImage(config.logo, 'PNG', 14, 10, 30, 30);
                y = 45;
            } catch (e) {
                console.error("Error adding logo to PDF", e);
            }
        }

        doc.setFontSize(18);
        doc.text('Reporte de Inventario', config.logo ? 50 : 14, y - 5);
        doc.setFontSize(10);
        doc.text(`Empresa: ${config.companyName}`, config.logo ? 50 : 14, y + 2);
        doc.text(`NIT: ${config.nit}`, config.logo ? 50 : 14, y + 8);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, config.logo ? 50 : 14, y + 14);

        y += 25;
        autoTable(doc, {
            head: [['Producto', 'Unidad', 'Stock', 'Costo', 'Valor Total']],
            body: products.map(p => [
                p.name,
                p.unit.toUpperCase(),
                `${p.stock} ${p.unit}`,
                formatCurrency(p.cost),
                formatCurrency(p.stock * p.cost)
            ]),
            startY: y,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`inventario-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            {isInventoryRequired() && (
                <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border-l-8 border-l-red-500 animate-pulse">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
                            <CheckCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Verificación Obligatoria</h3>
                            <p className="text-sm text-slate-500 font-medium">Confirma que el stock físico coincide con el sistema para habilitar operaciones.</p>
                        </div>
                    </div>
                    <button 
                        onClick={async () => {
                            if (window.confirm('¿Confirmas que has verificado el stock físico de todos los productos?')) {
                                try {
                                    await verifyInventory();
                                    alert('Inventario verificado exitosamente.');
                                } catch (e) {
                                    alert('Error al verificar inventario. Verifique su conexión y permisos.');
                                }
                            }
                        }}
                        className="w-full md:w-auto px-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        Verificar Ahora <CheckCircle size={16} />
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Inventario & Existencias</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Control total de stock y auditoría</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={generateInventoryReport}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-widest shadow-sm"
                    >
                        <FileText size={16} />
                        Reporte PDF
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg font-black text-xs uppercase tracking-widest hover:scale-[1.02]"
                        >
                            <Plus size={16} />
                            Nuevo Producto
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('products')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'products' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Productos
                </button>
                <button 
                    onClick={() => setActiveTab('audit')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'audit' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Historial / Auditoría
                </button>
            </div>

            {activeTab === 'products' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-zinc-900 text-white rounded-2xl shadow-inner">
                                <Package size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Catálogo</p>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{products.length} <span className="text-xs text-slate-400">Refs</span></h3>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                                <Search size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Bajo Stock</p>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{products.filter(p => p.stock <= 5).length} <span className="text-xs text-slate-400">Items</span></h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden pb-4">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text"
                                    placeholder="BUSCAR EN EL INVENTARIO..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-xs font-bold uppercase"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                        <th className="px-8 py-5">Nombre / Categoria</th>
                                        <th className="px-8 py-5">Stock / Unidad</th>
                                        <th className="px-8 py-5">Costo Unitario</th>
                                        <th className="px-8 py-5">Valorización</th>
                                        <th className="px-8 py-5 text-right">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium">
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 uppercase">{p.name}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{p.category || 'General'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "px-4 py-2 rounded-xl border-2 flex flex-col items-center min-w-[80px]",
                                                        p.stock <= 5 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
                                                    )}>
                                                        <span className={cn(
                                                            "text-sm font-black tracking-tighter leading-none",
                                                            p.stock <= 5 ? "text-red-600" : "text-green-600"
                                                        )}>
                                                            {p.stock.toFixed(2)}
                                                        </span>
                                                        <span className="text-[9px] font-black uppercase opacity-60">{p.unit}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-black text-slate-600">{formatCurrency(p.cost)}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-black text-slate-900">{formatCurrency(p.stock * p.cost)}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {isAdmin ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEdit(p)} 
                                                                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if(window.confirm('¿Eliminar producto?')) deleteProduct(p.id)
                                                                }} 
                                                                className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[8px] font-black uppercase text-slate-300">Solo Ver</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/20">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <Clock className="text-zinc-400" /> Historial de Cambios Manuales
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Auditabilidad de existencias</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                    <th className="px-8 py-5">Fecha / Hora</th>
                                    <th className="px-8 py-5">Producto</th>
                                    <th className="px-8 py-5">Ajuste de Stock</th>
                                    <th className="px-8 py-5">Motivo / Responsable</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium">
                                {[...inventoryLogs]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900">{formatDate(log.date)}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(log.date).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-900 uppercase">{log.productName}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-400 italic line-through">{log.oldStock}</span>
                                                <ArrowUpRight size={14} className={log.newStock > log.oldStock ? "text-green-500" : "text-red-500 rotate-90"} />
                                                <span className={cn(
                                                    "text-sm font-black",
                                                    log.newStock > log.oldStock ? "text-green-600" : "text-red-600"
                                                )}>{log.newStock}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg w-fit mb-1">{log.reason}</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Edit2 size={10} /> {log.userName || 'Sistema'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {inventoryLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center italic text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                            No hay registros de auditoría aún
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                    {editingProduct ? 'Ajustar Producto' : 'Nuevo Producto'}
                                </h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración técnica de existencia</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 text-zinc-900 shadow-sm">
                                <Package size={24} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nombre Descriptivo</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none text-xs font-black uppercase text-slate-900"
                                        placeholder="EJ: POLLO ENTERO..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cálculo por</label>
                                        <select 
                                            value={unit} 
                                            onChange={e => setUnit(e.target.value as Unit)}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-black uppercase text-slate-900 h-[52px]"
                                        >
                                            <option value="kg">Kilogramos</option>
                                            <option value="und">Unidades</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block text-orange-500 flex items-center gap-2">
                                            Stock <span className="text-[8px] bg-orange-100 px-1.5 py-0.5 rounded italic">Manual</span>
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required
                                            value={editingProduct ? stock : initialStock} 
                                            onChange={e => editingProduct ? setStock(parseFloat(e.target.value)) : setInitialStock(parseFloat(e.target.value))}
                                            className="w-full px-6 py-4 bg-orange-50 border border-orange-100 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none font-black text-lg text-orange-600"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Costo de Compra</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required
                                            value={cost} 
                                            onChange={e => setCost(parseFloat(e.target.value))}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none text-xs font-black uppercase text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Precio de Venta</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required
                                            value={price} 
                                            onChange={e => setPrice(parseFloat(e.target.value))}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-100 outline-none text-xs font-black uppercase text-slate-900"
                                        />
                                    </div>
                                </div>

                                {editingProduct && (
                                    <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 border-dashed">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Justificación del Cambio de Stock</label>
                                        <textarea 
                                            required
                                            value={adjustmentReason}
                                            onChange={e => setAdjustmentReason(e.target.value)}
                                            placeholder="¿POR QUÉ SE CAMBIA EL STOCK FUERA DE UNA VENTA/COMPRA? (EJ: DESPERDICIO, AJUSTE FÍSICO...)"
                                            className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-zinc-100 outline-none text-[10px] font-bold uppercase min-h-[80px]"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    className="flex-1 py-5 px-6 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                                >
                                    Descartar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-3 py-5 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                                >
                                    {editingProduct ? 'Aplicar Ajustes' : 'Registrar Ref'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
