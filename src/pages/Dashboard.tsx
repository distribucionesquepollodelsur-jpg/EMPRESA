import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Package, 
    ArrowRight,
    ShoppingBag,
    Users,
    ShieldCheck,
    Calendar,
    Download,
    AlertTriangle,
    Clock
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { differenceInDays, parseISO, subDays } from 'date-fns';
import BalanceSheetModal from '../components/BalanceSheetModal';
import DailyReportModal from '../components/DailyReportModal';

const Dashboard: React.FC = () => {
    const { sales, purchases, products, cashFlow, employees, customers } = useData();
    const { user } = useAuth();
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
    const [showOverdueAlert, setShowOverdueAlert] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    // Filter overdue collections (> 5 days)
    const overdueCollections = useMemo(() => {
        const today = new Date();
        const cutoff = subDays(today, 5);

        const saleDebts = sales
            .filter(s => {
                const balance = s.total - (s.paidAmount || 0);
                return balance > 100 && new Date(s.date) < cutoff; // Filter debts > $100 and older than 5 days
            })
            .map(s => ({
                id: s.id,
                name: s.customerName || 'Cliente No Identificado',
                amount: s.total - s.paidAmount,
                date: s.date,
                days: differenceInDays(today, new Date(s.date)),
                type: 'Venta'
            }));

        const initialDebts = customers
            .filter(c => {
                const debt = c.initialDebt || 0;
                const debtDate = c.initialDebtDate ? new Date(c.initialDebtDate) : null;
                return debt > 100 && debtDate && debtDate < cutoff;
            })
            .map(c => ({
                id: c.id,
                name: c.name,
                amount: c.initialDebt || 0,
                date: c.initialDebtDate!,
                days: differenceInDays(today, new Date(c.initialDebtDate!)),
                type: 'Saldo Antiguo'
            }));

        return [...saleDebts, ...initialDebts].sort((a, b) => b.days - a.days);
    }, [sales, customers]);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        // If we are in an iframe (like AI Studio preview), we MUST open in a new tab
        // because browsers block PWA installation prompts inside iframes.
        if (window.self !== window.top) {
            window.open(window.location.href, '_blank');
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.total, 0);
    const balance = totalSalesAmount - totalPurchasesAmount;

    // Filter quick actions based on role
    const quickActions = [
        { label: 'Registrar Venta', action: 'sales', color: 'bg-zinc-900' },
        ...(user?.role === 'admin' ? [
            { label: 'Nueva Compra', action: 'purchases', color: 'bg-zinc-800' },
            { label: 'Cierre de Caja', action: 'cash', color: 'bg-zinc-700' },
        ] : []),
    ];

    const chartData = useMemo(() => {
        // ... (existing chart data logic)
        // Simple mock grouping for display (could be expanded to actual months)
        return [
            { name: 'Lun', ventas: 4000, compras: 2400 },
            { name: 'Mar', ventas: 3000, compras: 1398 },
            { name: 'Mie', ventas: 2000, compras: 9800 },
            { name: 'Jue', ventas: 2780, compras: 3908 },
            { name: 'Vie', ventas: 1890, compras: 4800 },
            { name: 'Sab', ventas: 2390, compras: 3800 },
            { name: 'Dom', ventas: 3490, compras: 4300 },
        ];
    }, []);

    const StatsCard = ({ title, value, icon: Icon, color, trend }: any) => (
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:shadow-zinc-200/50 transition-all group relative overflow-hidden">
            <div className={cn("absolute right-[-20px] top-[-20px] opacity-5 group-hover:scale-110 transition-transform", color)}>
                <Icon size={160} strokeWidth={0.5} />
            </div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl bg-zinc-50 ${color} group-hover:scale-110 transition-transform`}>
                        <Icon size={24} />
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-zinc-900 tracking-tighter">{value}</h3>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Buenas tardes, {user?.name.split(' ')[0]}
                        <span className="text-slate-300 font-normal">👋</span>
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight italic">Aquí tienes un resumen de la operación hoy.</p>
                </div>
            </header>

            {overdueCollections.length > 0 && showOverdueAlert && user?.role === 'admin' && (
                <div className="bg-red-50 border border-red-100 rounded-[32px] p-8 shadow-xl shadow-red-500/10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-red-500 rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/40">
                                <AlertTriangle className="text-white" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase italic">¡Atención! Cobros Pendientes</h2>
                                <p className="text-red-600 font-bold text-sm tracking-tight">Hay {overdueCollections.length} deudas superando los 5 días de retraso.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowOverdueAlert(false)}
                            className="text-red-300 hover:text-red-500 font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-white rounded-xl border border-red-100 transition-all hover:shadow-md"
                        >
                            Ocultar temporalmente
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {overdueCollections.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="bg-white p-5 rounded-2xl border border-red-100/50 shadow-sm flex flex-col justify-between group hover:border-red-500/30 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">{item.type}</span>
                                        <h4 className="font-bold text-slate-900 capitalize text-sm">{item.name}</h4>
                                    </div>
                                    <div className="bg-red-50 text-red-600 p-2 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all">
                                        <Clock size={16} />
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold">RETRASO:</span>
                                        <span className="text-red-600 font-black text-sm">{item.days} Días</span>
                                    </div>
                                    <div className="text-right flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saldo Pendiente</span>
                                        <span className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(item.amount)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Ventas Totales" value={formatCurrency(totalSalesAmount)} icon={TrendingUp} color="text-green-600" />
                <StatsCard title="Compras Totales" value={formatCurrency(totalPurchasesAmount)} icon={TrendingDown} color="text-red-500" />
                <StatsCard title="Balance Neto" value={formatCurrency(balance)} icon={DollarSign} color="text-zinc-900" />
                <StatsCard title="Debajo de Stock" value={products.filter(p => p.stock <= 5).length} icon={Package} color="text-red-600" />
            </div>

            <div className="p-10 rounded-[40px] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 transition-all bg-zinc-900 border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                <div className="flex items-center gap-8 text-center md:text-left relative z-10">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-white/5 backdrop-blur-md p-4 group-hover:scale-110 transition-transform">
                        <Download size={40} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight italic">Versión de Escritorio</h3>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Usa la aplicación fuera del navegador.</p>
                    </div>
                </div>
                <button 
                    onClick={handleInstall}
                    className="px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl active:scale-95 bg-white text-black hover:bg-zinc-200 relative z-10"
                >
                    Instalar Ahora
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Flujo Financiero</h3>
                            <p className="text-sm text-slate-400 font-medium">Histórico de la semana actual</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                                <span className="text-xs font-bold text-slate-500">Ventas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-400 rounded-full" />
                                <span className="text-xs font-bold text-slate-500">Compras</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                                <Bar dataKey="compras" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-950 p-10 rounded-[40px] text-white shadow-2xl flex flex-col border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                         <ShoppingBag size={120} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 flex items-center gap-3">
                         Accesos de Gestión
                    </h3>
                    <div className="space-y-4 flex-1 relative z-10">
                        {user?.role === 'admin' && (
                            <>
                                <button 
                                    onClick={() => setIsDailyReportOpen(true)}
                                    className="w-full flex items-center justify-between p-6 bg-zinc-800 rounded-3xl hover:bg-zinc-700 transition-all group text-left border border-white/5 shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center">
                                            <Calendar className="text-white" size={24} />
                                        </div>
                                        <span className="font-black text-xs tracking-widest text-zinc-300 uppercase">Cerrar Caja Hoy</span>
                                    </div>
                                    <ArrowRight size={18} className="text-zinc-600 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                </button>

                                <button 
                                    onClick={() => setIsBalanceModalOpen(true)}
                                    className="w-full flex items-center justify-between p-6 bg-zinc-800 rounded-3xl hover:bg-zinc-700 transition-all group text-left border border-white/5 shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center">
                                            <ShieldCheck className="text-white" size={24} />
                                        </div>
                                        <span className="font-black text-xs tracking-widest text-zinc-300 uppercase">Estado Patrimonial</span>
                                    </div>
                                    <ArrowRight size={18} className="text-zinc-600 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                </button>
                            </>
                        )}
                        {quickActions.map(btn => (
                            <button 
                                key={btn.label}
                                className="w-full flex items-center justify-between p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-colors group text-left"
                            >
                                <span className="font-bold text-sm tracking-tight">{btn.label}</span>
                                <ArrowRight size={18} className="text-slate-500 group-hover:translate-x-1 group-hover:text-white transition-all" />
                            </button>
                        ))}
                    </div>

                    <BalanceSheetModal 
                        isOpen={isBalanceModalOpen} 
                        onClose={() => setIsBalanceModalOpen(false)} 
                    />
                    <DailyReportModal 
                        isOpen={isDailyReportOpen} 
                        onClose={() => setIsDailyReportOpen(false)} 
                    />
                    <div className="mt-8 pt-8 border-t border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                                <Users size={20} className="text-slate-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold">{employees.filter(e => e.active).length} Empleados</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Activos en sistema</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
