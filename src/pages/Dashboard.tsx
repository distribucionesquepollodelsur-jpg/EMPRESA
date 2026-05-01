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
    Download
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BalanceSheetModal from '../components/BalanceSheetModal';
import DailyReportModal from '../components/DailyReportModal';

const Dashboard: React.FC = () => {
    const { sales, purchases, products, cashFlow, employees } = useData();
    const { user } = useAuth();
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
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
        { label: 'Registrar Venta', action: 'sales', color: 'bg-green-500' },
        ...(user?.role === 'admin' ? [
            { label: 'Nueva Compra', action: 'purchases', color: 'bg-blue-500' },
            { label: 'Cierre de Caja', action: 'cash', color: 'bg-orange-500' },
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className={cn("absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform", color)}>
                <Icon size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className={cn("inline-flex p-3 rounded-xl", color.replace('text-', 'bg-').replace('600', '50'))}>
                    <Icon className={color} size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
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
                
                {deferredPrompt && (
                    <button
                        onClick={handleInstall}
                        className="flex items-center gap-3 px-6 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 active:scale-95 animate-bounce-subtle"
                    >
                        <Download size={20} />
                        Instalar App (PC/Escritorio)
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Ventas Totales" value={formatCurrency(totalSalesAmount)} icon={TrendingUp} color="text-green-600" />
                <StatsCard title="Compras Totales" value={formatCurrency(totalPurchasesAmount)} icon={TrendingDown} color="text-red-600" />
                <StatsCard title="Balance Neto" value={formatCurrency(balance)} icon={DollarSign} color="text-blue-600" />
                <StatsCard title="Stock Crítico" value={products.filter(p => p.stock <= 5).length} icon={Package} color="text-orange-600" />
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
                                <Bar dataKey="ventas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={32} />
                                <Bar dataKey="compras" fill="#f87171" radius={[4, 4, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <ShoppingBag className="text-orange-400" /> Accesos Rápidos
                    </h3>
                    <div className="space-y-4 flex-1">
                        {user?.role === 'admin' && (
                            <>
                                <button 
                                    onClick={() => setIsDailyReportOpen(true)}
                                    className="w-full flex items-center justify-between p-5 bg-blue-600 rounded-2xl hover:bg-blue-700 transition-all group text-left shadow-lg shadow-blue-600/20 mb-3 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-white" size={24} />
                                        <span className="font-black text-sm tracking-tight text-white uppercase">Reporte del Día</span>
                                    </div>
                                    <ArrowRight size={18} className="text-white/50 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                </button>

                                <button 
                                    onClick={() => setIsBalanceModalOpen(true)}
                                    className="w-full flex items-center justify-between p-5 bg-orange-500 rounded-2xl hover:bg-orange-600 transition-all group text-left shadow-lg shadow-orange-500/20 mb-3 border-b-4 border-orange-700 active:border-b-0 active:translate-y-1"
                                >
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="text-white" size={24} />
                                        <span className="font-black text-sm tracking-tight text-white uppercase">Balance General</span>
                                    </div>
                                    <ArrowRight size={18} className="text-white/50 group-hover:translate-x-1 group-hover:text-white transition-all" />
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
