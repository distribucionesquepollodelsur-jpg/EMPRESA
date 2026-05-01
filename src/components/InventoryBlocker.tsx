import React from 'react';
import { useData } from '../context/DataContext';
import { ShieldAlert, ArrowRight, PackageCheck } from 'lucide-react';

const InventoryBlocker: React.FC<{ onGoToInventory: () => void }> = ({ onGoToInventory }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
            <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20">
                <div className="p-10 text-center space-y-8">
                    <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                        <div className="relative p-8 bg-red-50 text-red-600 rounded-[32px] border border-red-100 ring-8 ring-red-50/50">
                            <ShieldAlert size={64} className="stroke-[1.5]" />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                            Bloqueo de Seguridad <br />
                            <span className="text-red-500">Inventario Obligatorio</span>
                        </h2>
                        <p className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                            Hoy es día de corte administrativo (15 o 30). Según la política establecida, se requiere verificar el inventario físico antes de continuar operando.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-4">
                        <button 
                            onClick={onGoToInventory}
                            className="flex items-center justify-center gap-4 w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-xl"
                        >
                            Ir a Inventario Ahora <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 py-3 rounded-full">
                        <PackageCheck size={14} /> Control de Calidad y Existencias
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryBlocker;
