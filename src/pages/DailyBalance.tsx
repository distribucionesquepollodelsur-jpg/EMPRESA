import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
    Calendar, 
    ArrowUpRight, 
    ArrowDownRight, 
    Calculator, 
    TrendingUp, 
    TrendingDown,
    FileText,
    PieChart,
    DollarSign,
    ShoppingBag,
    Users,
    Briefcase,
    History,
    Download,
    CreditCard,
    ArrowRightLeft
} from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DailyBalance: React.FC = () => {
    const { sales, purchases, cashFlow, expenses, config, customers } = useData();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const stats = useMemo(() => {
        const start = startOfDay(new Date(selectedDate + 'T00:00:00'));
        const end = endOfDay(new Date(selectedDate + 'T00:00:00'));

        const filterByDate = (item: any) => {
            const date = new Date(item.date);
            return isWithinInterval(date, { start, end });
        };

        const todaySales = sales.filter(filterByDate);
        const todayPurchases = purchases.filter(filterByDate);
        const todayExpenses = expenses.filter(filterByDate);
        const todayCashMovements = cashFlow.filter(filterByDate);

        // Calculate Cash movements specifically
        const cashEntries = todayCashMovements.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.amount, 0);
        const cashExits = todayCashMovements.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.amount, 0);

        // Sales Breakdown by Payment Method
        const salesStats = {
            contado: todaySales.filter(s => s.status === 'paid' && s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0),
            transferencia: todaySales.filter(s => s.status === 'paid' && s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0),
            credito: todaySales.filter(s => s.status === 'credit').reduce((sum, s) => sum + s.total, 0),
            mixto: todaySales.filter(s => s.status === 'paid' && s.paymentMethod === 'mixed').reduce((sum, s) => sum + s.total, 0),
            usedBalance: todaySales.reduce((sum, s) => sum + (s.balanceUsed || 0), 0)
        };

        const totalSalesVolume = todaySales.reduce((sum, s) => sum + s.total, 0);
        const totalPurchasesVolume = todayPurchases.reduce((sum, p) => sum + p.total, 0);
        const totalExpensesVolume = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

        // UNIFIED MOVEMENTS LIST
        const allMovements = [
            ...todaySales.map(s => ({
                id: s.id,
                date: s.date,
                type: 'sale',
                concept: `Venta: ${s.customerName}`,
                category: `Pago: ${s.paymentMethod === 'cash' ? 'Contado' : s.paymentMethod === 'transfer' ? 'Transferencia' : s.paymentMethod === 'mixed' ? 'Mixto' : (s.paymentMethod === 'balance' ? 'Saldo Favor' : 'Crédito')}`,
                amount: s.total,
                isEntry: s.status === 'paid',
                status: s.status,
                paymentMethod: s.paymentMethod
            })),
            ...todayPurchases.map(p => ({
                id: p.id,
                date: p.date,
                type: 'purchase',
                concept: `Compra: ${p.supplierName}`,
                category: `Insumos (${p.paymentMethod === 'cash' ? 'Efectivo' : p.paymentMethod === 'transfer' ? 'Transferencia' : 'Crédito'})`,
                amount: p.total,
                isEntry: false,
                status: p.status,
                paymentMethod: p.paymentMethod
            })),
            ...todayExpenses.map(e => ({
                id: e.id,
                date: e.date,
                type: 'expense',
                concept: `Gasto: ${e.description}`,
                category: e.category,
                amount: e.amount,
                isEntry: false,
                status: 'paid',
                paymentMethod: 'cash'
            })),
            ...todayCashMovements.map(m => ({
                id: m.id,
                date: m.date,
                type: 'cash',
                concept: m.reason,
                category: m.category,
                amount: m.amount,
                isEntry: m.type === 'entry',
                status: 'completed',
                paymentMethod: 'cash'
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            cashEntries,
            cashExits,
            netCash: cashEntries - cashExits,
            totalSalesVolume,
            totalPurchasesVolume,
            totalExpensesVolume,
            salesCount: todaySales.length,
            purchasesCount: todayPurchases.length,
            expensesCount: todayExpenses.length,
            salesStats,
            allMovements,
            todaySales
        };
    }, [selectedDate, sales, purchases, cashFlow, expenses]);

    const downloadPDF = () => {
        const doc = new jsPDF();
        const title = `Balance Diario Integral - ${formatDate(selectedDate)}`;
        
        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(10);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        // Summary row
        const summaryData = [
            ['Efectivo Recibido (Caja)', formatCurrency(stats.cashEntries)],
            ['Efectivo Entregado (Caja)', formatCurrency(stats.cashExits)],
            ['Saldo Final Caja', formatCurrency(stats.netCash)],
            ['Volumen Total Ventas', formatCurrency(stats.totalSalesVolume)]
        ];

        (doc as any).autoTable({
            head: [['Resumen Directo', 'Monto']],
            body: summaryData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        // Sales breakdown
        const breakdownData = [
            ['Contado (Efectivo)', formatCurrency(stats.salesStats.contado)],
            ['Transferencia', formatCurrency(stats.salesStats.transferencia)],
            ['Mixto', formatCurrency(stats.salesStats.mixto)],
            ['Crédito', formatCurrency(stats.salesStats.credito)],
            ['Saldo Favor Usado (Sin entrada de caja)', formatCurrency(stats.salesStats.usedBalance)]
        ];

        (doc as any).autoTable({
            head: [['Detalle por Método de Pago', 'Total']],
            body: breakdownData,
            startY: (doc as any).lastAutoTable.finalY + 10,
            theme: 'striped'
        });

        // Movements Table
        const movementsData = stats.allMovements.map(m => [
            format(new Date(m.date), 'HH:mm'),
            m.concept,
            m.category,
            m.amount >= 0 ? (m.isEntry ? '+' : '-') : '',
            formatCurrency(m.amount)
        ]);

        (doc as any).autoTable({
            head: [['Hora', 'Movimiento', 'Categoría/Método', '', 'Monto']],
            body: movementsData,
            startY: (doc as any).lastAutoTable.finalY + 10,
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 8 }
        });

        doc.save(`Balance_General_${selectedDate}.pdf`);
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Balance Diario General</h1>
                    <p className="text-slate-500 font-medium italic">Resumen consolidado de operaciones por día.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-200 shadow-sm">
                        <Calendar className="text-slate-400" size={20} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border-none focus:ring-0 font-bold text-slate-900 text-sm outline-none bg-transparent"
                        />
                    </div>
                    <button 
                        onClick={downloadPDF}
                        className="p-3 bg-slate-900 text-white rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        <Download size={20} />
                        <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Descargar PDF</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stats Cards ... (Keep existing cards but maybe highlight the Cash focus) */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Efectivo Real</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(stats.cashEntries)}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">Total Ingresos hoy</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                            <TrendingDown size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Efectivo Salido</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(stats.cashExits)}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">Total Egresos hoy</p>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl shadow-slate-900/10 space-y-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
                            <Calculator size={20} />
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Utilidad del Día</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black">{formatCurrency(stats.netCash)}</h4>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-tight mt-1">Balance Final Caja</p>
                    </div>
                </div>

                <div className="bg-orange-500 p-6 rounded-[32px] shadow-lg shadow-orange-500/20 space-y-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center">
                            <PieChart size={20} />
                        </div>
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest text-right">Ventas Totales</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black">{formatCurrency(stats.totalSalesVolume)}</h4>
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-tight mt-1">{stats.salesCount} Facturas</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-8">
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden h-fit">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2">
                            <History className="text-slate-400" size={18} /> Historial Operativo del Día
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.allMovements.length} Movimientos</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-slate-100">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Hora</th>
                                    <th className="px-6 py-4">Operación</th>
                                    <th className="px-6 py-4">Detalle / Pago</th>
                                    <th className="px-6 py-4 text-right">Monto Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.allMovements.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                            {format(new Date(m.date), 'HH:mm')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    m.type === 'sale' ? 'bg-blue-50 text-blue-600' :
                                                    m.type === 'purchase' ? 'bg-red-50 text-red-600' :
                                                    m.type === 'expense' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {m.type === 'sale' ? <ShoppingBag size={14} /> :
                                                     m.type === 'purchase' ? <ShoppingBag size={14} /> :
                                                     m.type === 'expense' ? <FileText size={14} /> : <DollarSign size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{m.concept}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{m.status === 'paid' || m.status === 'completed' ? 'Completado' : 'Pendiente'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.category}</p>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black text-sm ${m.isEntry ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.isEntry ? '+' : '-'}{formatCurrency(m.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {stats.allMovements.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-slate-300 italic text-sm">Sin actividad registrada este día</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-6 flex items-center gap-2">
                            <DollarSign className="text-slate-400" size={18} /> Detalle de Ventas
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                        <DollarSign size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Contado</span>
                                </div>
                                <span className="font-black text-slate-900">{formatCurrency(stats.salesStats.contado)}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                        <ArrowRightLeft size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Transferencia</span>
                                </div>
                                <span className="font-black text-slate-900">{formatCurrency(stats.salesStats.transferencia)}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                                        <CreditCard size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Crédito</span>
                                </div>
                                <span className="font-black text-slate-900">{formatCurrency(stats.salesStats.credito)}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                        <PieChart size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Mixtas / Otras</span>
                                </div>
                                <span className="font-black text-slate-900">{formatCurrency(stats.salesStats.mixto)}</span>
                            </div>
                            <div className="p-4 flex items-center justify-between border-t border-dashed border-slate-200 mt-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight italic text-red-500">Saldo Favor Aplicado</span>
                                </div>
                                <span className="font-black text-red-500">{formatCurrency(stats.salesStats.usedBalance)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                                <Briefcase size={20} className="text-slate-400" />
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-sm text-slate-900">Actividad de Compras</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-400 uppercase">Monto total</span>
                                <span className="font-black text-slate-900">{formatCurrency(stats.totalPurchasesVolume)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-400 uppercase">Registros</span>
                                <span className="font-black text-slate-900">{stats.purchasesCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyBalance;
