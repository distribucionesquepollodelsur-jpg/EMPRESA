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
    Package
} from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface DailyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose }) => {
    const { sales, purchases, cashFlow, customers, processings } = useData();

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

    const todayProcessings = processings.filter(p => {
        const date = new Date(p.date || '');
        return isWithinInterval(date, { start, end });
    });

    // Totals
    const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchases = todayPurchases.reduce((sum, p) => sum + p.total, 0);
    
    const cashEntries = todayCashFlow
        .filter(m => m.type === 'entry')
        .reduce((sum, m) => sum + m.amount, 0);
    
    const cashExits = todayCashFlow
        .filter(m => m.type === 'exit')
        .reduce((sum, m) => sum + m.amount, 0);

    const netCash = cashEntries - cashExits;

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

                    {/* Resumen de Flujo */}
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Neto del Día</p>
                                <h3 className={cn("text-4xl font-black tracking-tighter", netCash >= 0 ? "text-green-400" : "text-red-400")}>
                                    {formatCurrency(netCash)}
                                </h3>
                            </div>
                            <div className="flex gap-8">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tickets de Venta</p>
                                    <p className="text-xl font-black">{todaySales.length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Despresajes Hoy</p>
                                    <p className="text-xl font-black">{todayProcessings.length}</p>
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
                                {todaySales.slice(0, 5).map(s => (
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
                                {todayCashFlow.slice(0, 5).map(m => (
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
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                    <div className="flex items-center gap-3 text-slate-500">
                        <FileText size={20} />
                        <p className="text-[10px] font-bold uppercase tracking-wide">
                            Este reporte es un resumen instantáneo del día operativo.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl"
                    >
                        Cerrar Reporte
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyReportModal;
