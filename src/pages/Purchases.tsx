import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, ShoppingCart, Search, FileText, CheckCircle2, User, Phone, Wallet, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { PurchaseItem, Purchase } from '../types';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const Purchases: React.FC = () => {
    const { products, purchases, addPurchase, suppliers, config } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [supplierId, setSupplierId] = useState<string>('');
    const [isNewSupplier, setIsNewSupplier] = useState(false);
    const [supplierName, setSupplierName] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);

    const { addSupplier } = useData();

    const addToItems = (productId: string, cost: number) => {
        setItems(prev => {
            const existing = prev.find(i => i.productId === productId);
            if (existing) {
                return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { productId, quantity: 1, cost }];
        });
    };

    const updateItemQuantity = (productId: string, quantity: number) => {
        setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
    };

    const removeItem = (productId: string) => {
        setItems(prev => prev.filter(i => i.productId !== productId));
    };

    const total = items.reduce((sum, i) => sum + (i.cost * i.quantity), 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;
        
        let finalSupplierName = supplierName;
        let finalSupplierPhone = supplierPhone;

        if (!isNewSupplier && supplierId) {
            const selected = suppliers.find(s => s.id === supplierId);
            if (selected) {
                finalSupplierName = selected.name;
                finalSupplierPhone = selected.phone;
            }
        } else if (isNewSupplier && supplierName) {
            // Check if supplier already exists with same name
            const existing = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
            if (!existing) {
                // Automatically add new supplier to the system
                addSupplier({
                    name: supplierName,
                    phone: supplierPhone,
                    address: '',
                    nit: '',
                    initialDebt: 0
                });
            }
        }

        if (!finalSupplierName) return;

        let finalPaid = total;
        if (paymentMethod === 'credit') {
            finalPaid = paidAmount;
        }

        const nextPurchaseNumber = (config.purchaseCounter || 0) + 1;

        addPurchase({
            supplierName: finalSupplierName,
            supplierPhone: finalSupplierPhone,
            paymentMethod,
            items,
            total,
            paidAmount: finalPaid
        });

        generatePurchaseInvoice({
            id: 'TEMP',
            purchaseNumber: nextPurchaseNumber,
            supplierName: finalSupplierName,
            supplierPhone: finalSupplierPhone,
            paymentMethod,
            items,
            total,
            paidAmount: finalPaid,
            date: new Date().toISOString()
        });

        resetForm();
    };

    const generatePurchaseInvoice = (purchase: Purchase) => {
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
        doc.text('FACTURA DE COMPRA', 40, y, { align: 'center' });
        y += 4;
        doc.text(`No. C-${(purchase.purchaseNumber || 0).toString().padStart(6, '0')}`, 40, y, { align: 'center' });
        
        y += 8;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const purchaseDate = new Date(purchase.date);
        doc.text(`Fecha: ${format(purchaseDate, 'dd/MM/yyyy')}`, margin, y);
        doc.text(`Hora: ${format(purchaseDate, 'HH:mm:ss')}`, 80 - margin, y, { align: 'right' });
        y += 4;
        doc.text(`Proveedor: ${purchase.supplierName}`, margin, y);
        
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
        purchase.items.forEach(item => {
            const p = products.find(prod => prod.id === item.productId);
            y += 5;
            doc.text(`${item.quantity}`, margin, y);
            
            const name = p?.name || 'Producto';
            const splitName = doc.splitTextToSize(name, 40);
            doc.text(splitName, margin + 10, y);
            
            doc.text(`${formatCurrency(item.quantity * item.cost)}`, 80 - margin, y, { align: 'right' });
            
            if (splitName.length > 1) y += (splitName.length - 1) * 3;
        });
        
        y += 8;
        doc.line(margin, y, 80 - margin, y);
        y += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', margin, y);
        doc.text(formatCurrency(purchase.total), 80 - margin, y, { align: 'right' });
        
        y += 10;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('Comprobante de ingreso de mercancía', 40, y, { align: 'center' });
        
        doc.save(`Compra_${purchase.purchaseNumber || Date.now()}.pdf`);
    };

    const resetForm = () => {
        setSupplierId('');
        setIsNewSupplier(false);
        setSupplierName('');
        setSupplierPhone('');
        setPaidAmount(0);
        setPaymentMethod('cash');
        setItems([]);
        setIsModalOpen(false);
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Compras (Gastos)</h1>
                    <p className="text-slate-500 text-sm">Registro de mercancía y proveedores</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                    <Plus size={20} /> Registrar Compra
                </button>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Proveedor</th>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Items</th>
                                <th className="px-8 py-5">Total</th>
                                <th className="px-8 py-5">Método</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {purchases.slice().reverse().map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{p.supplierName}</span>
                                            <span className="text-xs text-slate-400">Ref: C-{(p.purchaseNumber || 0).toString().padStart(6, '0')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{formatDate(p.date)}</td>
                                    <td className="px-8 py-5 text-sm text-slate-600">{p.items.length}</td>
                                    <td className="px-8 py-5 font-bold text-red-600">{formatCurrency(p.total)}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                            {p.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => generatePurchaseInvoice(p)}
                                            className="text-slate-400 hover:text-blue-600 p-2 transition-colors"
                                            title="Ver Factura"
                                        >
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-300 italic">No hay compras registradas</td>
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
                                <ShoppingCart className="text-blue-500" /> Registro de Compra a Proveedor
                            </h2>
                            <button onClick={resetForm} className="text-slate-400 hover:text-red-500 transition-colors">
                                Cancelar Registro
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                                <User size={14} /> Proveedor
                                            </label>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsNewSupplier(!isNewSupplier);
                                                    setSupplierId('');
                                                    setSupplierName('');
                                                    setSupplierPhone('');
                                                }}
                                                className="text-[10px] font-bold text-blue-600 hover:underline"
                                            >
                                                {isNewSupplier ? 'Seleccionar Existente' : '+ Nuevo Proveedor'}
                                            </button>
                                        </div>
                                        
                                        {!isNewSupplier ? (
                                            <select 
                                                required 
                                                value={supplierId}
                                                onChange={e => {
                                                    const id = e.target.value;
                                                    setSupplierId(id);
                                                    const selected = suppliers.find(s => s.id === id);
                                                    if (selected) {
                                                        setSupplierPhone(selected.phone);
                                                        setSupplierName(selected.name);
                                                    }
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold appearance-none mb-1"
                                            >
                                                <option value="">Seleccione un proveedor...</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="Nombre del Nuevo Proveedor"
                                                value={supplierName}
                                                onChange={e => setSupplierName(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                            <Phone size={14} /> Teléfono
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Opcional"
                                            value={supplierPhone}
                                            onChange={e => setSupplierPhone(e.target.value)}
                                            readOnly={!isNewSupplier && !!supplierId}
                                            className={cn(
                                                "w-full px-4 py-3 border rounded-xl outline-none transition-all",
                                                !isNewSupplier && !!supplierId ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Seleccionar Productos</h3>
                                        <div className="relative w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Filtrar..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-slate-100 border-none rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {filteredProducts.map(p => (
                                            <button 
                                                key={p.id}
                                                type="button"
                                                onClick={() => addToItems(p.id, p.cost)}
                                                className="p-3 text-left bg-white border border-slate-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all flex flex-col group"
                                            >
                                                <span className="font-bold text-slate-900 text-sm capitalize">{p.name}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Costo: {formatCurrency(p.cost)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-[400px] bg-slate-50 border-l border-slate-100 p-8 flex flex-col gap-8">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resumen de Carga</h3>

                                <div className="flex-1 overflow-y-auto space-y-3">
                                    {items.map(item => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return (
                                            <div key={item.productId} className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-slate-900">{p?.name}</span>
                                                    <button type="button" onClick={() => removeItem(item.productId)} className="text-slate-300 hover:text-red-500">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Cantidad ({p?.unit})</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            value={item.quantity}
                                                            onChange={e => updateItemQuantity(item.productId, parseFloat(e.target.value))}
                                                            className="w-full bg-slate-50 border-none rounded p-2 text-sm font-bold outline-none"
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Subtotal</label>
                                                        <span className="text-sm font-bold text-slate-900">{formatCurrency(item.quantity * item.cost)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-10">
                                            <p className="text-sm">No hay items seleccionados</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                            <Wallet size={14} /> Método de Pago
                                        </label>
                                        <select 
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value as any)}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                                        >
                                            <option value="cash">Efectivo</option>
                                            <option value="transfer">Transferencia</option>
                                            <option value="credit">Crédito / Cuenta por Pagar</option>
                                        </select>
                                    </div>

                                    {paymentMethod === 'credit' && (
                                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Abono Inicial (Opcional)</label>
                                            <input 
                                                type="number" 
                                                placeholder="¿Cuánto pagaste hoy?"
                                                value={paidAmount || ''}
                                                onChange={e => setPaidAmount(parseFloat(e.target.value))}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-blue-600"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-slate-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Compra</span>
                                            <span className="text-2xl font-black text-slate-900">{formatCurrency(total)}</span>
                                        </div>
                                        <button 
                                            type="submit"
                                            disabled={items.length === 0 || !supplierName}
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                                        >
                                            <CheckCircle2 size={24} /> Confirmar Compra
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchases;
