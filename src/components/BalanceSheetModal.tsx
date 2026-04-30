import React from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, cn } from '../lib/utils';
import { 
    X, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Package, 
    ArrowRightLeft, 
    ShieldCheck,
    Wallet,
    AlertCircle,
    PiggyBank
} from 'lucide-react';

interface BalanceSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BalanceSheetModal: React.FC<BalanceSheetModalProps> = ({ isOpen, onClose }) => {
    const { products, sales, purchases, cashFlow, customers, assets } = useData();

    if (!isOpen) return null;

    // --- CALCULATIONS ---

    // 1. Assets (Activos)
    const cashOnHand = cashFlow.reduce((sum, m) => {
        return m.type === 'entry' ? sum + m.amount : sum - m.amount;
    }, 0);

    const inventoryValue = products.reduce((sum, p) => {
        return sum + (p.stock * (p.cost || 0));
    }, 0);

    const accountsReceivable = sales.reduce((sum, s) => {
        return sum + (s.total - (s.paidAmount || 0));
    }, 0);

    const fixedAssetsValue = assets.reduce((sum, a) => sum + a.value, 0);

    const totalAssets = cashOnHand + inventoryValue + accountsReceivable + fixedAssetsValue;

    // 2. Liabilities (Pasivos)
    const accountsPayable = purchases.reduce((sum, p) => {
        return sum + (p.total - (p.paidAmount || 0));
    }, 0);

    const customerLiability = customers.reduce((sum, c) => {
        // If balance is positive, customer has credit with us (we owe them value)
        const balance = c.balance || 0;
        return sum + (balance > 0 ? balance : 0);
    }, 0);

    const totalLiabilities = accountsPayable + customerLiability;

    // 3. Equity (Patrimonio)
    const equity = totalAssets - totalLiabilities;

    const Section = ({ title, amount, items, color }: any) => (
        <div className="space-y-4">
            <div className="flex justify-between items-end border-b-2 border-slate-100 pb-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
                <span className={cn("text-xl font-black tracking-tighter", color)}>{formatCurrency(amount)}</span>
            </div>
            <div className="space-y-3">
                {items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", item.iconColor)}>
                                <item.icon size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{item.label}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">{formatCurrency(item.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Balance General</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Estado Financiero Consolidado en Tiempo Real</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrimonio Neto (Capital Real)</p>
                                <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", 
                                    equity >= 0 ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-red-500/20 text-red-400 border border-red-500/20"
                                )}>
                                    {equity >= 0 ? 'Dando Frutos' : 'En Deuda'}
                                </span>
                            </div>
                            <h3 className={cn("text-4xl font-black tracking-tighter", equity >= 0 ? "text-orange-400" : "text-red-400")}>
                                {formatCurrency(equity)}
                            </h3>
                        </div>
                        <div className="flex gap-6 items-center">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ratio Activo/Pasivo</p>
                                <p className="text-lg font-black text-white">{(totalAssets / (totalLiabilities || 1)).toFixed(2)}</p>
                            </div>
                            <div className={cn("p-4 rounded-2xl shadow-inner", equity >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                {equity >= 0 ? <TrendingUp size={24} /> : <AlertCircle size={24} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={cn("px-8 py-3 flex items-center justify-center gap-3", 
                    equity >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}>
                    {equity >= 0 ? (
                        <>
                            <PiggyBank size={16} className="animate-bounce" />
                            <p className="text-[10px] font-black uppercase tracking-widest">La empresa está generando valor positivo y crecimiento.</p>
                        </>
                    ) : (
                        <>
                            <AlertCircle size={16} className="animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Alerta: Los pasivos superan a los activos. Se recomienda revisión.</p>
                        </>
                    )}
                </div>

                {/* Body */}
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 max-h-[60vh] overflow-y-auto">
                    {/* ACTIVOS */}
                    <Section 
                        title="Activos (Lo que tenemos)"
                        amount={totalAssets}
                        color="text-green-600"
                        items={[
                            { label: 'Efectivo en Caja', value: cashOnHand, icon: Wallet, iconColor: 'bg-green-50 text-green-600' },
                            { label: 'Valor de Inventario', value: inventoryValue, icon: Package, iconColor: 'bg-blue-50 text-blue-600' },
                            { label: 'Cuentas por Cobrar', value: accountsReceivable, icon: TrendingUp, iconColor: 'bg-emerald-50 text-emerald-600' },
                            { label: 'Activos Fijos', value: fixedAssetsValue, icon: ShieldCheck, iconColor: 'bg-orange-50 text-orange-600' }
                        ]}
                    />

                    {/* PASIVOS */}
                    <Section 
                        title="Pasivos (Lo que debemos)"
                        amount={totalLiabilities}
                        color="text-red-600"
                        items={[
                            { label: 'Cuentas por Pagar', value: accountsPayable, icon: TrendingDown, iconColor: 'bg-red-50 text-red-600' },
                            { label: 'Créditos a Clientes', value: customerLiability, icon: ArrowRightLeft, iconColor: 'bg-orange-50 text-orange-600' },
                            { label: 'Deudas Operativas', value: 0, icon: AlertCircle, iconColor: 'bg-slate-50 text-slate-400' }
                        ]}
                    />
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-slate-500">
                        <PiggyBank size={20} />
                        <p className="text-[10px] font-bold uppercase tracking-wide">
                            Este balance refleja la suma de todas las operaciones registradas.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-xl"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheetModal;
