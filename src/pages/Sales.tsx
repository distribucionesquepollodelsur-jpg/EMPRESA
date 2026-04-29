import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Trash2, ShoppingCart, Search, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { Product, SaleItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Sales: React.FC = () => {
    const { products, sales, addSale, config } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Cart management
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [paidAmount, setPaidAmount] = useState<number>(0);

    const addToCart = (product: Product, quantity: number) => {
        if (quantity <= 0) return;
        if (quantity > product.stock) {
            alert(`No hay suficiente stock. Disponible: ${product.stock}`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => 
                    item.productId === product.id 
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                );
            }
            return [...prev, { productId: product.id, quantity, price: product.price }];
        });
        setSearchTerm('');
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleConfirmSale = () => {
        if (cart.length === 0) return;
        addSale({ 
            items: cart, 
            total, 
            customerName: customerName || 'Venta Mostrador',
            paidAmount: paidAmount > 0 ? paidAmount : (customerName ? 0 : total) 
        });
        
        // Generate PDF
        generateInvoice(cart, total);
        
        setCart([]);
        setCustomerName('');
        setPaidAmount(0);
        setIsModalOpen(false);
    };

    const generateInvoice = (items: SaleItem[], saleTotal: number) => {
        const doc = new jsPDF({ format: [80, 150] }); // Thermal printer style
        const margin = 5;
        let y = 10;
        
        if (config.logo) {
            try {
                doc.addImage(config.logo, 'PNG', 30, y, 20, 20);
                y += 25;
            } catch (e) {
                console.error("Error adding logo to PDF", e);
            }
        }
        
        doc.setFontSize(10);
        doc.text(config.companyName, 40, y, { align: 'center' });
        y += 5;
        doc.setFontSize(8);
        doc.text(`NIT: ${config.nit}`, 40, y, { align: 'center' });
        y += 5;
        doc.text(`Fecha: ${formatDate(new Date())}`, 40, y, { align: 'center' });
        y += 5;
        doc.text('------------------------------------------', 40, y, { align: 'center' });

        y += 5;
        doc.text('Producto', margin, y);
        doc.text('Cant.', 45, y);
        doc.text('Subtotal', 65, y);
        y += 5;

        items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            doc.text(`${product?.name.substring(0, 15)}`, margin, y);
            doc.text(`${item.quantity}`, 45, y);
            doc.text(`${(item.quantity * item.price).toLocaleString()}`, 65, y);
            y += 5;
        });

        y += 5;
        doc.text('------------------------------------------', 40, y, { align: 'center' });
        y += 5;
        doc.setFontSize(10);
        doc.text(`TOTAL: ${formatCurrency(saleTotal)}`, margin, y);
        
        y += 10;
        doc.setFontSize(8);
        doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });

        doc.save(`venta-${Date.now()}.pdf`);
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0
    );

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
                    <p className="text-slate-500 text-sm">Gestiona ventas y facturación en tiempo real</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                    <Plus size={20} /> Nueva Venta
                </button>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Referencia</th>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Productos</th>
                                <th className="px-8 py-5">Total</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 font-mono text-xs text-slate-500">#{sale.id.slice(0, 8)}</td>
                                    <td className="px-8 py-5 text-sm text-slate-600">{formatDate(sale.date)}</td>
                                    <td className="px-8 py-5 text-sm text-slate-600">
                                        {sale.items.length}Items
                                    </td>
                                    <td className="px-8 py-5 font-bold text-slate-900">{formatCurrency(sale.total)}</td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => generateInvoice(sale.items, sale.total)}
                                            className="text-slate-400 hover:text-orange-500 p-2 transition-colors"
                                        >
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sales.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-300 italic">No hay ventas registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                                <ShoppingCart className="text-orange-500" /> Nuevo Registro de Venta
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                Cerrar Ventana
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Product selection */}
                            <div className="flex-1 p-6 border-r border-slate-100 flex flex-col gap-6">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por nombre de producto..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                                    />
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-orange-500/30 hover:bg-orange-50/20 transition-all group">
                                            <div>
                                                <h4 className="font-bold text-slate-900 capitalize">{p.name}</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{formatCurrency(p.price)} · Stock: {p.stock} {p.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => addToCart(p, 1)}
                                                    className="p-3 bg-white text-orange-500 rounded-xl shadow-sm border border-slate-200 group-hover:bg-orange-500 group-hover:text-white transition-all active:scale-90"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cart display */}
                            <div className="w-full lg:w-[400px] bg-slate-50/50 p-6 flex flex-col gap-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    Resumen del Carrito
                                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{cart.length} productos</span>
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Referencia (Opcional)</label>
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del Cliente..."
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm"
                                        />
                                    </div>
                                    {customerName && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Abonado (Dejar 0 para Crédito Total)</label>
                                            <input 
                                                type="number" 
                                                placeholder="Abono..."
                                                value={paidAmount || ''}
                                                onChange={e => setPaidAmount(parseFloat(e.target.value))}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-black text-sm text-green-600"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {cart.map(item => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return (
                                            <div key={item.productId} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-900">{p?.name}</span>
                                                    <span className="text-xs text-slate-400">{item.quantity} x {formatCurrency(item.price)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-sm text-slate-900">{formatCurrency(item.quantity * item.price)}</span>
                                                    <button 
                                                        onClick={() => removeFromCart(item.productId)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {cart.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                                            <ShoppingCart size={48} strokeWidth={1} />
                                            <p className="text-sm font-bold uppercase tracking-widest italic">Carrito Vacío</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-slate-200 space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Total a Pagar</span>
                                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(total)}</span>
                                    </div>
                                    <button 
                                        onClick={handleConfirmSale}
                                        disabled={cart.length === 0}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                                    >
                                        <CheckCircle2 size={24} /> Confirmar Venta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
