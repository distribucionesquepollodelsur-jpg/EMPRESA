import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, History, ShieldAlert, Search, FileText } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CashFlow: React.FC = () => {
    const { cashFlow, sales, purchases, advances, addCashMovement, config } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form
    const [type, setType] = useState<'entry' | 'exit'>('entry');
    const [amount, setAmount] = useState(0);
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addCashMovement({ type, amount, reason });
        setIsModalOpen(false);
        setAmount(0);
        setReason('');
    };

    // Calculate aggregated totals
    const manualEntries = cashFlow.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.amount, 0);
    const manualExits = cashFlow.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.amount, 0);
    const salesTotal = sales.reduce((sum, s) => sum + s.total, 0);
    const purchasesTotal = purchases.reduce((sum, p) => sum + p.total, 0);
    const advancesTotal = advances.reduce((sum, a) => sum + a.amount, 0);

    const netBalance = (manualEntries + salesTotal) - (manualExits + purchasesTotal + advancesTotal);

    const generateCashReport = () => {
        const doc = new jsPDF();
        let y = 20;

        if (config.logo) {
            try {
                doc.addImage(config.logo, 'PNG', 14, 10, 30, 30);
                y = 45;
            } catch (e) {
                console.error("Error adding logo to PDF", e);
            }
        }

        doc.setFontSize(18);
        doc.text('Reporte de Caja Diaria', config.logo ? 50 : 14, y - 5);
        doc.setFontSize(10);
        doc.text(`Empresa: ${config.companyName}`, config.logo ? 50 : 14, y + 2);
        doc.text(`NIT: ${config.nit}`, config.logo ? 50 : 14, y + 8);
        doc.text(`Generado: ${formatDate(new Date())}`, config.logo ? 50 : 14, y + 14);

        y += 25;
        autoTable(doc, {
            head: [['Detalle', 'Ingreso', 'Egreso']],
            body: [
                ['Ventas (Automático)', formatCurrency(salesTotal), '-'],
                ['Compras (Automático)', '-', formatCurrency(purchasesTotal)],
                ['Adelantos Nómina', '-', formatCurrency(advancesTotal)],
                ['Movimientos Manuales (+)', formatCurrency(manualEntries), '-'],
                ['Movimientos Manuales (-)', '-', formatCurrency(manualExits)],
                ['TOTALES', formatCurrency(salesTotal + manualEntries), formatCurrency(purchasesTotal + advancesTotal + manualExits)],
                ['BALANCE FINAL', { content: formatCurrency(netBalance), colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } }]
            ] as any,
            startY: y,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`caja-${new Date().toISOString().slice(0,10)}.pdf`);
    };

    const handleBaseInicial = () => {
        setType('entry');
        setAmount(0);
        setReason('Base Inicial de Caja');
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Control de Caja</h1>
                    <p className="text-slate-500 font-medium italic">Gestión de flujo, cierres y movimientos diarios.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleBaseInicial}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-orange-200 text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-all shadow-sm active:scale-95"
                    >
                        <Wallet size={18} /> Base Inicial
                    </button>
                    <button 
                        onClick={generateCashReport}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <FileText size={18} /> Exportar PDF
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                    >
                        <Plus size={20} /> Registrar Movimiento
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos</span>
                    </div>
                    <div>
                        <h4 className="text-3xl font-black text-slate-900">{formatCurrency(salesTotal + manualEntries)}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mt-1">Ventas + Entradas Manuales</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                            <ArrowDownRight size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Egresos</span>
                    </div>
                    <div>
                        <h4 className="text-3xl font-black text-slate-900">{formatCurrency(purchasesTotal + manualExits + advancesTotal)}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mt-1">Compras + Salidas + Nómina</p>
                    </div>
                </div>

                <div className={cn(
                    "p-8 rounded-[32px] shadow-sm space-y-4 border",
                    netBalance >= 0 ? "bg-slate-900 border-slate-900 text-white" : "bg-red-900 border-red-900 text-white"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Balance Final</span>
                    </div>
                    <div>
                        <h4 className="text-3xl font-black">{formatCurrency(netBalance)}</h4>
                        <p className="text-xs opacity-50 font-bold uppercase tracking-tight mt-1">Saldo Disponible en Caja</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="text-slate-400" size={20} />
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">Historial de Movimientos Manuales</h3>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar por justificación..."
                            className="bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-slate-900 outline-none w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Fecha / Hora</th>
                                <th className="px-8 py-5">Justificación</th>
                                <th className="px-8 py-5">Monto</th>
                                <th className="px-8 py-5 text-right">Efecto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {cashFlow.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{formatDate(m.date)}</td>
                                    <td className="px-8 py-5 text-sm text-slate-800 font-bold capitalize">{m.reason}</td>
                                    <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(m.amount)}</td>
                                    <td className="px-8 py-5 text-right">
                                        <div className={cn(
                                            "inline-flex p-1.5 rounded-lg",
                                            m.type === 'entry' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                        )}>
                                            {m.type === 'entry' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {cashFlow.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-slate-300 italic">No hay movimientos manuales hoy</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cash Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mx-auto">
                                <History size={28} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Registrar Movimiento</h2>
                                <p className="text-sm text-slate-400 font-medium tracking-tight">Cualquier entrada o salida de efectivo manual.</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                            <ShieldAlert className="text-amber-500 flex-shrink-0" size={24} />
                            <p className="text-[10px] text-amber-800 font-black uppercase tracking-widest leading-relaxed">
                                Control Horario: Movimientos después de las 7:00 PM se registrarán automáticamente al día siguiente a las 6:00 AM.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex p-1 bg-slate-100 rounded-2xl">
                                <button 
                                    type="button"
                                    onClick={() => setType('entry')}
                                    className={cn(
                                        "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                                        type === 'entry' ? "bg-white text-green-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    Ingreso (+)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setType('exit')}
                                    className={cn(
                                        "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                                        type === 'exit' ? "bg-white text-red-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    Egreso (-)
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Monto del Movimiento</label>
                                <input 
                                    type="number" 
                                    required 
                                    autoFocus
                                    value={amount}
                                    onChange={e => setAmount(parseFloat(e.target.value))}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-black text-slate-950 text-xl"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Justificación Obligatoria</label>
                                <textarea 
                                    required 
                                    rows={3}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950 text-sm"
                                    placeholder="Ej: Pago de servicios, base de caja, etc..."
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-6">
                                <button className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all">
                                    Confirmar Movimiento
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
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

export default CashFlow;
