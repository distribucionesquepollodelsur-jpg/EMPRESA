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
    History
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

    const menuItems = [
        { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard, adminOnly: true },
        { id: 'inventory', label: 'Inventario', icon: Package, adminOnly: false }, // Employees need to see stock to sell
        { id: 'suppliers', label: 'Proveedores', icon: Truck, adminOnly: true },
        { id: 'customers', label: 'Clientes', icon: Users, adminOnly: false },
        { id: 'credits', label: 'Cuentas', icon: History },
        { id: 'purchases', label: 'Compras', icon: ShoppingCart, adminOnly: true },
        { id: 'sales', label: 'Ventas', icon: Tag },
        { id: 'despresaje', label: 'Despresaje', icon: Scissors, adminOnly: false },
        { id: 'cash', label: 'Caja', icon: Wallet },
        { id: 'employees', label: 'Empleados', icon: Users, adminOnly: true },
        { id: 'reports', label: 'Reportes', icon: BarChart3, adminOnly: true },
        { id: 'config', label: 'Configuración', icon: Settings, adminOnly: true },
    ];

    const filteredMenuItems = menuItems.filter(item => !item.adminOnly || user?.role === 'admin');

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
                    <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <Package className="text-orange-500" />
                        Que Pollo
                    </h1>

                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                        {user?.photo ? (
                            <img src={user.photo} alt={user.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black">
                                {user?.name.charAt(0)}
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate">{user?.name}</span>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{user?.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
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
                                        ? "bg-orange-500 text-white" 
                                        : "hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </button>
                        );
                    })}
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
