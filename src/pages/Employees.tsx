import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Users, Plus, Calendar, DollarSign, UserCheck, ShieldAlert, BadgeInfo, Trash2, Clock, Coffee, Utensils, AlertCircle, CheckCircle2, LogOut, Eye, EyeOff } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Employee, Shift } from '../types';
import { format, isAfter, setHours, setMinutes, parseISO } from 'date-fns';

import { useData } from '../context/DataContext';

const TimeButton: React.FC<{ label: string, icon: React.ReactNode, time?: string, onClick: () => void, disabled?: boolean }> = ({ label, icon, time, onClick, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled || !!time}
        className={cn(
            "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1 h-20 w-20 sm:w-24",
            time 
                ? "bg-green-50 border-green-200 text-green-600 shadow-sm" 
                : disabled 
                    ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50 active:scale-95"
        )}
    >
        <div className={cn("p-1.5 rounded-lg", time ? "bg-green-100" : "bg-slate-100")}>
            {icon}
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none mt-1">
            {time ? format(parseISO(time), 'HH:mm') : label}
        </span>
    </button>
);

const Employees: React.FC = () => {
    const { employees, attendance, advances, shifts, reprimands, addEmployee, updateEmployee, markAttendance, addAdvance, addReprimand, resolveReprimand, updateShift, deleteEmployee } = useData();
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<'roster' | 'attendance'>('roster');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [isReprimandModalOpen, setIsReprimandModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [justification, setJustification] = useState('');
    const [showJustifyModal, setShowJustifyModal] = useState<{type: keyof Shift, empId: string} | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<'admin' | 'employee'>('employee');
    const [salary, setSalary] = useState(0);
    const [restDay, setRestDay] = useState<number>(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [advanceError, setAdvanceError] = useState('');

    // Reprimand inputs
    const [reprimandReason, setReprimandReason] = useState('');
    const [reprimandType, setReprimandType] = useState<'time' | 'salary_day'>('time');
    const [reprimandHours, setReprimandHours] = useState(0);

    const daysOfWeek = [
        "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
    ];

    const getEmployeePresenceCount = (id: string) => {
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth();
        const year = now.getFullYear();

        let periodStart: Date;
        let periodEnd: Date;

        if (day <= 15) {
            periodStart = new Date(year, month, 1);
            periodEnd = new Date(year, month, 15, 23, 59, 59);
        } else {
            periodStart = new Date(year, month, 16);
            periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
        }

        return attendance.filter(a => a.employeeId === id && 
                                   a.status === 'present' &&
                                   new Date(a.date) >= periodStart &&
                                   new Date(a.date) <= periodEnd).length;
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            alert("Por favor completa todos los campos (Nombre, Email y Contraseña)");
            return;
        }
        const employeeData = { 
            name: name.trim(), 
            email: email.trim().toLowerCase(), 
            password: password.trim(), 
            role, 
            salary,
            photo,
            restDay
        };
        addEmployee(employeeData);
        alert(`Empleado ${employeeData.name} registrado con éxito. Ya puede ingresar al sistema con su correo y contraseña.`);
        resetForm();
        setIsAddModalOpen(false);
    };

    const handleUpdateEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        const updates: Partial<Employee> = {
            name,
            email,
            password,
            role,
            salary,
            photo,
            restDay
        };

        updateEmployee(selectedEmployee.id, updates);
        alert("Información del empleado actualizada correctamente.");
        setIsEditModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setPhoto(null);
        setEmail('');
        setPassword('');
        setRole('employee');
        setSalary(0);
        setRestDay(0);
        setSelectedEmployee(null);
        setReprimandReason('');
        setReprimandType('time');
        setReprimandHours(0);
    };

    const openEditModal = (emp: Employee) => {
        setSelectedEmployee(emp);
        setName(emp.name);
        setEmail(emp.email || '');
        setPassword(emp.password || '');
        setRole(emp.role);
        setSalary(emp.salary);
        setPhoto(emp.photo || null);
        setRestDay(emp.restDay || 0);
        setIsEditModalOpen(true);
    };

    const handleAddAdvance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        
        processAdvance(selectedEmployee.id, advanceAmount);
    };

    const handleAddReprimand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !reprimandReason) return;

        addReprimand({
            employeeId: selectedEmployee.id,
            reason: reprimandReason,
            type: reprimandType,
            hours: reprimandType === 'time' ? reprimandHours : undefined
        });

        alert("Amonestación registrada correctamente.");
        setIsReprimandModalOpen(false);
        resetForm();
    };

    const processAdvance = async (id: string, amount: number) => {
        const error = await addAdvance(id, amount);
        if (error) {
            setAdvanceError(error);
        } else {
            setAdvanceAmount(0);
            setIsAdvanceModalOpen(false);
            setAdvanceError('');
        }
    }

    const getEmployeeAdvances = (id: string) => {
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth();
        const year = now.getFullYear();

        let periodStart: Date;
        let periodEnd: Date;

        if (day <= 15) {
            periodStart = new Date(year, month, 1);
            periodEnd = new Date(year, month, 15, 23, 59, 59);
        } else {
            periodStart = new Date(year, month, 16);
            periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
        }

        return advances
            .filter(a => a.employeeId === id && 
                        new Date(a.date) >= periodStart &&
                        new Date(a.date) <= periodEnd)
            .reduce((sum, a) => sum + a.amount, 0);
    };

    const handleShiftUpdate = (empId: string, type: keyof Shift, manualJustification?: string) => {
        // Validation logic for schedules
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const timeInMinutes = hour * 60 + minute;

        // Start 6:00 AM (360 mins)
        if (type === 'clockIn' && timeInMinutes > 375) { // 15 min grace
            if (!manualJustification && !justification) {
                setShowJustifyModal({ type, empId });
                return;
            }
        }

        // Breakfast 8:15-8:30 (495 - 510)
        // Lunch 12:00-2:00 (720 - 840)
        
        updateShift(empId, type as any, manualJustification || justification);
        setJustification('');
        setShowJustifyModal(null);
    };

    const getShiftForEmp = (id: string) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return shifts.find(s => s.employeeId === id && s.date === today);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Talento Humano</h1>
                    <div className="flex gap-4 mt-2">
                        <button 
                            onClick={() => setActiveView('roster')}
                            className={cn("text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all", 
                                activeView === 'roster' ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400")}
                        >
                            Nómina y Personal
                        </button>
                        <button 
                            onClick={() => setActiveView('attendance')}
                            className={cn("text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all", 
                                activeView === 'attendance' ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400")}
                        >
                            Control de Horarios
                        </button>
                    </div>
                </div>
                {activeView === 'roster' && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                    >
                        <Plus size={20} /> Registrar Empleado
                    </button>
                )}
            </header>

            {activeView === 'roster' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {employees.map(emp => (
                    <div key={emp.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-start">
                            <div className="flex gap-4">
                                {emp.photo ? (
                                    <img src={emp.photo} alt={emp.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                        <Users size={32} strokeWidth={1.5} />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-slate-900 capitalize">{emp.name}</h3>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Sueldo Quincenal: {formatCurrency(emp.salary)}</span>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-bold text-slate-400">Descanso: {daysOfWeek[emp.restDay || 0]}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{emp.email}</span>
                                        <div className="flex gap-4 items-center">
                                            <button 
                                                onClick={() => alert(`La contraseña de ${emp.name} es: ${emp.password}`)}
                                                className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-left hover:underline"
                                            >
                                                Ver Contraseña
                                            </button>
                                            <button 
                                                onClick={() => openEditModal(emp)}
                                                className="text-[10px] font-black text-orange-500 uppercase tracking-widest text-left hover:underline flex items-center gap-1"
                                            >
                                                <Plus size={10} /> Editar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    emp.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-green-50 text-green-600 border-green-200"
                                )}>
                                    {emp.role === 'admin' ? 'Admin' : 'Empleado'}
                                </span>
                                <button 
                                    onClick={() => deleteEmployee(emp.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencia Mes</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="text-blue-500" size={16} />
                                    <span className="text-lg font-black text-slate-900">{getEmployeePresenceCount(emp.id)} Días</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adelantos Hoy</p>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="text-orange-500" size={16} />
                                    <span className="text-lg font-black text-slate-900">{formatCurrency(getEmployeeAdvances(emp.id))}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidad</p>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="text-red-500" size={16} />
                                    <span className="text-lg font-black text-slate-900">
                                        {formatCurrency((emp.salary * 0.3) - getEmployeeAdvances(emp.id))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-50 grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <button 
                                onClick={() => {
                                    markAttendance(emp.id, 'present');
                                    alert(`Asistencia marcada para ${emp.name}`);
                                }}
                                className="py-3 bg-slate-100 text-slate-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <UserCheck size={16} /> Pasar Lista
                            </button>
                            <button 
                                onClick={() => {
                                    setSelectedEmployee(emp);
                                    setIsReprimandModalOpen(true);
                                }}
                                className="py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 border border-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <ShieldAlert size={16} /> Amonestar
                            </button>
                            <button 
                                onClick={() => {
                                    setSelectedEmployee(emp);
                                    setIsAdvanceModalOpen(true);
                                }}
                                className="py-3 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 col-span-2 lg:col-span-1"
                            >
                                <Plus size={16} /> Adelanto
                            </button>
                        </div>
                        
                        {/* Pending reprimands display */}
                        {reprimands.filter(r => r.employeeId === emp.id && r.status === 'pending').length > 0 && (
                            <div className="px-8 pb-8 pt-2 space-y-3">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldAlert size={10} /> Amonestaciones Pendientes
                                </p>
                                <div className="space-y-2">
                                    {reprimands
                                        .filter(r => r.employeeId === emp.id && r.status === 'pending')
                                        .map(r => (
                                            <div key={r.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between group">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-red-900">{r.reason}</span>
                                                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest">
                                                        {r.type === 'time' ? `${r.hours}h de Recargo` : 'Día de Sueldo'} · {formatDate(r.date)}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => resolveReprimand(r.id)}
                                                    className="p-1 text-red-300 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                    title="Marcar como cumplida"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {employees.length === 0 && (
                    <div className="lg:col-span-2 py-32 flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-[40px]">
                        <Users size={64} strokeWidth={1} />
                        <p className="font-bold uppercase tracking-widest italic">No hay empleados registrados</p>
                    </div>
                )}
            </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl flex gap-4">
                        <AlertCircle className="text-orange-500 flex-shrink-0" size={24} />
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-orange-950 uppercase tracking-tight">Horarios Mandatorios</h4>
                            <p className="text-xs text-orange-800 font-medium tracking-tight">
                                Entrada: 6:00 AM • Desayuno: 8:15 – 8:30 • Almuerzo: 12:00 – 2:00 PM. <br/>
                                Registros fuera de horario requieren justificación obligatoria.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {employees.map(emp => {
                            const shift = getShiftForEmp(emp.id);
                            return (
                                <div key={emp.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        {emp.photo ? (
                                            <img src={emp.photo} alt={emp.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">
                                                {emp.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-black text-slate-900">{emp.name}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.role}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                        <TimeButton 
                                            label="Entrada" 
                                            icon={<Clock size={14}/>} 
                                            time={shift?.clockIn} 
                                            onClick={() => handleShiftUpdate(emp.id, 'clockIn')}
                                        />
                                        <TimeButton 
                                            label="Desayuno" 
                                            icon={<Coffee size={14}/>} 
                                            time={shift?.breakfastStart} 
                                            onClick={() => handleShiftUpdate(emp.id, 'breakfastStart')}
                                        />
                                        <TimeButton 
                                            label="Fin Des." 
                                            icon={<CheckCircle2 size={14}/>} 
                                            time={shift?.breakfastEnd} 
                                            onClick={() => handleShiftUpdate(emp.id, 'breakfastEnd')}
                                            disabled={!shift?.breakfastStart}
                                        />
                                        <TimeButton 
                                            label="Almuerzo" 
                                            icon={<Utensils size={14}/>} 
                                            time={shift?.lunchStart} 
                                            onClick={() => handleShiftUpdate(emp.id, 'lunchStart')}
                                        />
                                        <TimeButton 
                                            label="Fin Alm." 
                                            icon={<CheckCircle2 size={14}/>} 
                                            time={shift?.lunchEnd} 
                                            onClick={() => handleShiftUpdate(emp.id, 'lunchEnd')}
                                            disabled={!shift?.lunchStart}
                                        />
                                        <TimeButton 
                                            label="Salida" 
                                            icon={<LogOut size={14}/>} 
                                            time={shift?.clockOut} 
                                            onClick={() => handleShiftUpdate(emp.id, 'clockOut')}
                                            disabled={!shift?.clockIn}
                                        />
                                    </div>

                                    {shift?.justification && (
                                        <div className="px-3 py-2 bg-slate-50 text-[10px] text-slate-500 font-bold rounded-lg border border-slate-100 max-w-[150px] truncate" title={shift.justification}>
                                            💬 {shift.justification}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Attendance History Preview */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                    <Calendar className="text-slate-400" /> Últimos Movimientos de Personal
                </h3>
                <div className="space-y-4">
                    {[...attendance].reverse().slice(0, 5).map(record => {
                        const emp = employees.find(e => e.id === record.employeeId);
                        return (
                            <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    {emp?.photo ? (
                                        <img src={emp.photo} alt={emp.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100">
                                            <Users size={18} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{emp?.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatDate(record.date)}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">Asistencia Ok</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals */}
            {showJustifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl p-8 space-y-6">
                        <header className="text-center space-y-2">
                            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tighter">Justificación Requerida</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">Estas fuera de horario para "{showJustifyModal.type}". ¿Qué sucedió?</p>
                        </header>
                        <textarea 
                            autoFocus
                            required
                            value={justification}
                            onChange={e => setJustification(e.target.value)}
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-medium text-slate-900"
                            placeholder="Escribe el motivo..."
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowJustifyModal(null)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleShiftUpdate(showJustifyModal.empId, showJustifyModal.type, justification)}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all text-xs uppercase tracking-widest shadow-lg shadow-slate-950/10"
                            >
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Editar Empleado</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">Actualiza la información de {selectedEmployee?.name}.</p>
                        </header>
                        
                        <form onSubmit={handleUpdateEmployee} className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <label className="relative group cursor-pointer">
                                    <div className="w-24 h-24 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group-hover:border-slate-400 transition-all overflow-hidden">
                                        {photo ? (
                                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <Plus size={24} />
                                                <span className="text-[10px] font-bold uppercase">Foto</span>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={e => setEmail(e.target.value.trim())}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            required 
                                            value={password}
                                            onChange={e => setPassword(e.target.value.trim())}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950 text-sm"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-3 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Rol</label>
                                    <select 
                                        value={role}
                                        onChange={e => setRole(e.target.value as any)}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                    >
                                        <option value="employee">Empleado</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Sueldo Quincenal</label>
                                    <input 
                                        type="number" 
                                        required 
                                        value={salary}
                                        onChange={e => setSalary(parseFloat(e.target.value))}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Día de Descanso</label>
                                <select 
                                    value={restDay}
                                    onChange={e => setRestDay(parseInt(e.target.value))}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                >
                                    {daysOfWeek.map((day, idx) => (
                                        <option key={idx} value={idx}>{day}</option>
                                    ))}
                                </select>
                             </div>

                            <div className="flex flex-col gap-3 pt-6">
                                <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all">
                                    Guardar Cambios
                                </button>
                                <button type="button" onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Nuevo Empleado</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">Completa los datos para el ingreso al sistema.</p>
                        </header>
                        
                        <form onSubmit={handleAddEmployee} className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <label className="relative group cursor-pointer">
                                    <div className="w-24 h-24 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group-hover:border-slate-400 transition-all overflow-hidden">
                                        {photo ? (
                                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <Plus size={24} />
                                                <span className="text-[10px] font-bold uppercase">Foto</span>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                    placeholder="Juan Manuel Pérez"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={e => setEmail(e.target.value.trim())}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950 text-sm"
                                        placeholder="juan@quepollo.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            required 
                                            value={password}
                                            onChange={e => setPassword(e.target.value.trim())}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950 text-sm"
                                            placeholder="••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-3 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Rol</label>
                                    <select 
                                        value={role}
                                        onChange={e => setRole(e.target.value as any)}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                    >
                                        <option value="employee">Empleado</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Sueldo Quincenal</label>
                                    <input 
                                        type="number" 
                                        required 
                                        value={salary}
                                        onChange={e => setSalary(parseFloat(e.target.value))}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Día de Descanso</label>
                                <select 
                                    value={restDay}
                                    onChange={e => setRestDay(parseInt(e.target.value))}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-950 outline-none transition-all font-bold text-slate-950"
                                >
                                    {daysOfWeek.map((day, idx) => (
                                        <option key={idx} value={idx}>{day}</option>
                                    ))}
                                </select>
                             </div>
                            
                            <div className="flex flex-col gap-3 pt-6">
                                <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-950/20 active:scale-95 transition-all">
                                    Registrar con Éxito
                                </button>
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAdvanceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Entregar Adelanto</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight italic">Para: {selectedEmployee?.name}</p>
                        </header>

                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4">
                            <BadgeInfo className="text-blue-500 flex-shrink-0" size={24} />
                            <div className="space-y-1">
                                <p className="text-[10px] text-blue-800 font-black uppercase tracking-widest">Tope Legal (30%)</p>
                                <p className="text-sm font-bold text-blue-900">{formatCurrency((selectedEmployee?.salary || 0) * 0.3)}</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleAddAdvance} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Monto a Entregar</label>
                                <input 
                                    type="number" 
                                    required 
                                    autoFocus
                                    value={advanceAmount}
                                    onChange={e => {
                                        setAdvanceAmount(parseFloat(e.target.value));
                                        setAdvanceError('');
                                    }}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-slate-950 text-xl"
                                    placeholder="50000"
                                />
                            </div>

                            {advanceError && (
                                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-3">
                                    <ShieldAlert size={16} /> {advanceError}
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-3 pt-6">
                                <button className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                                    Procesar Pago
                                </button>
                                <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Cerrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isReprimandModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <header className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Registrar Amonestación</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight italic">Para: {selectedEmployee?.name}</p>
                        </header>

                        <form onSubmit={handleAddReprimand} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Motivo de la Falta</label>
                                <textarea 
                                    required 
                                    autoFocus
                                    value={reprimandReason}
                                    onChange={e => setReprimandReason(e.target.value)}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-950"
                                    placeholder="Llegada tarde, incumplimiento de tareas..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Cobro por:</label>
                                    <select 
                                        value={reprimandType}
                                        onChange={e => setReprimandType(e.target.value as any)}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-950"
                                    >
                                        <option value="time">Tiempo Extra</option>
                                        <option value="salary_day">Día de Sueldo</option>
                                    </select>
                                </div>
                                {reprimandType === 'time' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Horas</label>
                                        <input 
                                            type="number" 
                                            required 
                                            value={reprimandHours}
                                            onChange={e => setReprimandHours(parseFloat(e.target.value))}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-950"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3">
                                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                <p className="text-[10px] text-red-800 font-bold leading-relaxed tracking-tight">
                                    {reprimandType === 'time' 
                                        ? "El empleado deberá cumplir tiempo extra después de su jornada laboral para compensar la amonestación."
                                        : "Se descontará el valor de un día laborado del sueldo del empleado al finalizar el periodo actual."}
                                </p>
                            </div>
                            
                            <div className="flex flex-col gap-3 pt-6">
                                <button className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-red-600/20 active:scale-95 transition-all">
                                    Confirmar Amonestación
                                </button>
                                <button type="button" onClick={() => { setIsReprimandModalOpen(false); resetForm(); }} className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
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

export default Employees;
