import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Settings, Upload, Trash2, Save, RotateCcw, Building2, MapPin, Hash } from 'lucide-react';

const Config: React.FC = () => {
    const { config, updateConfig, resetData } = useData();
    const [companyName, setCompanyName] = useState(config.companyName);
    const [nit, setNit] = useState(config.nit);
    const [phone1, setPhone1] = useState(config.phone1 || '');
    const [phone2, setPhone2] = useState(config.phone2 || '');
    const [address, setAddress] = useState(config.address || '');
    const [warehouseAddress, setWarehouseAddress] = useState(config.warehouseAddress || '');
    const [email, setEmail] = useState(config.email || '');
    const [manager, setManager] = useState(config.manager || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateConfig({ logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        updateConfig({ 
            companyName, 
            nit,
            phone1,
            phone2,
            address,
            warehouseAddress,
            email,
            manager
        });
        alert('Configuración guardada exitosamente');
    };

    return (
        <div className="max-w-4xl space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h1>
                <p className="text-slate-500 text-sm">Personaliza los datos de tu empresa y manejos globales</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <label className="block text-sm font-medium text-slate-700 mb-4">Logo de la Empresa</label>
                        <div className="relative group mx-auto w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden">
                            {config.logo ? (
                                <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center">
                                    <Upload size={24} />
                                    <span className="text-[10px] mt-1 uppercase font-bold tracking-wider">Subir</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleLogoUpload}
                                className="hidden" 
                                accept="image/*" 
                            />
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white"
                            >
                                <Upload size={20} />
                            </div>
                        </div>
                        {config.logo && (
                            <button 
                                onClick={() => updateConfig({ logo: null })}
                                className="mt-4 text-xs text-red-500 font-bold hover:underline flex items-center gap-1 mx-auto"
                            >
                                <Trash2 size={12} /> Eliminar Logo
                            </button>
                        )}
                        <p className="mt-4 text-[10px] text-slate-400 uppercase leading-tight font-medium">Recomendado: 512x512px<br/>PNG o JPG</p>
                    </div>

                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                        <h3 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                            <RotateCcw size={16} /> Zona de Peligro
                        </h3>
                        <p className="text-xs text-red-700 mb-4 leading-relaxed">
                            Al restablecer el sistema se borrarán todos los productos, ventas, empleados y registros de caja de forma permanente.
                        </p>
                        <button 
                            onClick={resetData}
                            className="w-full py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors uppercase tracking-widest"
                        >
                            Restablecer Todo
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <Building2 size={16} className="text-slate-400" /> Nombre de la Empresa
                                </label>
                                <input 
                                    type="text" 
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="Nombre Comercial"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <Hash size={16} className="text-slate-400" /> NIT / Identificación Tributaria
                                </label>
                                <input 
                                    type="text" 
                                    value={nit}
                                    onChange={e => setNit(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="900.000.000-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <Hash size={16} className="text-slate-400" /> Gerente / Representante
                                </label>
                                <input 
                                    type="text" 
                                    value={manager}
                                    onChange={e => setManager(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="Nombre del Gerente"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <Settings size={16} className="text-slate-400" /> Teléfono Principal
                                </label>
                                <input 
                                    type="text" 
                                    value={phone1}
                                    onChange={e => setPhone1(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="300 000 0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <Settings size={16} className="text-slate-400" /> Teléfono Secundario
                                </label>
                                <input 
                                    type="text" 
                                    value={phone2}
                                    onChange={e => setPhone2(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="300 000 0000"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <Settings size={16} className="text-slate-400" /> Correo Electrónico
                                </label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="correo@empresa.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <MapPin size={16} className="text-slate-400" /> Dirección Principal
                                </label>
                                <input 
                                    type="text" 
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="Calle... Ciudad"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-tighter">
                                    <MapPin size={16} className="text-slate-400" /> Dirección de Bodega
                                </label>
                                <input 
                                    type="text" 
                                    value={warehouseAddress}
                                    onChange={e => setWarehouseAddress(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900"
                                    placeholder="Calle... Ciudad"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all transform active:scale-95 shadow-lg shadow-slate-900/20"
                            >
                                <Save size={18} /> Guardar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Config;
