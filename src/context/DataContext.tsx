import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Product, Purchase, Sale, CashMovement, Employee, Attendance, Advance, AppConfig, Supplier, Shift } from '../types';
import { isWithinInterval, setHours, setMinutes, startOfDay, addDays, isAfter, format } from 'date-fns';

interface DataContextType extends AppState {
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (id: string, product: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    addPurchase: (purchase: Omit<Purchase, 'id' | 'date'>) => void;
    addSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
    processDespresaje: (wholeChickenId: string, bulkQuantity: number, derivations: { productId: string, quantity: number }[]) => void;
    addCashMovement: (movement: Omit<CashMovement, 'id' | 'date'>) => string | null;
    addEmployee: (employee: Omit<Employee, 'id' | 'active'>) => void;
    updateEmployee: (id: string, employee: Partial<Employee>) => void;
    deleteEmployee: (id: string) => void;
    markAttendance: (employeeId: string, status: Attendance['status']) => void;
    addAdvance: (employeeId: string, amount: number) => string | null;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
    deleteSupplier: (id: string) => void;
    addPurchasePayment: (purchaseId: string, amount: number, method: string) => void;
    addSalePayment: (saleId: string, amount: number, method: string) => void;
    updateShift: (employeeId: string, type: 'clockIn' | 'clockOut' | 'breakfastStart' | 'breakfastEnd' | 'lunchStart' | 'lunchEnd', justification?: string) => void;
    updateConfig: (config: Partial<AppConfig>) => void;
    resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'que_pollo_data_v1';

const initialConfig: AppConfig = {
    logo: null,
    companyName: 'Distribuciones Que Pollo del Sur',
    nit: '900.123.456-7'
};

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const defaults: AppState = {
            products: [],
            purchases: [],
            sales: [],
            cashFlow: [],
            employees: [],
            attendance: [],
            advances: [],
            suppliers: [],
            shifts: [],
            config: initialConfig
        };

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    ...defaults,
                    ...parsed,
                    // Ensure arrays exist even if they were missing in old save
                    products: parsed.products || [],
                    purchases: parsed.purchases || [],
                    sales: parsed.sales || [],
                    cashFlow: parsed.cashFlow || [],
                    employees: parsed.employees || [],
                    attendance: parsed.attendance || [],
                    advances: parsed.advances || [],
                    suppliers: parsed.suppliers || [],
                    shifts: parsed.shifts || [],
                    config: parsed.config || initialConfig
                };
            } catch (e) {
                console.error("Error parsing saved state", e);
                return defaults;
            }
        }
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const addProduct = (product: Omit<Product, 'id'>) => {
        const newProduct: Product = { ...product, id: generateId() };
        setState(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    };

    const updateProduct = (id: string, updates: Partial<Product>) => {
        setState(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
    };

    const deleteProduct = (id: string) => {
        setState(prev => ({
            ...prev,
            products: prev.products.filter(p => p.id !== id)
        }));
    };

    const getEffectiveCashDate = () => {
        const now = new Date();
        const end = setMinutes(setHours(now, 19), 0);

        if (isAfter(now, end)) {
            const nextDay = startOfDay(addDays(now, 1));
            return setHours(nextDay, 6);
        }
        return now;
    };

    const addPurchase = (purchaseData: Omit<Purchase, 'id' | 'date'>) => {
        const purchase: Purchase = {
            ...purchaseData,
            id: generateId(),
            date: new Date().toISOString()
        };

        setState(prev => {
            const updatedProducts = [...prev.products];
            purchase.items.forEach(item => {
                const pIndex = updatedProducts.findIndex(p => p.id === item.productId);
                if (pIndex > -1) {
                    updatedProducts[pIndex].stock += item.quantity;
                }
            });

            const updatedCashFlow = [...prev.cashFlow];
            if (purchase.paymentMethod !== 'credit') {
                updatedCashFlow.push({
                    id: generateId(),
                    date: getEffectiveCashDate().toISOString(),
                    type: 'exit',
                    amount: purchase.total,
                    reason: `Compra #${purchase.id.slice(0, 8)} (${purchase.supplierName})`
                });
            }

            return {
                ...prev,
                purchases: [...prev.purchases, purchase],
                products: updatedProducts,
                cashFlow: updatedCashFlow
            };
        });
    };

    const addSale = (saleData: Omit<Sale, 'id' | 'date'>) => {
        const sale: Sale = {
            ...saleData,
            id: generateId(),
            date: new Date().toISOString()
        };

        setState(prev => {
            const updatedProducts = [...prev.products];
            sale.items.forEach(item => {
                const pIndex = updatedProducts.findIndex(p => p.id === item.productId);
                if (pIndex > -1) {
                    updatedProducts[pIndex].stock -= item.quantity;
                }
            });

            // Solo registrar en caja lo efectivamente pagado hoy
            const updatedCashFlow = [...prev.cashFlow];
            if (sale.paidAmount > 0) {
                updatedCashFlow.push({
                    id: generateId(),
                    date: getEffectiveCashDate().toISOString(),
                    type: 'entry',
                    amount: sale.paidAmount,
                    reason: `Venta #${sale.id.slice(0, 8)}${sale.customerName ? ` (${sale.customerName})` : ''}`
                });
            }

            return {
                ...prev,
                sales: [...prev.sales, sale],
                products: updatedProducts,
                cashFlow: updatedCashFlow
            };
        });
    };

    const processDespresaje = (wholeChickenId: string, bulkQuantity: number, derivations: { productId: string, quantity: number }[]) => {
        setState(prev => {
            const updatedProducts = [...prev.products];
            
            // Rest bulk
            const wholeIdx = updatedProducts.findIndex(p => p.id === wholeChickenId);
            if (wholeIdx > -1) {
                updatedProducts[wholeIdx].stock -= bulkQuantity;
            }

            // Add derivations
            derivations.forEach(d => {
                const idx = updatedProducts.findIndex(p => p.id === d.productId);
                if (idx > -1) {
                    updatedProducts[idx].stock += d.quantity;
                }
            });

            return { ...prev, products: updatedProducts };
        });
    };

    const addCashMovement = (movementData: Omit<CashMovement, 'id' | 'date'>) => {
        const movement: CashMovement = {
            ...movementData,
            id: generateId(),
            date: getEffectiveCashDate().toISOString()
        };

        setState(prev => ({
            ...prev,
            cashFlow: [...prev.cashFlow, movement]
        }));
        
        return movement.id;
    };

    const addEmployee = (employeeData: Omit<Employee, 'id' | 'active'>) => {
        const employee: Employee = { ...employeeData, id: generateId(), active: true };
        setState(prev => ({ ...prev, employees: [...prev.employees, employee] }));
    };

    const updateEmployee = (id: string, updates: Partial<Employee>) => {
        setState(prev => ({
            ...prev,
            employees: prev.employees.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
    };

    const deleteEmployee = (id: string) => {
        setState(prev => ({
            ...prev,
            employees: prev.employees.filter(e => e.id !== id)
        }));
    };

    const markAttendance = (employeeId: string, status: Attendance['status']) => {
        const record: Attendance = {
            id: generateId(),
            employeeId,
            status,
            date: new Date().toISOString()
        };
        setState(prev => ({ ...prev, attendance: [...prev.attendance, record] }));
    };

    const addAdvance = (employeeId: string, amount: number) => {
        const employee = state.employees.find(e => e.id === employeeId);
        if (!employee) return null;

        const maxAdvance = employee.salary * 0.3;
        
        // Sum current month advances
        const now = new Date();
        const currentMonthAdvances = state.advances
            .filter(a => a.employeeId === employeeId && 
                    new Date(a.date).getMonth() === now.getMonth() &&
                    new Date(a.date).getFullYear() === now.getFullYear())
            .reduce((sum, a) => sum + a.amount, 0);

        if (currentMonthAdvances + amount > maxAdvance) {
            return "Excede el tope del 30% del sueldo";
        }

        const advance: Advance = {
            id: generateId(),
            employeeId,
            amount,
            date: now.toISOString()
        };

        const cashExit: CashMovement = {
            id: generateId(),
            date: getEffectiveCashDate().toISOString(),
            type: 'exit',
            amount,
            reason: `Adelanto: ${employee.name}`
        };

        setState(prev => ({ 
            ...prev, 
            advances: [...prev.advances, advance],
            cashFlow: [...prev.cashFlow, cashExit]
        }));
        return null;
    };

    const addSupplier = (supplierData: Omit<Supplier, 'id'>) => {
        const supplier: Supplier = { ...supplierData, id: generateId() };
        setState(prev => {
            const newState = { ...prev, suppliers: [...prev.suppliers, supplier] };
            
            // Si el proveedor tiene deuda inicial, crear una compra "ficticia" de tipo crédito
            if (supplier.initialDebt && supplier.initialDebt > 0) {
                const initialDebtPurchase: Purchase = {
                    id: generateId(),
                    date: supplier.initialDebtDate || new Date().toISOString(),
                    supplierName: supplier.name,
                    supplierPhone: supplier.phone,
                    items: [], // Sin ítems, solo el monto
                    total: supplier.initialDebt,
                    paidAmount: 0,
                    paymentMethod: 'credit',
                    payments: []
                };
                newState.purchases = [...newState.purchases, initialDebtPurchase];
            }
            
            return newState;
        });
    };

    const updateSupplier = (id: string, updates: Partial<Supplier>) => {
        setState(prev => ({
            ...prev,
            suppliers: prev.suppliers.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const deleteSupplier = (id: string) => {
        setState(prev => ({
            ...prev,
            suppliers: prev.suppliers.filter(s => s.id !== id)
        }));
    };

    const updateShift = (employeeId: string, type: keyof Omit<Shift, 'id' | 'employeeId' | 'date' | 'justification'>, justification?: string) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        setState(prev => {
            const shifts = [...prev.shifts];
            let shiftIndex = shifts.findIndex(s => s.employeeId === employeeId && s.date === today);
            
            if (shiftIndex === -1) {
                const newShift: Shift = {
                    id: generateId(),
                    employeeId,
                    date: today,
                    [type]: new Date().toISOString(),
                    justification
                };
                return { ...prev, shifts: [...prev.shifts, newShift] };
            } else {
                shifts[shiftIndex] = {
                    ...shifts[shiftIndex],
                    [type]: new Date().toISOString(),
                    justification: justification || shifts[shiftIndex].justification
                };
                return { ...prev, shifts };
            }
        });
    };

    const addPurchasePayment = (purchaseId: string, amount: number, method: string) => {
        setState(prev => {
            const purchases = [...prev.purchases];
            const pIndex = purchases.findIndex(p => p.id === purchaseId);
            if (pIndex === -1) return prev;

            const purchase = purchases[pIndex];
            const newPaidAmount = purchase.paidAmount + amount;
            
            purchases[pIndex] = {
                ...purchase,
                paidAmount: newPaidAmount,
                payments: [...(purchase.payments || []), { date: new Date().toISOString(), amount, method }]
            };

            const cashMovement: CashMovement = {
                id: generateId(),
                date: getEffectiveCashDate().toISOString(),
                type: 'exit',
                amount: amount,
                reason: `Abono a Compra #${purchase.id.slice(0, 8)} (${purchase.supplierName})`
            };

            return {
                ...prev,
                purchases,
                cashFlow: [...prev.cashFlow, cashMovement]
            };
        });
    };

    const addSalePayment = (saleId: string, amount: number, method: string) => {
        setState(prev => {
            const sales = [...prev.sales];
            const sIndex = sales.findIndex(s => s.id === saleId);
            if (sIndex === -1) return prev;

            const sale = sales[sIndex];
            const newPaidAmount = sale.paidAmount + amount;
            
            sales[sIndex] = {
                ...sale,
                paidAmount: newPaidAmount,
                payments: [...(sale.payments || []), { date: new Date().toISOString(), amount, method }]
            };

            const cashMovement: CashMovement = {
                id: generateId(),
                date: getEffectiveCashDate().toISOString(),
                type: 'entry',
                amount: amount,
                reason: `Abono a Venta #${sale.id.slice(0, 8)}`
            };

            return {
                ...prev,
                sales,
                cashFlow: [...prev.cashFlow, cashMovement]
            };
        });
    };

    const updateConfig = (updates: Partial<AppConfig>) => {
        setState(prev => ({ ...prev, config: { ...prev.config, ...updates } }));
    };

    const resetData = () => {
        if (window.confirm("¿Estás seguro de que deseas restablecer todos los datos del sistema?")) {
            setState({
                products: [],
                purchases: [],
                sales: [],
                cashFlow: [],
                employees: [],
                attendance: [],
                advances: [],
                suppliers: [],
                shifts: [],
                config: initialConfig
            });
        }
    };

    return (
        <DataContext.Provider value={{
            ...state,
            addProduct,
            updateProduct,
            deleteProduct,
            addPurchase,
            addSale,
            processDespresaje,
            addCashMovement,
            addEmployee,
            updateEmployee,
            deleteEmployee,
            markAttendance,
            addAdvance,
            addSupplier,
            updateSupplier,
            deleteSupplier,
            updateShift,
            addPurchasePayment,
            addSalePayment,
            updateConfig,
            resetData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};
