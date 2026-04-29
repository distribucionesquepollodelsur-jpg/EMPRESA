import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, ShoppingCart, Search, FileText, CheckCircle2, Edit2, DollarSign, CreditCard, User } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { format } from 'date-fns';
import { Product, SaleItem, Sale } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ProductRow: React.FC<{ product: Product; addToCart: (p: Product, q: number, pr: number) => void }> = ({ product, addToCart }) => {
    const [tempPrice, setTempPrice] = useState<number>(product.price);
    const [tempQty, setTempQty] = useState<number>(1);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-orange-500/30 hover:bg-orange-50/20 transition-all group gap-4">
            <div className="flex-1">
                <h4 className="font-bold text-slate-900 capitalize">{product.name}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sugerido: {formatCurrency(product.price)} · Stock: {product.stock} {product.unit}</p>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Vender a:</label>
                    <input 
                        type="number"
                        value={tempPrice}
                        onChange={e => setTempPrice(parseFloat(e.target.value))}
                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cant:</label>
                    <input 
                        type="number"
                        value={tempQty}
                        onChange={e => setTempQty(parseFloat(e.target.value))}
                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                </div>
                <button 
                    onClick={() => {
                        addToCart(product, tempQty, tempPrice);
                        setTempQty(1); // Reset quantity after adding
                    }}
                    className="mt-3 sm:mt-0 p-3 bg-white text-orange-500 rounded-xl shadow-sm border border-slate-200 hover:bg-orange-500 hover:text-white transition-all active:scale-90"
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>
    );
};

