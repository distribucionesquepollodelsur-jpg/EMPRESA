import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
    Plus, 
    CreditCard, 
    Trash2, 
    Search, 
    Calendar, 
    ChevronRight, 
    X, 
    History, 
    DollarSign, 
    User,
    Truck,
    CheckCircle2,
    Clock
} from 'lucide-react';

const VehicleInstallments: React.FC = () => {
    const { 
        vehicleInstallments, 
        addVehicleInstallment, 
        addVehicleInstallmentPayment, 
        deleteVehicleInstallmentPayment, 
        deleteVehicleInstallment 
    } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [personName, setPersonName] = useState('');
    const [vehicleDescription, setVehicleDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Abono state
    const [abonoAmount, setAbonoAmount] = useState<number>(0);
    const [abonoMethod, setAbonoMethod] = useState('Efectivo');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personName || !vehicleDescription) return;

        await addVehicleInstallment({
            personName,
            vehicleDescription,
            totalAmount: totalAmount || 0,
            date: new Date(date).toISOString()
        });
        
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setPersonName('');
        setVehicleDescription('');
        setTotalAmount(0);
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleAbonoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstallment || abonoAmount <= 0) return;

        await addVehicleInstallmentPayment(selectedInstallment.id, abonoAmount, abonoMethod);
        setIsAbonoModalOpen(false);
        setAbonoAmount(0);
        setSelectedInstallment(null);
    };

    const sortedInstallments = [...vehicleInstallments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredInstallments = sortedInstallments.filter(v => 
        v.personName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.vehicleDescription.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOwed = vehicleInstallments.reduce((sum, v) => sum + (v.totalAmount - (v.paidAmount || 0)), 0);
    const totalCollected = vehicleInstallments.reduce((sum, v) => sum + (v.paidAmount || 0), 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <CreditCard size={32} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Abonos Vehículo</h2>
                        <p className="text-slate-500 font-medium tracking-tight">Registro de personas pagando vehículos por cuotas.</p>
                    </div>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                    >
                        <Plus size={20} /> Registrar Venta Vehículo
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <DollarSign size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendiente por Cobrar</p>
                    <h3 className="text-3xl font-black tracking-tighter text-slate-900">
                        {formatCurrency(totalOwed)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldos Definidos</span>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recaudado</p>
                    <h3 className="text-3xl font-black tracking-tighter text-emerald-600">
                        {formatCurrency(totalCollected)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capital Recuperado</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar por persona o vehículo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-600/10 outline-none transition-all font-bold placeholder:text-slate-300"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-10 py-6">Persona / Vehículo</th>
                                <th className="px-10 py-6">Fecha Inicio</th>
                                <th className="px-10 py-6 text-center">Progreso</th>
                                <th className="px-10 py-6 text-right">Saldo / Acumulado</th>
                                <th className="px-10 py-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 italic">
                            {filteredInstallments.map(installment => {
                                const hasTotal = (installment.totalAmount || 0) > 0;
                                const balance = hasTotal ? installment.totalAmount - (installment.paidAmount || 0) : 0;
                                const progress = hasTotal ? (installment.paidAmount / installment.totalAmount) * 100 : 0;
                                return (
                                    <tr key={installment.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg">
                                                    {installment.personName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 not-italic text-base">{installment.personName}</span>
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight flex items-center gap-1">
                                                        <Truck size={10} /> {installment.vehicleDescription}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase">
                                                <Calendar size={12} className="text-slate-400" />
                                                {formatDate(installment.date)}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            {hasTotal ? (
                                                <div className="flex flex-col gap-2 w-32 mx-auto">
                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                        <span>{Math.round(progress)}%</span>
                                                        <span>{formatCurrency(installment.paidAmount)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Sin meta fija</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "font-black text-xl tracking-tighter not-italic",
                                                    hasTotal ? (balance > 0 ? "text-slate-900" : "text-emerald-600") : "text-blue-600"
                                                )}>
                                                    {hasTotal 
                                                        ? (balance > 0 ? formatCurrency(balance) : 'SALDADO')
                                                        : formatCurrency(installment.paidAmount)
                                                    }
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-1 italic">
                                                    {hasTotal ? `Total: ${formatCurrency(installment.totalAmount)}` : 'Total Recaudado'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                {(!hasTotal || balance > 0) && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedInstallment(installment);
                                                            setIsAbonoModalOpen(true);
                                                        }}
                                                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md"
                                                        title="Registrar Abono"
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        setSelectedInstallment(installment);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Historial de Pagos"
                                                >
                                                    <History size={20} />
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => {
                                                            if (window.confirm('¿Eliminar este registro de cuotas?')) {
                                                                deleteVehicleInstallment(installment.id);
                                                            }
                                                        }}
                                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredInstallments.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <CreditCard size={48} className="mx-auto text-slate-100 mb-4" />
                                        <p className="text-slate-400 font-bold italic">No hay registros de abonos de vehículos.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para Nuevo Registro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 space-y-8 animate-in zoom-in duration-200">
                        <header className="text-center space-y-3">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Truck size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nueva Venta de Vehículo</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Apertura de seguimiento de cuotas</p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Cliente</label>
                                <input 
                                    type="text" 
                                    required
                                    autoFocus
                                    value={personName}
                                    onChange={e => setPersonName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold placeholder:text-slate-300"
                                    placeholder="Nombre completo..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción del Vehículo</label>
                                <input 
                                    type="text" 
                                    required
                                    value={vehicleDescription}
                                    onChange={e => setVehicleDescription(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold placeholder:text-slate-300"
                                    placeholder="Ej: Camión NKR Blanco Placa XYZ-123"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto Total de Venta (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                    <input 
                                        type="number" 
                                        value={totalAmount || ''}
                                        onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-600/10 outline-none text-xl font-black text-slate-900"
                                        placeholder="Deja en 0 si no hay monto total definido"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Inicio</label>
                                <input 
                                    type="date" 
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                    Crear Registro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAbonoModalOpen && selectedInstallment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-10 space-y-8 animate-in zoom-in duration-200">
                        <header className="text-center space-y-3">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">RECIBIR ABONO</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedInstallment.personName}</p>
                        </header>

                        <div className="p-6 bg-blue-600 rounded-3xl text-white flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
                                {selectedInstallment.totalAmount > 0 ? 'Saldo Pendiente' : 'Total Acumulado'}
                            </span>
                            <span className="font-black text-3xl tracking-tighter">
                                {selectedInstallment.totalAmount > 0 
                                    ? formatCurrency(selectedInstallment.totalAmount - (selectedInstallment.paidAmount || 0))
                                    : formatCurrency(selectedInstallment.paidAmount || 0)
                                }
                            </span>
                        </div>

                        <form onSubmit={handleAbonoSubmit} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Valor a Recibir</label>
                                <input 
                                    type="number" 
                                    required
                                    autoFocus
                                    max={selectedInstallment.totalAmount > 0 ? selectedInstallment.totalAmount - (selectedInstallment.paidAmount || 0) : undefined}
                                    value={abonoAmount || ''}
                                    onChange={e => setAbonoAmount(parseFloat(e.target.value))}
                                    className="w-full px-6 py-6 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-600/10 outline-none text-3xl font-black text-slate-900 text-center tracking-tighter"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Método de Operación</label>
                                <select 
                                    value={abonoMethod}
                                    onChange={e => setAbonoMethod(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                                >
                                    <option value="Efectivo">Efectivo (Caja)</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                    Confirmar Abono
                                </button>
                                <button type="button" onClick={() => setIsAbonoModalOpen(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalle / Historial */}
            {isDetailModalOpen && selectedInstallment && (
                <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white h-full w-full max-w-lg shadow-3xl flex flex-col animate-in slide-in-from-right duration-300 font-sans italic">
                        <div className="p-10 bg-slate-900 text-white space-y-8 relative overflow-hidden">
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex gap-6 items-center">
                                    <div className="w-16 h-16 bg-white/10 rounded-[28px] flex items-center justify-center border border-white/10 shadow-inner">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black not-italic uppercase tracking-tighter leading-none">{selectedInstallment.personName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-2">{selectedInstallment.vehicleDescription}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                                    <X size={28} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Monto Total</p>
                                    <p className="text-xl font-black not-italic tracking-tighter">
                                        {selectedInstallment.totalAmount > 0 ? formatCurrency(selectedInstallment.totalAmount) : 'No definido'}
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 border-blue-500/30">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                                        {selectedInstallment.totalAmount > 0 ? 'Saldo Restante' : 'Total Acumulado'}
                                    </p>
                                    <p className="text-3xl font-black text-blue-400 not-italic tracking-tighter">
                                        {selectedInstallment.totalAmount > 0 
                                            ? formatCurrency(selectedInstallment.totalAmount - (selectedInstallment.paidAmount || 0))
                                            : formatCurrency(selectedInstallment.paidAmount || 0)
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <History size={18} />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronograma de Abonos</h4>
                            </div>

                            <div className="space-y-4">
                                {selectedInstallment.payments && selectedInstallment.payments.map((p: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex justify-between items-center group transition-all hover:shadow-md hover:scale-[1.02]">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="text-sm font-black text-slate-900 not-italic">{formatDate(p.date)}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Método: <span className="text-slate-600">{p.method}</span></p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="font-black text-xl tracking-tighter not-italic text-emerald-600">
                                                +{formatCurrency(p.amount)}
                                            </span>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('¿Anular este abono?')) {
                                                            deleteVehicleInstallmentPayment(selectedInstallment.id, idx);
                                                            setIsDetailModalOpen(false);
                                                        }
                                                    }}
                                                    className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!selectedInstallment.payments || selectedInstallment.payments.length === 0) && (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <CreditCard size={48} className="text-slate-100" />
                                        <p className="text-sm text-slate-300 italic">No se registran abonos aún.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleInstallments;
