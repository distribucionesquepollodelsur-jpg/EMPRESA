import React from 'react';
import { 
    LayoutDashboard, 
    Package, 
    ShoppingCart, 
    Tag, 
    Users, 
    Wallet, 
    Scissors, 
    Settings, 
    LogOut,
    Menu,
    X,
    Truck,
    BarChart3,
    History,
    ShieldCheck,
    Download,
    FileText,
    Briefcase,
    FileCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const { logout, user } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);
    const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

    React.useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        // If we are in an iframe (like AI Studio preview), we MUST open in a new tab
        // because browsers block PWA installation prompts inside iframes.
        if (window.self !== window.top) {
            window.open(window.location.href, '_blank');
            return;
        }

        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard, adminOnly: false },
        { id: 'daily-balance', label: 'Balance Diario', icon: BarChart3, adminOnly: true },
        { id: 'inventory', label: 'Inventario', icon: Package, adminOnly: false }, // Employees need to see stock to sell
        { id: 'suppliers', label: 'Proveedores', icon: Truck, adminOnly: true },
        { id: 'customers', label: 'Clientes', icon: Users, adminOnly: false },
        { id: 'credits', label: 'Cuentas', icon: History },
        { id: 'purchases', label: 'Compras', icon: ShoppingCart, adminOnly: true },
        { id: 'sales', label: 'Ventas', icon: Tag },
        { id: 'despresaje', label: 'Despresaje', icon: Scissors, adminOnly: false },
        { id: 'expenses', label: 'Gastos', icon: History, adminOnly: true },
        { id: 'loans', label: 'Préstamos 3ro', icon: Wallet, adminOnly: true },
        { id: 'cash', label: 'Caja', icon: Wallet },
        { id: 'employees', label: 'Empleados', icon: Users, adminOnly: true },
        { id: 'payroll', label: 'Nómina', icon: FileText, adminOnly: true },
        { id: 'assets', label: 'Activos Fijos', icon: ShieldCheck, adminOnly: true },
        { id: 'recruitment', label: 'Reclutamiento', icon: Briefcase, adminOnly: true },
        { id: 'contracts', label: 'Contratos', icon: FileText, adminOnly: true },
        { id: 'reports', label: 'Reportes', icon: BarChart3, adminOnly: true },
        { id: 'config', label: 'Configuración', icon: Settings, adminOnly: true },
    ];

    const filteredMenuItems = menuItems.filter(item => {
        if (!item.adminOnly) return true;
        if (user?.role === 'admin') return true;
        
        // Special case for Martha Quintero who can manage employees/attendance
        if (item.id === 'employees' && user?.name.toLowerCase().includes('martha quintero')) {
            return true;
        }
        
        return false;
    });

    return (
        <>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-md"
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3 mb-6">
                        <img 
                            src="/icon.svg" 
                            alt="Logo" 
                            className="w-10 h-10 object-contain brightness-0 invert" 
                        />
                        <h1 className="text-xl font-black text-white tracking-tighter uppercase">
                            Que Pollo
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                        {user?.photo ? (
                            <img src={user.photo} alt={user.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white font-black">
                                {user?.name.charAt(0)}
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate">{user?.name}</span>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{user?.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Sistema Abierto</span>
                            <span className="text-[8px] font-bold text-emerald-400 opacity-80 uppercase tracking-tighter">12:00 AM - 11:59 PM</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === item.id 
                                        ? "bg-slate-800 text-white shadow-lg shadow-black/20" 
                                        : "hover:bg-slate-800/50 hover:text-white"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </button>
                        );
                    })}
                    
                    <div className="pt-4 mt-4 border-t border-slate-800/50">
                        <button
                            onClick={handleInstall}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-300 hover:bg-slate-800 transition-all active:scale-[0.98]"
                        >
                            <Download size={18} />
                            <div className="flex flex-col items-start leading-none">
                                <span>Descargar APK Escritorio</span>
                                <span className="text-[10px] font-normal opacity-60">Versión para PC/Móvil</span>
                            </div>
                        </button>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 Transition-colors"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
