import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
    Download, 
    FileText, 
    TrendingUp, 
    TrendingDown, 
    Scale, 
    Activity, 
    PieChart, 
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Wallet
} from 'lucide-react';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

type ReportType = 'balance' | 'p&l' | 'cashflow' | 'equity';

const FinancialStatements: React.FC = () => {
    const { 
        products, 
        sales, 
        purchases, 
        cashFlow, 
        expenses, 
        employees, 
        payroll, 
        assets, 
        loans, 
        businessLoans, 
        customers, 
        suppliers,
        config 
    } = useData() as any;

    const [activeReport, setActiveReport] = useState<ReportType>('p&l');
    const [period, setPeriod] = useState<'month' | 'year'>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const periodRange = useMemo(() => {
        const start = period === 'month' ? startOfMonth(selectedDate) : startOfYear(selectedDate);
        const end = period === 'month' ? endOfMonth(selectedDate) : endOfYear(selectedDate);
        return { start, end };
    }, [period, selectedDate]);

    // Financial Data Converters
    const financialData = useMemo(() => {
        const isInPeriod = (dateStr: string) => {
            const date = new Date(dateStr);
            return isWithinInterval(date, periodRange);
        };

        // --- ASSETS ---
        // 11. Disponible (Cash)
        // We calculate total cash based on all historical movements up to period end
        const cashBalanceAtEnd = cashFlow
            .filter((m: any) => new Date(m.date) <= periodRange.end)
            .reduce((sum: number, m: any) => sum + (m.type === 'entry' ? m.amount : -m.amount), 0);
        
        // 13. Deudores (Accounts Receivable)
        const accountsReceivable = customers.reduce((sum: number, c: any) => sum + (c.balance || 0), 0) +
                                  loans.filter((l: any) => l.status === 'pending').reduce((sum: number, l: any) => sum + (l.amount - l.paidAmount), 0);

        // 14. Inventarios
        const inventoryValue = products.reduce((sum: number, p: any) => sum + (p.stock * p.cost), 0);

        // 15. Propiedad, Planta y Equipo
        const assetsValue = assets.reduce((sum: number, a: any) => sum + (a.value || 0), 0);

        const totalAssets = cashBalanceAtEnd + accountsReceivable + inventoryValue + assetsValue;

        // --- LIABILITIES ---
        // 21. Obligaciones Financieras
        const loansPayable = businessLoans.filter((l: any) => l.status === 'pending').reduce((sum: number, l: any) => sum + (l.amount - l.paidAmount), 0);

        // 22. Proveedores
        const accountsPayable = suppliers.reduce((sum: number, s: any) => sum + (s.balance || 0), 0);

        const totalLiabilities = loansPayable + accountsPayable;

        // --- P&L (Period Based) ---
        const periodSales = sales.filter((s: any) => isInPeriod(s.date));
        const periodPurchases = purchases.filter((p: any) => isInPeriod(p.date));
        const periodExpenses = expenses.filter((e: any) => isInPeriod(e.date));
        const periodCashFlow = cashFlow.filter((m: any) => isInPeriod(m.date));

        // Income
        const grossIncome = periodSales.reduce((sum: number, s: any) => sum + s.total, 0);

        // Cost of Goods Sold (COGS)
        // Approximate COGS from sales items cost
        const cogs = periodSales.reduce((sum: number, s: any) => {
            return sum + s.items.reduce((itemSum: number, item: any) => {
                const product = products.find((p: any) => p.id === item.productId);
                return itemSum + (item.quantity * (product?.cost || 0));
            }, 0);
        }, 0);

        const grossProfit = grossIncome - cogs;

        // Operating Expenses
        const payrollExpenses = periodCashFlow.filter((m: any) => m.category === 'advance' || (m.reason && m.reason.toLowerCase().includes('nómina'))).reduce((sum: number, m: any) => sum + m.amount, 0);
        const generalExpenses = periodExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
        
        const totalExpenses = payrollExpenses + generalExpenses;
        const netIncome = grossProfit - totalExpenses;

        // --- EQUITY ---
        const retainedEarnings = totalAssets - totalLiabilities - netIncome; // Simple balancer for current net income
        const totalEquity = retainedEarnings + netIncome;

        // --- CASH FLOW (Direct Method Approximation) ---
        const cashFromOperations = periodCashFlow
            .filter((m: any) => ['sale', 'purchase', 'expense', 'advance'].includes(m.category || ''))
            .reduce((sum: number, m: any) => sum + (m.type === 'entry' ? m.amount : -m.amount), 0);

        const cashFromInvesting = periodCashFlow
            .filter((m: any) => m.reason && m.reason.toLowerCase().includes('activo'))
            .reduce((sum: number, m: any) => sum + (m.type === 'entry' ? m.amount : -m.amount), 0);

        const cashFromFinancing = periodCashFlow
            .filter((m: any) => m.category === 'loan' || (m.reason && (m.reason.toLowerCase().includes('préstamo') || m.reason.toLowerCase().includes('abono'))))
            .reduce((sum: number, m: any) => sum + (m.type === 'entry' ? m.amount : -m.amount), 0);

        return {
            assets: {
                cash: cashBalanceAtEnd,
                receivable: accountsReceivable,
                inventory: inventoryValue,
                ppe: assetsValue,
                total: totalAssets
            },
            liabilities: {
                loans: loansPayable,
                payable: accountsPayable,
                total: totalLiabilities
            },
            equity: {
                retained: retainedEarnings,
                netIncome: netIncome,
                total: totalEquity
            },
            pAndL: {
                income: grossIncome,
                cogs: cogs,
                grossProfit: grossProfit,
                payroll: payrollExpenses,
                general: generalExpenses,
                totalExpenses,
                netIncome
            },
            cashFlowStatement: {
                operations: cashFromOperations,
                investing: cashFromInvesting,
                financing: cashFromFinancing,
                increase: cashFromOperations + cashFromInvesting + cashFromFinancing
            }
        };
    }, [products, sales, purchases, cashFlow, expenses, assets, loans, businessLoans, customers, suppliers, periodRange]);

    const reportCategories = [
        { id: 'p&l', label: 'E. Resultados', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'balance', label: 'B. General', icon: Scale, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'cashflow', label: 'Flujo Efectivo', icon: ArrowUpRight, color: 'text-orange-600', bg: 'bg-orange-50' },
        { id: 'equity', label: 'Patrimonio', icon: PieChart, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    const generatePDF = () => {
        const doc = new jsPDF();
        const title = `Estado Financiero: ${reportCategories.find(r => r.id === activeReport)?.label}`;
        const periodText = period === 'month' ? format(selectedDate, 'MMMM yyyy') : format(selectedDate, 'yyyy');

        doc.setFontSize(18);
        doc.text(config.companyName || 'Empresa', 14, 20);
        doc.setFontSize(12);
        doc.text(title, 14, 28);
        doc.text(`Período: ${periodText}`, 14, 35);
        doc.setFontSize(10);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);

        let tableData: any[] = [];
        let head: string[][] = [['Cuenta PUC', 'Descripción', 'Valor']];

        if (activeReport === 'balance') {
            tableData = [
                ['1', 'ACTIVOS', formatCurrency(financialData.assets.total)],
                ['11', 'Disponible', formatCurrency(financialData.assets.cash)],
                ['13', 'Deudores (Cuentas por Cobrar)', formatCurrency(financialData.assets.receivable)],
                ['14', 'Inventarios', formatCurrency(financialData.assets.inventory)],
                ['15', 'Propiedad, Planta y Equipo', formatCurrency(financialData.assets.ppe)],
                ['', '', ''],
                ['2', 'PASIVOS', formatCurrency(financialData.liabilities.total)],
                ['21', 'Obligaciones Financieras', formatCurrency(financialData.liabilities.loans)],
                ['22', 'Proveedores', formatCurrency(financialData.liabilities.payable)],
                ['', '', ''],
                ['3', 'PATRIMONIO', formatCurrency(financialData.equity.total)],
                ['31', 'Capital Social / Reservas', formatCurrency(financialData.equity.retained)],
                ['36', 'Resultado del Ejercicio', formatCurrency(financialData.equity.netIncome)],
            ];
        } else if (activeReport === 'p&l') {
            tableData = [
                ['41', 'INGRESOS OPERACIONALES', formatCurrency(financialData.pAndL.income)],
                ['61', 'COSTO DE VENTAS', `(${formatCurrency(financialData.pAndL.cogs)})`],
                ['', 'UTILIDAD BRUTA', formatCurrency(financialData.pAndL.grossProfit)],
                ['', '', ''],
                ['5', 'GASTOS OPERACIONALES', `(${formatCurrency(financialData.pAndL.totalExpenses)})`],
                ['51', 'Gastos de Personal / Nómina', `(${formatCurrency(financialData.pAndL.payroll)})`],
                ['52', 'Gastos Generales / Diversos', `(${formatCurrency(financialData.pAndL.general)})`],
                ['', '', ''],
                ['', 'UTILIDAD / PÉRDIDA NETA', formatCurrency(financialData.pAndL.netIncome)],
            ];
        } else if (activeReport === 'cashflow') {
            tableData = [
                ['', 'Actividades de Operación', formatCurrency(financialData.cashFlowStatement.operations)],
                ['', 'Actividades de Inversión', formatCurrency(financialData.cashFlowStatement.investing)],
                ['', 'Actividades de Financiación', formatCurrency(financialData.cashFlowStatement.financing)],
                ['', '', ''],
                ['', 'Aumento / Disminución Neta del Efectivo', formatCurrency(financialData.cashFlowStatement.increase)],
            ];
        } else if (activeReport === 'equity') {
            tableData = [
                ['3', 'PATRIMONIO INICIAL EST.', formatCurrency(financialData.equity.retained)],
                ['36', 'Utilidad Neta del Ejercicio', formatCurrency(financialData.equity.netIncome)],
                ['', '', ''],
                ['', 'PATRIMONIO TOTAL FINAL', formatCurrency(financialData.equity.total)],
            ];
        }

        autoTable(doc, {
            head,
            body: tableData,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 9, fontStyle: 'bold' },
            didParseCell: (data) => {
                if (data.row.index === 0 || data.row.cells[1].text[0].includes('TOTAL')) {
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });

        doc.save(`Estados_Financieros_${activeReport}_${format(selectedDate, 'yyyy_MM')}.pdf`);
    };

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Estados Financieros</h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium italic">
                        <Scale size={18} />
                        <span>Contabilidad bajo estándares NIIF / PUC Colombia</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        <button 
                            onClick={() => setPeriod('month')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                period === 'month' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Mensual
                        </button>
                        <button 
                            onClick={() => setPeriod('year')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                period === 'year' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Anual
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-200 shadow-sm">
                        <Calendar className="text-slate-400" size={18} />
                        <input 
                            type={period === 'month' ? "month" : "number"}
                            value={period === 'month' ? format(selectedDate, 'yyyy-MM') : selectedDate.getFullYear()}
                            onChange={(e) => {
                                if (period === 'month') {
                                    setSelectedDate(new Date(e.target.value + '-01T12:00:00'));
                                } else {
                                    const newDate = new Date();
                                    newDate.setFullYear(parseInt(e.target.value));
                                    setSelectedDate(newDate);
                                }
                            }}
                            className="bg-transparent border-none focus:ring-0 font-black text-slate-900 text-sm w-32 outline-none"
                            {...(period === 'year' ? { min: 2020, max: 2030 } : {})}
                        />
                    </div>

                    <button 
                        onClick={generatePDF}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                        <Download size={18} />
                        Exportar PDF
                    </button>
                </div>
            </header>

            {/* Reports Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reportCategories.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeReport === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveReport(item.id as ReportType)}
                            className={cn(
                                "group p-6 rounded-[32px] border transition-all text-left relative overflow-hidden",
                                isActive 
                                    ? "bg-white border-slate-900 shadow-xl shadow-slate-200" 
                                    : "bg-white border-slate-100 hover:border-slate-300 shadow-sm"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                                isActive ? "bg-slate-900 text-white" : `${item.bg} ${item.color}`
                            )}>
                                <Icon size={24} />
                            </div>
                            <h3 className={cn(
                                "font-black uppercase tracking-widest text-xs",
                                isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                            )}>
                                {item.label}
                            </h3>
                            {isActive && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-slate-900" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Report Content */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Documento Oficial</span>
                            <div className="h-px flex-1 w-12 bg-indigo-100" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {reportCategories.find(r => r.id === activeReport)?.label}
                        </h2>
                    </div>
                    <div className="px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-0.5">Estado Consolidado</span>
                        <span className="text-sm font-black text-slate-900">
                            {period === 'month' ? format(selectedDate, 'MMMM yyyy') : `Año Fiscal ${selectedDate.getFullYear()}`}
                        </span>
                    </div>
                </div>

                <div className="p-10 max-w-4xl mx-auto">
                    {/* Render specific report content */}
                    {activeReport === 'p&l' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section>
                                <div className="flex items-center justify-between py-6 border-b-2 border-slate-900">
                                    <span className="text-sm font-black uppercase tracking-widest text-slate-900">Ventas e Ingresos</span>
                                    <span className="text-xl font-black text-slate-900">{formatCurrency(financialData.pAndL.income)}</span>
                                </div>
                                <div className="flex items-center justify-between py-6 border-b border-slate-100 text-slate-500 italic">
                                    <span className="text-sm font-bold uppercase tracking-tight ml-4 flex items-center gap-2">
                                        <TrendingUp size={14} className="text-green-500" /> Costo de Ventas (COGS)
                                    </span>
                                    <span className="text-lg font-bold">({formatCurrency(financialData.pAndL.cogs)})</span>
                                </div>
                                <div className="flex items-center justify-between py-6 bg-slate-50 px-6 rounded-2xl mt-4">
                                    <span className="text-sm font-black uppercase tracking-widest text-indigo-600">Utilidad Bruta</span>
                                    <span className="text-2xl font-black text-indigo-600">{formatCurrency(financialData.pAndL.grossProfit)}</span>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-3">
                                    <TrendingDown size={14} /> Gastos Operacionales
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                                        <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">Gastos de Personal (Nómina/Adelantos)</span>
                                        <span className="font-black text-slate-900">({formatCurrency(financialData.pAndL.payroll)})</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                                        <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">Gastos Generales y Otros</span>
                                        <span className="font-black text-slate-900">({formatCurrency(financialData.pAndL.general)})</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-6 border-t-2 border-slate-200 mt-6 px-6 bg-red-50 rounded-2xl">
                                    <span className="text-sm font-black uppercase tracking-widest text-red-600">Total Gastos</span>
                                    <span className="text-xl font-black text-red-600">({formatCurrency(financialData.pAndL.totalExpenses)})</span>
                                </div>
                            </section>

                            <section className="pt-10">
                                <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl shadow-slate-900/20 text-white flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Resultado Neto del Ejercicio</h4>
                                        <p className="text-sm font-bold text-white/60 italic leading-relaxed">Excedente o pérdida después de costos y gastos.</p>
                                    </div>
                                    <span className={cn(
                                        "text-4xl font-black tracking-tight",
                                        financialData.pAndL.netIncome >= 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {formatCurrency(financialData.pAndL.netIncome)}
                                    </span>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeReport === 'balance' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Assets Column */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3 pb-4 border-b-2 border-emerald-500">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                            <ArrowUpRight size={20} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase text-slate-900">Activos</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { code: '11', label: 'Disponible (Caja/Bancos)', value: financialData.assets.cash },
                                            { code: '13', label: 'Cuentas por Cobrar', value: financialData.assets.receivable },
                                            { code: '14', label: 'Inventarios', value: financialData.assets.inventory },
                                            { code: '15', label: 'Activos Fijos (PPE)', value: financialData.assets.ppe },
                                        ].map(item => (
                                            <div key={item.code} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-all">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.code} PUC</span>
                                                    <span className="font-black text-slate-900">{formatCurrency(item.value)}</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                                        <span className="text-sm font-black uppercase text-emerald-700">Total Activos</span>
                                        <span className="text-xl font-black text-emerald-700">{formatCurrency(financialData.assets.total)}</span>
                                    </div>
                                </div>

                                {/* Liabilities & Equity Column */}
                                <div className="space-y-8">
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-3 pb-4 border-b-2 border-red-500">
                                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                                                <ArrowDownRight size={20} />
                                            </div>
                                            <h3 className="text-lg font-black uppercase text-slate-900">Pasivos</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                { code: '21', label: 'Obligaciones Financieras', value: financialData.liabilities.loans },
                                                { code: '22', label: 'Cuentas por Pagar (Proveedores)', value: financialData.liabilities.payable },
                                            ].map(item => (
                                                <div key={item.code} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-red-200 transition-all">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.code} PUC</span>
                                                        <span className="font-black text-slate-900">{formatCurrency(item.value)}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-8">
                                        <div className="flex items-center gap-3 pb-4 border-b-2 border-indigo-500">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                                <PieChart size={20} />
                                            </div>
                                            <h3 className="text-lg font-black uppercase text-slate-900">Patrimonio</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                { code: '31', label: 'Capital / Reservas', value: financialData.equity.retained },
                                                { code: '36', label: 'Resultado del Ejercicio', value: financialData.equity.netIncome },
                                            ].map(item => (
                                                <div key={item.code} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.code} PUC</span>
                                                        <span className="font-black text-slate-900">{formatCurrency(item.value)}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-900 rounded-[24px] flex items-center justify-between text-white shadow-xl shadow-indigo-900/20">
                                        <span className="text-sm font-black uppercase">Total Pasivo + Pat.</span>
                                        <span className="text-xl font-black">{formatCurrency(financialData.liabilities.total + financialData.equity.total)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                        <Scale size={24} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase">Ecuación Patrimonial</h4>
                                        <p className="text-xs font-medium text-slate-500">Activo ({formatCurrency(financialData.assets.total)}) = Pasivo ({formatCurrency(financialData.liabilities.total)}) + Patrimonio ({formatCurrency(financialData.equity.total)})</p>
                                    </div>
                                    <div className="ml-auto">
                                        <div className={cn(
                                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            Math.abs(financialData.assets.total - (financialData.liabilities.total + financialData.equity.total)) < 1 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {Math.abs(financialData.assets.total - (financialData.liabilities.total + financialData.equity.total)) < 1 ? 'Cuadrado' : 'Diferencia en Saldo'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeReport === 'cashflow' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-orange-50/50 p-8 rounded-[32px] border border-orange-100">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-black uppercase text-orange-900 tracking-tight">Aumento / Disminución del Efectivo</h3>
                                    <span className={cn(
                                        "text-2xl font-black",
                                        financialData.cashFlowStatement.increase >= 0 ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {formatCurrency(financialData.cashFlowStatement.increase)}
                                    </span>
                                </div>
                                
                                <div className="space-y-6">
                                    {[
                                        { label: 'Actividades de Operación', value: financialData.cashFlowStatement.operations, desc: 'Flujo de ventas, compras y gastos operativos.' },
                                        { label: 'Actividades de Inversión', value: financialData.cashFlowStatement.investing, desc: 'Flujo de compra/venta de activos fijos.' },
                                        { label: 'Actividades de Financiación', value: financialData.cashFlowStatement.financing, desc: 'Flujo de préstamos y abonos a deuda financiera.' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex gap-6 items-start">
                                            <div className="h-full w-px bg-orange-200 mt-2 self-stretch relative">
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-orange-400 rounded-full" />
                                            </div>
                                            <div className="flex-1 pb-6 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.label}</h4>
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        item.value >= 0 ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        {formatCurrency(item.value)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium italic">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900 rounded-[32px] text-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                        <Wallet size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Efectivo Total Final</h4>
                                        <p className="text-2xl font-black">{formatCurrency(financialData.assets.cash)}</p>
                                    </div>
                                </div>
                                <Activity className="text-white/20" size={40} />
                            </div>
                        </div>
                    )}

                    {activeReport === 'equity' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white border-2 border-slate-900 rounded-[32px] overflow-hidden">
                                <div className="bg-slate-900 p-6 text-white text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-1">Estado de Cambios en el Patrimonio</p>
                                    <h3 className="text-xl font-black uppercase">Resumen de Inversión y Resultados</h3>
                                </div>
                                
                                <div className="p-10 space-y-8">
                                    {[
                                        { label: 'Saldo Patrimonial Inicial (Inyectado + Retenido)', value: financialData.equity.retained },
                                        { label: 'Utilidad Neta del Período Gravable', value: financialData.equity.netIncome, highlight: true },
                                    ].map((item, idx) => (
                                        <div key={idx} className={cn(
                                            "flex items-center justify-between py-6 border-b border-slate-100",
                                            item.highlight && "bg-slate-50 px-6 rounded-2xl border-none"
                                        )}>
                                            <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">{item.label}</span>
                                            <span className={cn(
                                                "text-xl font-black",
                                                item.highlight && "text-indigo-600"
                                            )}>{formatCurrency(item.value)}</span>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between py-8">
                                        <div className="flex items-center gap-3">
                                            <PieChart className="text-slate-400" size={24} />
                                            <h3 className="text-xl font-black text-slate-900 uppercase">Patrimonio Neto Final</h3>
                                        </div>
                                        <span className="text-3xl font-black text-slate-900">{formatCurrency(financialData.equity.total)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-6 bg-indigo-50 rounded-3xl text-indigo-700">
                                <Info size={24} className="flex-shrink-0" />
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest">Nota Contable</h4>
                                    <p className="text-xs font-medium leading-relaxed italic opacity-80">
                                        Este estado refleja cómo el patrimonio de los socios ha variado debido a las operaciones del negocio
                                        y el resultado neto del ejercicio seleccionado. Bajo NIIF pymes, esto asegura la transparencia
                                        sobre el valor real del negocio.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialStatements;
