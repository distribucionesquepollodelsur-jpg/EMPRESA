import React from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, cn } from '../lib/utils';
import { 
    X, 
    Calendar,
    TrendingUp, 
    TrendingDown, 
    ShoppingBag, 
    ShoppingCart,
    ArrowRightLeft,
    Clock,
    FileText,
    Users,
    Package,
    Download
} from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DailyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose }) => {
    const { sales, purchases, cashFlow, customers, processings, config } = useData();

    if (!isOpen) return null;

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // Filters
    const todaySales = sales.filter(s => {
        const date = new Date(s.date);
        return isWithinInterval(date, { start, end });
    });

    const todayPurchases = purchases.filter(p => {
        const date = new Date(p.date);
        return isWithinInterval(date, { start, end });
    });

    const todayCashFlow = cashFlow.filter(m => {
        const date = new Date(m.date);
        return isWithinInterval(date, { start, end });
    });

    // Detailed Categories for Sales
    const salesCash = todaySales.filter(s => s.paymentMethod === 'cash');
    const salesCredit = todaySales.filter(s => s.paymentMethod === 'credit');
    const salesTransfer = todaySales.filter(s => s.paymentMethod === 'transfer');
    const salesMixed = todaySales.filter(s => s.paymentMethod === 'mixed');
    const salesBalance = todaySales.filter(s => s.paymentMethod === 'balance');

    const totalSalesCash = salesCash.reduce((sum, s) => sum + s.total, 0);
    const totalSalesCredit = salesCredit.reduce((sum, s) => sum + s.total, 0);
    const totalSalesTransfer = salesTransfer.reduce((sum, s) => sum + s.total, 0);
    const totalSalesMixed = salesMixed.reduce((sum, s) => sum + s.total, 0);
    const totalSalesBalance = salesBalance.reduce((sum, s) => sum + s.total, 0);

    // Totals
    const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchases = todayPurchases.reduce((sum, p) => sum + p.total, 0);
    
    // Abonos recibidos hoy
    const saleAbonos = todayCashFlow
        .filter(m => m.type === 'entry' && m.category === 'sale' && m.reason.includes('Abono a Venta #'))
        .reduce((sum, m) => sum + m.amount, 0);

    const cashEntries = todayCashFlow
        .filter(m => m.type === 'entry')
        .reduce((sum, m) => sum + m.amount, 0);
    
    const cashExits = todayCashFlow
        .filter(m => m.type === 'exit')
        .reduce((sum, m) => sum + m.amount, 0);

    const netCash = cashEntries - cashExits;

    // UI helper stats
    const salesCashToday = totalSalesCash;
    const oldBalanceCollections = todayCashFlow
        .filter(m => m.type === 'entry' && m.category === 'sale' && m.reason.includes('Recaudo Saldo Antiguo'))
        .reduce((sum, m) => sum + m.amount, 0);

    const otherSaleEntries = todayCashFlow
        .filter(m => m.type === 'entry' && m.category === 'sale' && !m.reason.includes('Venta #') && !m.reason.includes('Abono a Venta #') && !m.reason.includes('Recaudo Saldo Antiguo'))
        .reduce((sum, m) => sum + m.amount, 0);

    const totalCashFromSales = todayCashFlow
        .filter(m => m.type === 'entry' && m.category === 'sale')
        .reduce((sum, m) => sum + m.amount, 0);

    const oldBalanceSupplierAbonos = todayCashFlow
        .filter(m => m.type === 'exit' && m.category === 'purchase' && m.reason.includes('Abono a Saldo Antiguo'))
        .reduce((sum, m) => sum + m.amount, 0);

    const purchaseAbonos = todayCashFlow
        .filter(m => m.type === 'exit' && m.category === 'purchase' && m.reason.includes('Abono a Compra #'))
        .reduce((sum, m) => sum + m.amount, 0);

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('Cierre de Caja Diario', 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(config.companyName.toUpperCase(), 14, 30);
        doc.text(`Fecha: ${format(today, 'dd/MM/yyyy')}`, 14, 35);
        
        // Totals Summary
        autoTable(doc, {
            startY: 45,
            head: [['Categoría', 'Venta Bruta (Total)', 'Transacciones']],
            body: [
                ['Efectivo (Contado)', formatCurrency(totalSalesCash), salesCash.length],
                ['Transferencia', formatCurrency(totalSalesTransfer), salesTransfer.length],
                ['Mixto', formatCurrency(totalSalesMixed), salesMixed.length],
                ['Crédito', formatCurrency(totalSalesCredit), salesCredit.length],
                ['Pago con Saldo', formatCurrency(totalSalesBalance), salesBalance.length],
                ['TOTAL VENTAS HOY', formatCurrency(totalSales), todaySales.length],
            ],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        });

        // Cash Flow Summary
        const finalY = (doc as any).lastAutoTable.finalY || 45;
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Resumen de Movimientos de Caja', 14, finalY + 15);

        autoTable(doc, {
            startY: finalY + 20,
            head: [['Concepto', 'Ingresos (+)', 'Egresos (-)']],
            body: [
                ['Ventas y Abonos', formatCurrency(cashEntries), ''],
                ['Compras y Gastos', '', formatCurrency(cashExits)],
                ['EFECTIVO NETO HOY', netCash >= 0 ? formatCurrency(netCash) : '', netCash < 0 ? formatCurrency(Math.abs(netCash)) : ''],
            ],
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] },
        });

        // Details of today's movements
        const nextY = (doc as any).lastAutoTable.finalY || finalY + 20;
        doc.text('Detalle Cronológico de Movimientos', 14, nextY + 15);

        autoTable(doc, {
            startY: nextY + 20,
            head: [['Hora', 'Descripción', 'Categoría', 'Importe']],
            body: todayCashFlow
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(m => [
                    format(new Date(m.date), 'HH:mm'),
                    m.description,
                    m.category.toUpperCase(),
                    `${m.type === 'entry' ? '+' : '-'}${formatCurrency(m.amount)}`
                ]),
            theme: 'plain',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
        });

        doc.save(`Cierre_Caja_${format(today, 'yyyy-MM-dd')}.pdf`);
    };

    const StatCard = ({ icon: Icon, label, value, subValue, color }: any) => (
        <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl", color)}>
                    <Icon size={20} />
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-xl font-black text-slate-900 tracking-tighter">{value}</h4>
                {subValue && <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-tight">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                            <Calendar size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Cierre de Caja Diario</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                                {new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(today)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Primary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            icon={ShoppingBag} 
                            label="Ventas Hoy" 
                            value={formatCurrency(totalSales)} 
                            subValue={`${todaySales.length} transacciones`}
                            color="bg-green-50 text-green-600"
                        />
                        <StatCard 
                            icon={ShoppingCart} 
                            label="Compras Hoy" 
                            value={formatCurrency(totalPurchases)} 
                            subValue={`${todayPurchases.length} facturas`}
                            color="bg-red-50 text-red-600"
                        />
                        <StatCard 
                            icon={TrendingUp} 
                            label="Entradas Caja" 
                            value={formatCurrency(cashEntries)} 
                            color="bg-blue-50 text-blue-600"
                        />
                        <StatCard 
                            icon={TrendingDown} 
                            label="Salidas Caja" 
                            value={formatCurrency(cashExits)} 
                            color="bg-orange-50 text-orange-600"
                        />
                    </div>

                    {/* Resumen por Método de Pago */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             Diferenciación de Ventas Hoy
                        </h4>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                <p className="text-[9px] font-black text-green-700 uppercase tracking-tight mb-1">Contado</p>
                                <p className="text-sm font-black text-green-800">{formatCurrency(totalSalesCash)}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-[9px] font-black text-blue-700 uppercase tracking-tight mb-1">Transf.</p>
                                <p className="text-sm font-black text-blue-800">{formatCurrency(totalSalesTransfer)}</p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                <p className="text-[9px] font-black text-purple-700 uppercase tracking-tight mb-1">Mixtas</p>
                                <p className="text-sm font-black text-purple-800">{formatCurrency(totalSalesMixed)}</p>
                            </div>
                            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                                <p className="text-[9px] font-black text-slate-700 uppercase tracking-tight mb-1">Crédito</p>
                                <p className="text-sm font-black text-slate-800">{formatCurrency(totalSalesCredit)}</p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <p className="text-[9px] font-black text-orange-700 uppercase tracking-tight mb-1">Con Saldo</p>
                                <p className="text-sm font-black text-orange-800">{formatCurrency(totalSalesBalance)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen de Flujo */}
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectivo Total en Caja (Hoy)</p>
                                    <h3 className={cn("text-4xl font-black tracking-tighter", netCash >= 0 ? "text-green-400" : "text-red-400")}>
                                        {formatCurrency(netCash)}
                                    </h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ventas Contado (Hoy)</p>
                                        <p className="text-lg font-black text-white">{formatCurrency(salesCashToday)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Abonos a Créditos</p>
                                        <p className="text-lg font-black text-white">{formatCurrency(saleAbonos)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Recaudos Saldos Antiguos</p>
                                        <p className="text-lg font-black text-blue-400">{formatCurrency(oldBalanceCollections)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Otros Ingresos Vtas</p>
                                        <p className="text-lg font-black text-white">{formatCurrency(otherSaleEntries)}</p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Abonos a Proveedores (Salida)</p>
                                        <p className="text-lg font-black text-orange-400">{formatCurrency(purchaseAbonos + oldBalanceSupplierAbonos)}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <TrendingUp size={12} /> Dinero de Ventas a Recibir
                                </p>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                                        <span className="uppercase tracking-tight">Total Efectivo Ventas</span>
                                        <span className="text-white">{formatCurrency(totalCashFromSales)}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 italic">
                                        * Este valor es la suma de todas las ventas marcadas como "Efectivo", abonos a créditos y recaudos de saldos antiguos hoy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Ventas Recientes */}
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Últimas Ventas
                            </h5>
                            <div className="space-y-2">
                                {[...todaySales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(s => (
                                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group hover:bg-slate-100 transition-colors">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase">Venta #{s.id.slice(-4)}</p>
                                            <p className="text-[9px] font-bold text-slate-500">{new Date(s.date).toLocaleTimeString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900">{formatCurrency(s.total)}</p>
                                            <p className={cn("text-[9px] font-black uppercase", s.paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600')}>
                                                {s.paymentMethod}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {todaySales.length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4 uppercase font-bold tracking-widest">Sin ventas registradas hoy</p>
                                )}
                            </div>
                        </div>

                        {/* Movimientos de Caja */}
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ArrowRightLeft size={12} /> Movimientos de Caja
                            </h5>
                            <div className="space-y-2">
                                {[...todayCashFlow].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(m => (
                                    <div key={m.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group hover:bg-slate-100 transition-colors border-l-4 border-l-transparent hover:border-l-orange-500">
                                        <div className="flex-1 pr-4">
                                            <p className="text-xs font-black text-slate-900 uppercase truncate">{m.description}</p>
                                            <p className="text-[9px] font-bold text-slate-500">{new Date(m.date).toLocaleTimeString()}</p>
                                        </div>
                                        <p className={cn("text-xs font-black", m.type === 'entry' ? "text-green-600" : "text-red-600")}>
                                            {m.type === 'entry' ? '+' : '-'}{formatCurrency(m.amount)}
                                        </p>
                                    </div>
                                ))}
                                {todayCashFlow.length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4 uppercase font-bold tracking-widest">Sin movimientos de caja hoy</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detalle Cronológico de Ingresos */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                            <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <TrendingUp size={12} /> Detalle de Recaudos (Peso por Peso)
                                </h5>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter">Cronología de Ingresos</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Total Recaudado</p>
                                <p className="text-lg font-black text-green-600">{formatCurrency(cashEntries)}</p>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Hora</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción / Concepto</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {[...todayCashFlow]
                                        .filter(m => m.type === 'entry')
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map((m, idx) => (
                                            <tr key={m.id} className="hover:bg-white transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                                        {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-900 uppercase leading-tight">{m.description}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{m.category === 'sale' ? 'Ingreso por Venta' : 'Otro Ingreso'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-green-600">{formatCurrency(m.amount)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    {todayCashFlow.filter(m => m.type === 'entry').length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center">
                                                <p className="text-xs text-slate-400 italic uppercase font-bold tracking-widest">No se registraron recaudos hoy</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                    <div className="flex items-center gap-3 text-slate-500">
                        <FileText size={20} />
                        <p className="text-[10px] font-bold uppercase tracking-wide">
                            Este reporte es un resumen instantáneo del día operativo.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={generatePDF}
                            className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl flex items-center gap-2"
                        >
                            <Download size={16} /> Descargar PDF
                        </button>
                        <button 
                            onClick={onClose}
                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl"
                        >
                            Cerrar Reporte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReportModal;