const Sales: React.FC = () => {
    const { products, sales, addSale, updateSale, deleteSale, addSalePayment, config } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Cart management
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');

    // Payment/Edit management
    const [paymentValue, setPaymentValue] = useState<number>(0);
    const [editCustomerName, setEditCustomerName] = useState('');
    const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'credit'>('cash');

    const addToCart = (product: Product, quantity: number, price: number) => {
        if (quantity <= 0) return;
        
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id && item.price === price);
            if (existing) {
                return prev.map(item => 
                    (item.productId === product.id && item.price === price)
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                );
            }
            return [...prev, { productId: product.id, quantity, price: price }];
        });
        setSearchTerm('');
    };

    const updateCartItem = (index: number, quantity: number, price: number) => {
        setCart(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], quantity, price };
            return copy;
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleConfirmSale = () => {
        if (cart.length === 0) return;
        const nextSaleNumber = (config.saleCounter || 0) + 1;
        
        addSale({ 
            items: cart, 
            total, 
            customerName: customerName || 'Venta Mostrador',
            paidAmount: paidAmount > 0 ? paidAmount : (paymentMethod === 'cash' ? total : 0),
            paymentMethod
        });
        
        // Generate PDF
        generateInvoice(cart, total, nextSaleNumber);
        
        setCart([]);
        setCustomerName('');
        setPaidAmount(0);
        setPaymentMethod('cash');
        setIsModalOpen(false);
    };

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSale || paymentValue <= 0) return;
        addSalePayment(selectedSale.id, paymentValue, 'Efectivo');
        setIsPaymentModalOpen(false);
        setPaymentValue(0);
        setSelectedSale(null);
    };

    const handleUpdateSale = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSale) return;
        updateSale(selectedSale.id, {
            customerName: editCustomerName,
            paymentMethod: editPaymentMethod
        });
        setIsEditModalOpen(false);
        setSelectedSale(null);
    };

    const generateInvoice = (items: SaleItem[], saleTotal: number, saleNumber?: number) => {
        const doc = new jsPDF({ format: [80, 200] });
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
        doc.setFont('helvetica', 'bold');
        doc.text(config.companyName.toUpperCase(), 40, y, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        y += 5;
        if (config.nit) {
            doc.text(`NIT: ${config.nit}`, 40, y, { align: 'center' });
            y += 4;
        }
        doc.text(`Tels: ${config.phone1}${config.phone2 ? ` / ${config.phone2}` : ''}`, 40, y, { align: 'center' });
        y += 4;
        doc.text(config.warehouseAddress || 'Dirección no asignada', 40, y, { align: 'center' });
        y += 4;
        doc.text(config.email, 40, y, { align: 'center' });
        
        y += 6;
        doc.setLineWidth(0.1);
        doc.line(margin, y, 80 - margin, y);
        
        y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURA DE VENTA', 40, y, { align: 'center' });
        y += 4;
        doc.text(`No. V-${(saleNumber || 0).toString().padStart(6, '0')}`, 40, y, { align: 'center' });
        
        y += 8;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const now = new Date();
        doc.text(`Fecha: ${format(now, 'dd/MM/yyyy')}`, margin, y);
        doc.text(`Hora: ${format(now, 'HH:mm:ss')}`, 80 - margin, y, { align: 'right' });
        y += 4;
        doc.text(`Cliente: ${customerName || 'Venta Mostrador'}`, margin, y);
        
        y += 6;
        doc.line(margin, y, 80 - margin, y);
        y += 5;
        
        // Table Header
        doc.setFont('helvetica', 'bold');
        doc.text('Cant.', margin, y);
        doc.text('Producto', margin + 10, y);
        doc.text('Total', 80 - margin, y, { align: 'right' });
        y += 3;
        
        // Items
        doc.setFont('helvetica', 'normal');
        items.forEach(item => {
            const p = products.find(prod => prod.id === item.productId);
            y += 5;
            doc.text(`${item.quantity}`, margin, y);
            
            const name = p?.name || 'Producto';
            const splitName = doc.splitTextToSize(name, 40);
            doc.text(splitName, margin + 10, y);
            
            doc.text(`${formatCurrency(item.quantity * item.price)}`, 80 - margin, y, { align: 'right' });
            
            if (splitName.length > 1) y += (splitName.length - 1) * 3;
        });
        
        y += 8;
        doc.line(margin, y, 80 - margin, y);
        y += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', margin, y);
        doc.text(formatCurrency(saleTotal), 80 - margin, y, { align: 'right' });
        
        y += 10;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });
        y += 4;
        doc.text('Este documento es un comprobante de venta.', 40, y, { align: 'center' });
        
        doc.save(`Venta_${saleNumber || Date.now()}.pdf`);
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Estado</th>
                                <th className="px-8 py-5">Total</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales.slice().reverse().map(sale => {
                                const balance = sale.total - sale.paidAmount;
                                const isPaid = balance <= 0;

                                return (
                                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 font-mono text-xs text-slate-500">#{sale.id.slice(0, 8)}</td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-900">{sale.customerName}</td>
                                        <td className="px-8 py-5 text-sm text-slate-600">{formatDate(sale.date)}</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                isPaid ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                {isPaid ? 'Pagado' : `Saldo: ${formatCurrency(balance)}`}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(sale.total)}</td>
                                        <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setSelectedSale(sale);
                                                    setPaymentValue(0);
                                                    setIsPaymentModalOpen(true);
                                                }}
                                                className="text-slate-400 hover:text-green-600 p-2 transition-colors"
                                                title="Abonar"
                                            >
                                                <DollarSign size={18} />
                                            </button>
                                            {user?.role === 'admin' && (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedSale(sale);
                                                            setEditCustomerName(sale.customerName || '');
                                                            setEditPaymentMethod(sale.paymentMethod || 'cash');
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="text-slate-400 hover:text-blue-600 p-2 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if(window.confirm('¿Eliminar venta? Se restaurará el inventario.')) deleteSale(sale.id);
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => generateInvoice(sale.items, sale.total)}
                                                className="text-slate-400 hover:text-orange-500 p-2 transition-colors"
                                                title="Ver Factura"
                                            >
                                                <FileText size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                        <ProductRow key={p.id} product={p} addToCart={addToCart} />
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
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                                                paymentMethod === 'cash' 
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-orange-500/30'
                                            }`}
                                        >
                                            <DollarSign size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Contado</span>
                                        </button>
                                        <button 
                                            onClick={() => setPaymentMethod('credit')}
                                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                                                paymentMethod === 'credit' 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-blue-500/30'
                                            }`}
                                        >
                                            <CreditCard size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Crédito</span>
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Referencia</label>
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del Cliente..."
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            {paymentMethod === 'cash' ? 'Monto Recibido' : 'Cuota Inicial'}
                                        </label>
                                        <input 
                                            type="number" 
                                            placeholder="Monto..."
                                            value={paidAmount || ''}
                                            onChange={e => setPaidAmount(parseFloat(e.target.value))}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-black text-sm text-green-600"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {cart.map((item, idx) => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return (
                                            <div key={`${item.productId}-${idx}`} className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 group">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-slate-900">{p?.name}</span>
                                                    <button 
                                                        onClick={() => removeFromCart(idx)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cant.</label>
                                                        <input 
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={e => updateCartItem(idx, parseFloat(e.target.value), item.price)}
                                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio</label>
                                                        <input 
                                                            type="number"
                                                            value={item.price}
                                                            onChange={e => updateCartItem(idx, item.quantity, parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div className="text-right min-w-[80px]">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subtotal</label>
                                                        <p className="font-bold text-sm text-slate-900">{formatCurrency(item.quantity * item.price)}</p>
                                                    </div>
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

            {isPaymentModalOpen && selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Registrar Abono</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight italic">Venta #{selectedSale.id.slice(0, 8)} · {selectedSale.customerName}</p>
                        </header>

                        <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Total Factura</span>
                                <span className="text-slate-900">{formatCurrency(selectedSale.total)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Pagado hasta hoy</span>
                                <span className="text-green-600">{formatCurrency(selectedSale.paidAmount)}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-sm font-black text-slate-900 uppercase">Saldo Pendiente</span>
                                <span className="text-xl font-black text-red-600">{formatCurrency(selectedSale.total - selectedSale.paidAmount)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleAddPayment} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Monto del Abono</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1"
                                    max={selectedSale.total - selectedSale.paidAmount}
                                    value={paymentValue || ''}
                                    onChange={e => setPaymentValue(parseFloat(e.target.value))}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-black text-green-600 text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-green-600/20 active:scale-95 transition-all">
                                    Confirmar Abono
                                </button>
                                <button type="button" onClick={() => { setIsPaymentModalOpen(false); setSelectedSale(null); }} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditModalOpen && selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Editar Venta</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight italic">Ref: #{selectedSale.id.slice(0, 8)}</p>
                        </header>

                        <form onSubmit={handleUpdateSale} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Cliente / Referencia</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        required 
                                        value={editCustomerName}
                                        onChange={e => setEditCustomerName(e.target.value)}
                                        className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Método de Pago</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setEditPaymentMethod('cash')}
                                        className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                                            editPaymentMethod === 'cash' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-100 text-slate-400'
                                        }`}
                                    >
                                        Contado
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditPaymentMethod('credit')}
                                        className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                                            editPaymentMethod === 'credit' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'
                                        }`}
                                    >
                                        Crédito
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                    Guardar Cambios
                                </button>
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setSelectedSale(null); }} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
