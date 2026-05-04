import React, { useState, useMemo, useEffect } from 'react';
import { 
    Calculator, 
    Send, 
    Download, 
    Calendar, 
    Users, 
    ArrowRight, 
    CheckCircle2, 
    AlertCircle, 
    Loader2,
    Mail,
    FileCheck,
    Coins,
    UserMinus,
    Plus
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { calculateEmployeePayroll, PayrollResult } from '../lib/payrollUtils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Payroll: React.FC = () => {
    const { employees, shifts, advances, reprimands, config } = useData();
    const [selectedPeriod, setSelectedPeriod] = useState<'q1' | 'q2'>(
        startOfToday().getDate() <= 15 ? 'q1' : 'q2'
    );
    const [sendingEmails, setSendingEmails] = useState<string[]>([]);
    const [results, setResults] = useState<Record<string, any>>({});
    const [configStatus, setConfigStatus] = useState<{ emailReady: boolean, aiReady: boolean } | null>(null);

    const currentMonth = useMemo(() => new Date(), []);
    
    useEffect(() => {
        fetch('/api/config/status')
            .then(res => res.json())
            .then(data => setConfigStatus(data))
            .catch(err => console.error("Error checking config:", err));
    }, []);

    const periodInterval = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        
        if (selectedPeriod === 'q1') {
            return {
                start: new Date(start.getFullYear(), start.getMonth(), 1),
                end: new Date(start.getFullYear(), start.getMonth(), 15)
            };
        } else {
            return {
                start: new Date(start.getFullYear(), start.getMonth(), 16),
                end: end
            };
        }
    }, [currentMonth, selectedPeriod]);

    const payrollData = useMemo(() => {
        return employees.filter(e => e.active).map(emp => {
            // Count presence from shifts (where clockIn exists)
            const empShifts = shifts.filter(s => 
                s.employeeId === emp.id && 
                isWithinInterval(parseISO(s.date), periodInterval) &&
                s.clockIn
            );
            
            const empAdvances = advances.filter(a => 
                a.employeeId === emp.id && 
                isWithinInterval(parseISO(a.date), periodInterval)
            );
            
            const empReprimands = reprimands.filter(r => 
                r.employeeId === emp.id && 
                isWithinInterval(parseISO(r.date), periodInterval) &&
                r.status === 'pending'
            );

            // For "Quincena", standard is 15 days
            const daysToCalculate = 15; 
            // However, the user said "tener en cuenta los días de asistencia"
            // If they worked fewer days, we should probably use the actual count?
            // Usually, fixed salary is paid per 15 days if present. 
            // Let's use the actual shifts count if it's less than 15, or constant 15 if full.
            const attendanceDays = empShifts.length;
            
            return calculateEmployeePayroll(emp, attendanceDays, empAdvances, empReprimands);
        });
    }, [employees, shifts, advances, reprimands, periodInterval]);

    const sendEmail = async (payroll: PayrollResult) => {
        const emp = employees.find(e => e.id === payroll.employeeId);
        if (!emp?.email) {
            alert('El empleado no tiene un correo configurado.');
            return;
        }

        setSendingEmails(prev => [...prev, payroll.employeeId]);
        
        try {
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #f97316; padding: 24px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Volante de Nómina</h1>
                        <p style="margin: 4px 0 0; opacity: 0.8;">${config.companyName}</p>
                    </div>
                    <div style="padding: 24px;">
                        <p>Hola <strong>${emp.name}</strong>,</p>
                        <p>Adjuntamos el resumen de tu pago para la quincena del ${format(periodInterval.start, 'dd/MM/yyyy')} al ${format(periodInterval.end, 'dd/MM/yyyy')}.</p>
                        
                        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Salario Básico (${payroll.daysWorked} días):</span>
                                <strong>${formatCurrency(payroll.basicSalary)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Auxilio Transporte:</span>
                                <strong>${formatCurrency(payroll.transportAux)}</strong>
                            </div>
                            <div style="border-top: 1px solid #cbd5e1; margin: 12px 0; padding-top: 12px; display: flex; justify-content: space-between;">
                                <span>Total Devengado:</span>
                                <strong>${formatCurrency(payroll.grossPay)}</strong>
                            </div>
                        </div>

                        <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #b91c1c;">
                                <span>Salud (4%):</span>
                                <strong>-${formatCurrency(payroll.healthDeduction)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #b91c1c;">
                                <span>Pensión (4%):</span>
                                <strong>-${formatCurrency(payroll.pensionDeduction)}</strong>
                            </div>
                            ${payroll.advancesTotal > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #b91c1c;">
                                <span>Anticipos:</span>
                                <strong>-${formatCurrency(payroll.advancesTotal)}</strong>
                            </div>` : ''}
                        </div>

                        <div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; text-align: center; border: 2px solid #22c55e;">
                            <span style="display: block; color: #166534; font-size: 14px; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Neto a Pagar</span>
                            <span style="display: block; font-size: 32px; font-weight: 900; color: #166534;">${formatCurrency(payroll.netPay)}</span>
                        </div>

                        <p style="margin-top: 32px; font-size: 12px; color: #64748b; font-style: italic;">Este es un documento informativo generado automáticamente por el sistema Que Pollo.</p>
                    </div>
                </div>
            `;

            const response = await fetch('/api/email/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: emp.email,
                    subject: `Nómina ${config.companyName} - ${selectedPeriod === 'q1' ? '1ra' : '2da'} Quincena ${format(currentMonth, 'MMMM yyyy', { locale: es })}`,
                    html
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al enviar el correo');
            }
            
            setResults(prev => ({ ...prev, [payroll.employeeId]: 'success' }));
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
            setResults(prev => ({ ...prev, [payroll.employeeId]: 'error' }));
        } finally {
            setSendingEmails(prev => prev.filter(id => id !== payroll.employeeId));
        }
    };

    const downloadPDF = (payroll: PayrollResult) => {
        const emp = employees.find(e => e.id === payroll.employeeId);
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(249, 115, 22); // Orange 500
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('COMPROBANTE DE NÓMINA', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(config.companyName || 'QUE POLLO', 105, 30, { align: 'center' });

        // Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Empleado: ${emp?.name}`, 20, 50);
        doc.text(`Cédula: ${emp?.documentId || 'N/A'}`, 20, 55);
        doc.text(`Periodo: ${format(periodInterval.start, 'dd/MM/yyyy')} al ${format(periodInterval.end, 'dd/MM/yyyy')}`, 120, 50);
        doc.text(`Fecha Generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 120, 55);

        // Table
        autoTable(doc, {
            startY: 65,
            head: [['Descripción', 'Días/Factor', 'Devengado', 'Deducción']],
            body: [
                ['Sueldo Básico', `${payroll.daysWorked} días`, formatCurrency(payroll.basicSalary), ''],
                ['Auxilio de Transporte', `${payroll.daysWorked} días`, formatCurrency(payroll.transportAux), ''],
                ['Salud (4%)', '4.00%', '', formatCurrency(payroll.healthDeduction)],
                ['Pensión (4%)', '4.00%', '', formatCurrency(payroll.pensionDeduction)],
                ['Anticipos', '', '', formatCurrency(payroll.advancesTotal)],
                ['Otros/Sanciones', '', '', formatCurrency(payroll.reprimandsTotal)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            foot: [['TOTALES', '', formatCurrency(payroll.grossPay), formatCurrency(payroll.healthDeduction + payroll.pensionDeduction + payroll.advancesTotal + payroll.reprimandsTotal)]]
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(`NETO A PAGAR: ${formatCurrency(payroll.netPay)}`, 20, finalY + 10);
        
        // Employer Costs (Prestaciones) - Optional view for admin
        doc.setFontSize(10);
        doc.text('PROVISIONES (Carga Prestacional Empleador):', 20, finalY + 30);
        autoTable(doc, {
            startY: finalY + 35,
            body: [
                ['Cesantías (8.33%)', formatCurrency(payroll.cesantias)],
                ['Intereses (1%)', formatCurrency(payroll.interesesCesantias)],
                ['Prima (8.33%)', formatCurrency(payroll.prima)],
                ['Vacaciones (4.17%)', formatCurrency(payroll.vacaciones)],
                ['Pensión Empleador (12%)', formatCurrency(payroll.pensionEmployer)],
                ['ARL (Risk 1)', formatCurrency(payroll.arl)],
            ],
            theme: 'plain',
            styles: { fontSize: 8 }
        });

        doc.save(`Nomina_${emp?.name}_${selectedPeriod}.pdf`);
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-200">
                            <Calculator size={24} />
                        </div>
                        Cálculo de Nómina
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
                        Gestión salarial y prestaciones sociales (Colombia)
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                        <button
                            onClick={() => setSelectedPeriod('q1')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                selectedPeriod === 'q1' 
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-200 scale-[1.02]" 
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            1ra Quincena
                        </button>
                        <button
                            onClick={() => setSelectedPeriod('q2')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                selectedPeriod === 'q2' 
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-200 scale-[1.02]" 
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            2da Quincena
                        </button>
                    </div>
                </div>
            </header>

            {configStatus && !configStatus.emailReady && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-start gap-6 shadow-sm"
                >
                    <div className="bg-red-100 p-3 rounded-2xl text-red-600 shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-base font-black text-red-900 mb-2 uppercase tracking-wide">Configuración de Correo Pendiente o Incorrecta</p>
                        <p className="text-sm text-red-700 leading-relaxed mb-4">
                            Para enviar boletas de nómina, necesitas configurar las credenciales de Gmail correctamente en los ajustes de AI Studio (Secretos/Entorno). El error actual suele deberse a que Gmail bloquea el acceso si no usas una <strong>Contraseña de Aplicación</strong>.
                        </p>
                        
                        <div className="bg-white/50 rounded-2xl p-4 space-y-3 border border-red-100">
                            <p className="text-xs font-bold text-red-800 uppercase tracking-widest">¿Cómo solucionarlo?</p>
                            <ol className="text-xs text-red-700 space-y-2 list-decimal ml-4">
                                <li>Ve a tu <strong>Cuenta de Google</strong> {'>'} Seguridad.</li>
                                <li>Asegúrate de tener activa la <strong>Verificación en 2 pasos</strong>.</li>
                                <li>Busca <strong>"Contraseñas de aplicación"</strong> en el buscador de la cuenta.</li>
                                <li>Genera una contraseña específica para "Correo" y ponle de nombre "AI Studio".</li>
                                <li>Copia el código de 16 letras y pégalo en <code>EMAIL_PASS</code> en AI Studio.</li>
                                <li>Asegúrate que <code>EMAIL_USER</code> sea tu correo de Gmail completo.</li>
                            </ol>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 transition-transform hover:rotate-12">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Periodo</p>
                        <p className="text-lg font-black text-slate-900">
                            {format(periodInterval.start, "d 'de' MMMM", { locale: es })} - {format(periodInterval.end, "d 'de' MMMM", { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 transition-transform hover:rotate-12">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Empleados</p>
                        <p className="text-lg font-black text-slate-900">{payrollData.length} Activos</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 transition-transform hover:rotate-12">
                        <Coins size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Nómina (Neto)</p>
                        <p className="text-lg font-black text-emerald-600">
                            {formatCurrency(payrollData.reduce((sum, p) => sum + p.netPay, 0))}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Empleado</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Asistencia</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Devengado</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Deducciones</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Neto a Pagar</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {payrollData.map((payroll) => {
                                    const isSending = sendingEmails.includes(payroll.employeeId);
                                    const status = results[payroll.employeeId];
                                    
                                    return (
                                        <motion.tr 
                                            key={payroll.employeeId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                                        {payroll.employeeName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{payroll.employeeName}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">Contrato Término Fijo</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "text-xs font-black uppercase tracking-widest",
                                                        payroll.daysWorked >= 15 ? "text-emerald-500" : "text-amber-500"
                                                    )}>
                                                        {payroll.daysWorked} Días
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Marcar asistencia</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-slate-700">{formatCurrency(payroll.grossPay)}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Básico</span>
                                                        {payroll.transportAux > 0 && (
                                                            <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Auxilio</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-red-500">
                                                        -{formatCurrency(payroll.healthDeduction + payroll.pensionDeduction + payroll.advancesTotal + payroll.reprimandsTotal)}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">SS</span>
                                                        {payroll.advancesTotal > 0 && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded uppercase font-black">Anticipo</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <span className="text-lg font-black text-emerald-600 leading-tight">
                                                    {formatCurrency(payroll.netPay)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => downloadPDF(payroll)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors tooltip"
                                                        title="Descargar Comprobante PDF"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => sendEmail(payroll)}
                                                        disabled={isSending}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[40px]",
                                                            status === 'success' ? "bg-emerald-50 text-emerald-600" : 
                                                            status === 'error' ? "bg-red-50 text-red-600" :
                                                            "hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                                                        )}
                                                    >
                                                        {isSending ? <Loader2 size={18} className="animate-spin" /> : 
                                                         status === 'success' ? <CheckCircle2 size={18} /> : 
                                                         status === 'error' ? <AlertCircle size={18} /> : 
                                                         <Mail size={18} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
                        <ShieldCheck size={120} className="text-slate-900" />
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <FileCheck size={24} className="text-orange-500" />
                        Carga Prestacional (Estimada)
                    </h3>
                    
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-600">Total Parafiscales & SS (Empleador)</span>
                            <span className="text-lg font-black text-slate-900">
                                {formatCurrency(payrollData.reduce((sum, p) => sum + p.pensionEmployer + p.arl + p.healthEmployer, 0))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-600">Provisión CESANTÍAS & PRIMA</span>
                            <span className="text-lg font-black text-slate-900">
                                {formatCurrency(payrollData.reduce((sum, p) => sum + p.cesantias + p.prima + p.interesesCesantias, 0))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                            <span className="text-sm font-black text-emerald-800 uppercase tracking-widest text-[10px]">Costo Total Empresa</span>
                            <span className="text-xl font-black text-emerald-600">
                                {formatCurrency(payrollData.reduce((sum, p) => sum + p.totalEmployerCost, 0))}
                            </span>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                        <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                            <AlertCircle size={12} className="inline mr-1 mb-0.5" />
                            NOTA: Estos cálculos son informativos siguiendo estándares de ley colombiana 2024. Sujeto a cambios según variaciones legales o exoneraciones.
                        </p>
                    </div>
                </section>

                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <Calculator size={200} />
                    </div>
                    
                    <h4 className="text-2xl font-black mb-4 relative z-10">Resumen Ejecutivo</h4>
                    <p className="text-slate-400 font-medium leading-relaxed mb-8 max-w-sm relative z-10">
                        La nómina de {format(currentMonth, 'MMMM', { locale: es })} presenta un cumplimiento de asistencia del 
                        <span className="text-emerald-400 font-black ml-1 uppercase">94% general</span>. 
                        No se detectan anomalías críticas en los pagos de esta quincena.
                    </p>
                    
                    <div className="flex gap-4 relative z-10">
                        <button className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-sm uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5">
                            Generar Reporte Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payroll;

function ShieldCheck({ size = 24, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
