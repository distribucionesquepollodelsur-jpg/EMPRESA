import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
    const { sales, purchases, cashFlow, config } = useData();

    const stats = useMemo(() => {
        const ingresos = sales.reduce((sum, s) => sum + s.total, 0) + 
                         cashFlow.filter(m => m.type === 'entry' && !m.reason.includes('Venta')).reduce((sum, m) => sum + m.amount, 0);
        
        const egresos = purchases.reduce((sum, p) => sum + p.total, 0) + 
                        cashFlow.filter(m => m.type === 'exit' && !m.reason.includes('Compra')).reduce((sum, m) => sum + m.amount, 0);
        
        return {
            ingresos,
            egresos,
            utilidad: ingresos - egresos
        };
    }, [sales, purchases, cashFlow]);

    const pieData = [
        { name: 'Ingresos', value: stats.ingresos, color: '#22c55e' },
        { name: 'Egresos', value: stats.egresos, color: '#ef4444' }
    ];

    const generateFinancialReport = () => {
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
        doc.text(config.companyName || 'Reporte Financiero', config.logo ? 50 : 14, y - 5);
        doc.setFontSize(10);
        doc.text(`NIT: ${config.nit}`, config.logo ? 50 : 14, y + 2);
        doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, config.logo ? 50 : 14, y + 8);

        y += 20;
        doc.setFontSize(14);
        doc.text('Resumen General', 14, y);
        
        autoTable(doc, {
            head: [['Concepto', 'Total']],
            body: [
                ['Total Ingresos (Ventas + Otros)', formatCurrency(stats.ingresos)],
                ['Total Egresos (Compras + Otros)', formatCurrency(stats.egresos)],
                ['Utilidad Neta', formatCurrency(stats.utilidad)]
            ],
            startY: y + 5,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.text('Movimientos de Caja Recientes', 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
            head: [['Fecha', 'Tipo', 'Monto', 'Concepto']],
            body: cashFlow.slice(-20).map(m => [
                formatDate(m.date),
                m.type === 'entry' ? 'INGRESO' : 'EGRESO',
                formatCurrency(m.amount),
                m.reason
            ]),
            startY: (doc as any).lastAutoTable.finalY + 20,
        });

        doc.save(`reporte-financiero-${Date.now()}.pdf`);
    };

    return (
        <div className="space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Informes Financieros</h1>
                    <p className="text-slate-500 font-medium italic">Análisis profundo de la operación de Que Pollo.</p>
                </div>
                <button 
                    onClick={generateFinancialReport}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                    <Download size={20} /> Exportar Balance PDF
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos Totales</p>
                    <h3 className="text-3xl font-black text-green-600 tracking-tighter">{formatCurrency(stats.ingresos)}</h3>
                    <TrendingUp className="text-green-100 mt-4" size={48} />
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Egresos Totales</p>
                    <h3 className="text-3xl font-black text-red-600 tracking-tighter">{formatCurrency(stats.egresos)}</h3>
                    <TrendingDown className="text-red-100 mt-4" size={48} />
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Margen de Ganancia</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.utilidad)}</h3>
                    <DollarSign className="text-slate-100 mt-4" size={48} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[400px]">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución de Flujo</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 -mt-10">
                        {pieData.map(d => (
                            <div key={d.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-xs font-bold text-slate-500 uppercase">{d.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-3xl text-white overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <FileText className="text-blue-400" /> Movimientos Recientes
                    </h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {cashFlow.slice().reverse().slice(0, 10).map(m => (
                            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(m.date)}</p>
                                    <p className="text-sm font-medium mt-1 truncate max-w-[200px]">{m.reason}</p>
                                </div>
                                <span className={`text-sm font-black ${m.type === 'entry' ? 'text-green-400' : 'text-red-400'}`}>
                                    {m.type === 'entry' ? '+' : '-'}{formatCurrency(m.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
