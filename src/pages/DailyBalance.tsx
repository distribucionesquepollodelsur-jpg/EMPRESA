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
    History
} from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const DailyBalance: React.FC = () => {
    const { sales, purchases, cashFlow, expenses, config } = useData();
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
        const todayCash = cashFlow.filter(filterByDate);

        // Calculate Cash movements specifically
        // Ingresos: Ventas pagadas hoy + Cobros de créditos + Entradas manuales
        const cashEntries = todayCash.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.amount, 0);
        
        // Egresos: Compras pagadas hoy + Pago de deudas + Gastos + Adelantos + Salidas manuales
        const cashExits = todayCash.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.amount, 0);

        // Other metrics (not necessarily cash only)
        const totalSalesVolume = todaySales.reduce((sum, s) => sum + s.total, 0);
        const totalPurchasesVolume = todayPurchases.reduce((sum, p) => sum + p.total, 0);
        const totalExpensesVolume = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

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
            movements: todayCash.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [selectedDate, sales, purchases, cashFlow, expenses]);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Balance Diario General</h1>
                    <p className="text-slate-500 font-medium italic">Resumen consolidado de operaciones por día.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <Calendar className="text-slate-400 ml-2" size={20} />
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border-none focus:ring-0 font-bold text-slate-900 text-sm outline-none"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Efectivo Recibido</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(stats.cashEntries)}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">Total Entradas hoy</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                            <TrendingDown size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Efectivo Entregado</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(stats.cashExits)}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">Total Salidas hoy</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                            <Calculator size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Utilidad Neta (Caja)</span>
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-slate-900">{formatCurrency(stats.netCash)}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">Saldo del Día</p>
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
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-tight mt-1">{stats.salesCount} Facturas Generadas</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2">
                            <History className="text-slate-400" size={18} /> Detalle de Movimientos de Caja
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.movements.length} Movimientos</span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10 shadow-sm">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Hora</th>
                                    <th className="px-6 py-4">Concepto</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.movements.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                            {format(new Date(m.date), 'HH:mm')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{m.reason}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{m.category}</p>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black text-sm ${m.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.type === 'entry' ? '+' : '-'}{formatCurrency(m.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {stats.movements.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-slate-300 italic text-sm">Sin movimientos este día</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-6 flex items-center gap-2">
                            <Briefcase className="text-slate-400" size={18} /> Resumen Operativo
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Compras Totales</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stats.purchasesCount} Registros</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-slate-900">{formatCurrency(stats.totalPurchasesVolume)}</span>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Gastos Varios</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stats.expensesCount} Registros</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-slate-900">{formatCurrency(stats.totalExpensesVolume)}</span>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Balance de Mercancía</p>
                                    <p className="text-2xl font-black text-slate-900 leading-tight">
                                        {formatCurrency(stats.totalSalesVolume - stats.totalPurchasesVolume)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendimiento</p>
                                    <span className={`text-sm font-black uppercase px-3 py-1 rounded-full ${
                                        (stats.totalSalesVolume - stats.totalPurchasesVolume) >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                    }`}>
                                        {stats.totalPurchasesVolume > 0 
                                            ? (((stats.totalSalesVolume / stats.totalPurchasesVolume) - 1) * 100).toFixed(1) + '%' 
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <DollarSign size={20} />
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-sm">Estado de Liquidación Diaria</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed italic">
                            "Este balance refleja el flujo de dinero real que entró y salió de su negocio durante el {format(new Date(selectedDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}. Use este dato para el arqueo de caja físico."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyBalance;
