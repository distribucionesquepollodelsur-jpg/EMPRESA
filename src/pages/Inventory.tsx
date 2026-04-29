import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Search, Edit2, Trash2, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Product, Unit } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Inventory: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, config } = useData();
    const { user } = useAuth();
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

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            updateProduct(editingProduct.id, { name, unit, price, cost, stock });
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
            head: [['Producto', 'Unidad', 'Stock', 'Costo', 'Venta', 'Valor Total']],
            body: products.map(p => [
                p.name,
                p.unit.toUpperCase(),
                `${p.stock} ${p.unit}`,
                formatCurrency(p.cost),
                formatCurrency(p.price),
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Control de Inventario</h1>
                    <p className="text-slate-500 text-sm">Gestiona tus productos y existencias</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={generateInventoryReport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <FileText size={18} />
                        Reporte PDF
                    </button>
                    {user?.role === 'admin' && (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            Nuevo Producto
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Productos</p>
                            <h3 className="text-2xl font-bold text-slate-900">{products.length}</h3>
                        </div>
                    </div>
                </div>
                {/* More stats can go here */}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Costo</th>
                                <th className="px-6 py-4">Precio Venta</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium uppercase">
                                            {p.unit}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "font-bold",
                                                p.stock <= 5 ? "text-red-500" : "text-green-600"
                                            )}>
                                                {p.stock.toFixed(2)}
                                            </span>
                                            {p.stock <= 5 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">BAJO</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{formatCurrency(p.cost)}</td>
                                    <td className="px-6 py-4 text-slate-900 font-medium">{formatCurrency(p.price)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {user?.role === 'admin' ? (
                                            <>
                                                <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Solo Lectura</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h2 className="text-xl font-bold mb-6">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                                    <select 
                                    value={unit} 
                                    onChange={e => setUnit(e.target.value as Unit)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-[42px]"
                                >
                                    <option value="kg">Kilogramos (kg)</option>
                                    <option value="und">Unidades (und)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {editingProduct ? 'Ajustar Stock Actual' : 'Stock Inicial'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={editingProduct ? stock : initialStock} 
                                    onChange={e => editingProduct ? setStock(parseFloat(e.target.value)) : setInitialStock(parseFloat(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-600"
                                />
                            </div>
                        </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
                                    <input 
                                        type="number" 
                                        value={cost} 
                                        onChange={e => setCost(parseFloat(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio de Venta</label>
                                    <input 
                                        type="number" 
                                        value={price} 
                                        onChange={e => setPrice(parseFloat(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-6 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    className="flex-1 py-2 px-4 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
                                >
                                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
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
