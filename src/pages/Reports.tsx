import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
    const { sales, purchases, cashFlow, config, employees, attendance, advances, reprimands } = useData();

    const currentPeriod = useMemo(() => {
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth();
        const year = now.getFullYear();
        if (day <= 15) {
            return {
                start: new Date(year, month, 1),
                end: new Date(year, month, 15, 23, 59, 59),
                label: `1ra Quincena - ${format(new Date(year, month, 1), 'MMMM', { locale: es })}`
            };
        } else {
            return {
                start: new Date(year, month, 16),
                end: new Date(year, month + 1, 0, 23, 59, 59),
                label: `2da Quincena - ${format(new Date(year, month, 1), 'MMMM', { locale: es })}`
            };
        }
    }, []);

    const payrollData = useMemo(() => {
        return employees.map(emp => {
            const periodAdvances = advances
                .filter(a => {
                    const d = new Date(a.date);
                    return a.employeeId === emp.id && d >= currentPeriod.start && d <= currentPeriod.end;
                })
                .reduce((sum, a) => sum + a.amount, 0);

            const periodReprimands = reprimands
                .filter(r => {
                    const d = new Date(r.date);
                    return r.employeeId === emp.id && 
                           r.status === 'pending' && 
                           r.type === 'salary_day' && 
                           d >= currentPeriod.start && d <= currentPeriod.end;
                });

            const reprimandDeduction = periodReprimands.length * (emp.salary / 15);

            const periodAttendance = attendance
                .filter(a => {
                    const d = new Date(a.date);
                    return a.employeeId === emp.id && d >= currentPeriod.start && d <= currentPeriod.end && a.status === 'present';
                }).length;

            // Rest day logic: if we assume 15 days, 2 rest days approx.
            // But let's just show sueldo quincenal base.
            const totalToPay = emp.salary - periodAdvances - reprimandDeduction;

            return {
                ...emp,
                periodAdvances,
                reprimandDeduction,
                periodAttendance,
                totalToPay
            };
        });
    }, [employees, advances, attendance, reprimands, currentPeriod]);

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

    const generatePayrollReport = () => {
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
        doc.text(`PRE-NÓMINA: ${currentPeriod.label}`, config.logo ? 50 : 14, y - 5);
        doc.setFontSize(10);
        doc.text(config.companyName, config.logo ? 50 : 14, y + 2);
        doc.text(`Corte: ${format(currentPeriod.start, 'dd/MM/yyyy')} al ${format(currentPeriod.end, 'dd/MM/yyyy')}`, config.logo ? 50 : 14, y + 8);

        autoTable(doc, {
            head: [['Colaborador', 'Sueldo Q.', 'Adelantos', 'Amo. (Días)', 'Asistencia', 'Neto a Pagar']],
            body: payrollData.map(p => [
                p.name,
                formatCurrency(p.salary),
                formatCurrency(p.periodAdvances),
                formatCurrency(p.reprimandDeduction),
                `${p.periodAttendance} días`,
                formatCurrency(p.totalToPay)
            ]),
            startY: y + 20,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`nomina-${currentPeriod.label.replace(/\s+/g, '-')}.pdf`);
    };

    return (
        <div className="space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Informes Financieros</h1>
                    <p className="text-slate-500 font-medium italic">Análisis profundo de la operación de Que Pollo.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={generatePayrollReport}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all outline-none"
                    >
                        <FileText size={20} /> Nómina Quincenal
                    </button>
                    <button 
                        onClick={generateFinancialReport}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        <Download size={20} /> Exportar Balance PDF
                    </button>
                </div>
            </header>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tighter">Resumen de Nómina</h3>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{currentPeriod.label}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corte de Pago</p>
                        <p className="text-sm font-black text-slate-900">{format(currentPeriod.end, 'dd/MM/yyyy')}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sueldo Q.</th>
                                <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Adelantos</th>
                                <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amones.</th>
                                <th className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencia</th>
                                <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Neto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {payrollData.map(p => (
                                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            {p.photo ? (
                                                <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                                    {p.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{p.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Descansa: {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][p.restDay || 0]}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 text-center text-sm font-bold text-slate-600">{formatCurrency(p.salary)}</td>
                                    <td className="py-4 text-center text-sm font-bold text-red-500">-{formatCurrency(p.periodAdvances)}</td>
                                    <td className="py-4 text-center text-sm font-bold text-red-500">-{formatCurrency(p.reprimandDeduction)}</td>
                                    <td className="py-4 text-center text-sm font-black text-blue-600">{p.periodAttendance} Días</td>
                                    <td className="py-4 text-right text-sm font-black text-slate-950">{formatCurrency(p.totalToPay)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
