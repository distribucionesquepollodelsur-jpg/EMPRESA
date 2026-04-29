import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Product, Purchase, Sale, CashMovement, Employee, Attendance, Advance, AppConfig, Supplier, Shift, Reprimand } from '../types';
import { isWithinInterval, setHours, setMinutes, startOfDay, addDays, isAfter, format } from 'date-fns';
import { auth, db } from '../lib/firebase';
import { formatCurrency } from '../lib/utils';
import { onAuthStateChanged } from 'firebase/auth';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    setDoc,
    query,
    where,
    getDocs,
    Timestamp,
    getDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore Error [${operationType}] at ${path}:`, error);
}

interface DataContextType extends AppState {
    loading: boolean;
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (id: string, product: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    addPurchase: (purchase: Omit<Purchase, 'id' | 'date'>) => void;
    addSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
    updateSale: (id: string, updates: Partial<Sale>) => void;
    deleteSale: (id: string) => void;
    processDespresaje: (wholeChickenId: string, bulkQuantity: number, derivations: { productId: string, quantity: number }[]) => void;
    addCashMovement: (movement: Omit<CashMovement, 'id' | 'date'>) => Promise<string | null>;
    updateCashMovement: (id: string, movement: Partial<CashMovement>) => void;
    deleteCashMovement: (id: string) => void;
    addEmployee: (employee: Omit<Employee, 'id' | 'active'>) => void;
    updateEmployee: (id: string, employee: Partial<Employee>) => void;
    deleteEmployee: (id: string) => void;
    markAttendance: (employeeId: string, status: Attendance['status']) => void;
    addAdvance: (employeeId: string, amount: number) => Promise<string | null>;
    addReprimand: (reprimand: Omit<Reprimand, 'id' | 'date' | 'status'>) => void;
    resolveReprimand: (id: string) => void;
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

const initialConfig: AppConfig = {
    logo: null,
    companyName: 'Distribuciones Que Pollo del Sur',
    nit: '',
    phone1: '317 331 5203',
    phone2: 'Pendiente',
    address: 'No asignada',
    warehouseAddress: 'Calle 9 CR 11-33 El Carmen',
    email: 'distribucionesdelsurquepollo@gmail.com',
    manager: 'Jorge Luis Lasprilla',
    saleCounter: 1,
    purchaseCounter: 1
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [cashFlow, setCashFlow] = useState<CashMovement[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [reprimands, setReprimands] = useState<Reprimand[]>([]);
    const [config, setConfig] = useState<AppConfig>(initialConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Essential listeners for login and basic app data
        const unsubEmployees = onSnapshot(collection(db, 'employees'), (s) => {
            setEmployees(s.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'employees'));

        const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (d) => {
            if (d.exists()) setConfig(d.data() as AppConfig);
            setLoading(false);
        }, (e) => {
            handleFirestoreError(e, OperationType.GET, 'config/main');
            setLoading(false);
        });

        // Other listeners - now and explicitly outside of auth state for simplified sync
        const unsubProducts = onSnapshot(collection(db, 'products'), (s) => {
            setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'products'));

        const unsubPurchases = onSnapshot(collection(db, 'purchases'), (s) => {
            setPurchases(s.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'purchases'));

        const unsubSales = onSnapshot(collection(db, 'sales'), (s) => {
            setSales(s.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'sales'));

        const unsubCash = onSnapshot(collection(db, 'cashFlow'), (s) => {
            setCashFlow(s.docs.map(d => ({ id: d.id, ...d.data() } as CashMovement)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'cashFlow'));

        const unsubAttendance = onSnapshot(collection(db, 'attendance'), (s) => {
            setAttendance(s.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'attendance'));

        const unsubAdvances = onSnapshot(collection(db, 'advances'), (s) => {
            setAdvances(s.docs.map(d => ({ id: d.id, ...d.data() } as Advance)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'advances'));

        const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (s) => {
            setSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'suppliers'));

        const unsubShifts = onSnapshot(collection(db, 'shifts'), (s) => {
            setShifts(s.docs.map(d => ({ id: d.id, ...d.data() } as Shift)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'shifts'));

        const unsubReprimands = onSnapshot(collection(db, 'reprimands'), (s) => {
            setReprimands(s.docs.map(d => ({ id: d.id, ...d.data() } as Reprimand)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'reprimands'));

        return () => {
            unsubEmployees();
            unsubConfig();
            unsubProducts();
            unsubPurchases();
            unsubSales();
            unsubCash();
            unsubAttendance();
            unsubAdvances();
            unsubSuppliers();
            unsubShifts();
            unsubReprimands();
        };
    }, []);

    const addProduct = async (product: Omit<Product, 'id'>) => {
        try {
            await addDoc(collection(db, 'products'), product);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'products'); }
    };

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            await updateDoc(doc(db, 'products', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `products/${id}`); }
    };

    const deleteProduct = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'products', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `products/${id}`); }
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

    const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'date' | 'purchaseNumber'>) => {
        const nextNumber = (config.purchaseCounter || 0) + 1;
        const purchase = {
            ...purchaseData,
            purchaseNumber: nextNumber,
            date: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'purchases'), purchase);
            await updateConfig({ purchaseCounter: nextNumber });
            
            // Sync inventory
            for (const item of purchase.items) {
                const p = products.find(prod => prod.id === item.productId);
                if (p) {
                    await updateProduct(p.id, { stock: p.stock + item.quantity });
                }
            }

            // Sync cash
            if (purchase.paymentMethod !== 'credit') {
                await addCashMovement({
                    type: 'exit',
                    amount: purchase.total,
                    reason: `Compra #${docRef.id.slice(0, 8)} (${purchase.supplierName})`
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'purchases'); }
    };

    const addSale = async (saleData: Omit<Sale, 'id' | 'date' | 'saleNumber'>) => {
        const nextNumber = (config.saleCounter || 0) + 1;
        const sale = {
            ...saleData,
            saleNumber: nextNumber,
            date: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'sales'), sale);
            await updateConfig({ saleCounter: nextNumber });
            
            // Sync inventory
            for (const item of sale.items) {
                const p = products.find(prod => prod.id === item.productId);
                if (p) {
                    await updateProduct(p.id, { stock: p.stock - item.quantity });
                }
            }

            // Sync cash - only if it's cash or has paid amount
            if (sale.paymentMethod === 'cash' || sale.paidAmount > 0) {
                await addCashMovement({
                    type: 'entry',
                    amount: sale.paidAmount,
                    reason: `Venta #${docRef.id.slice(0, 8)}${sale.customerName ? ` (${sale.customerName})` : ''}`
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'sales'); }
    };

    const updateSale = async (id: string, updates: Partial<Sale>) => {
        try {
            await updateDoc(doc(db, 'sales', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `sales/${id}`); }
    };

    const deleteSale = async (id: string) => {
        const sale = sales.find(s => s.id === id);
        if (!sale) return;

        try {
            // Restore inventory
            for (const item of sale.items) {
                const p = products.find(prod => prod.id === item.productId);
                if (p) {
                    await updateProduct(p.id, { stock: p.stock + item.quantity });
                }
            }
            
            await deleteDoc(doc(db, 'sales', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `sales/${id}`); }
    };

    const processDespresaje = async (wholeChickenId: string, bulkQuantity: number, derivations: { productId: string, quantity: number }[]) => {
        try {
            // Rest bulk
            const whole = products.find(p => p.id === wholeChickenId);
            if (whole) {
                await updateProduct(whole.id, { stock: whole.stock - bulkQuantity });
            }

            // Add derivations
            for (const d of derivations) {
                const prod = products.find(p => p.id === d.productId);
                if (prod) {
                    await updateProduct(prod.id, { stock: prod.stock + d.quantity });
                }
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'products'); }
    };

    const addCashMovement = async (movementData: Omit<CashMovement, 'id' | 'date'>) => {
        const movement = {
            ...movementData,
            date: getEffectiveCashDate().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'cashFlow'), movement);
            return docRef.id;
        } catch (e) { 
            handleFirestoreError(e, OperationType.WRITE, 'cashFlow');
            return null;
        }
    };

    const updateCashMovement = async (id: string, updates: Partial<CashMovement>) => {
        try {
            await updateDoc(doc(db, 'cashFlow', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `cashFlow/${id}`); }
    };

    const deleteCashMovement = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'cashFlow', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `cashFlow/${id}`); }
    };

    const addEmployee = async (employeeData: Omit<Employee, 'id' | 'active'>) => {
        try {
            await addDoc(collection(db, 'employees'), { ...employeeData, active: true });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'employees'); }
    };

    const updateEmployee = async (id: string, updates: Partial<Employee>) => {
        try {
            await updateDoc(doc(db, 'employees', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `employees/${id}`); }
    };

    const deleteEmployee = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'employees', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `employees/${id}`); }
    };

    const markAttendance = async (employeeId: string, status: Attendance['status']) => {
        const record = {
            employeeId,
            status,
            date: new Date().toISOString()
        };
        try {
            await addDoc(collection(db, 'attendance'), record);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'attendance'); }
    };

    const addAdvance = async (employeeId: string, amount: number) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) return "Empleado no encontrado";

        // Tope legal (30% del sueldo base quincenal)
        const maxAdvance = employee.salary * 0.3;
        
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth();
        const year = now.getFullYear();

        // Determinar periodo actual (1-15 o 16-fin de mes)
        let periodStart: Date;
        let periodEnd: Date;

        if (day <= 15) {
            periodStart = new Date(year, month, 1);
            periodEnd = new Date(year, month, 15, 23, 59, 59);
        } else {
            periodStart = new Date(year, month, 16);
            periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
        }

        const currentPeriodAdvances = advances
            .filter(a => {
                const advanceDate = new Date(a.date);
                return a.employeeId === employeeId && 
                       advanceDate >= periodStart && 
                       advanceDate <= periodEnd;
            })
            .reduce((sum, a) => sum + a.amount, 0);

        if (currentPeriodAdvances + amount > maxAdvance) {
            return `Excede el tope del 30% (${formatCurrency(maxAdvance)}) para este periodo quincenal. Adelantos actuales: ${formatCurrency(currentPeriodAdvances)}`;
        }

        try {
            await addDoc(collection(db, 'advances'), {
                employeeId,
                amount,
                date: now.toISOString()
            });

            await addCashMovement({
                type: 'exit',
                amount,
                reason: `Adelanto: ${employee.name}`
            });
            return null;
        } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'advances');
            return "Error al registrar adelanto";
        }
    };

    const addReprimand = async (reprimandData: Omit<Reprimand, 'id' | 'date' | 'status'>) => {
        try {
            const reprimand = {
                ...reprimandData,
                date: new Date().toISOString(),
                status: 'pending'
            };
            await addDoc(collection(db, 'reprimands'), reprimand);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'reprimands'); }
    };

    const resolveReprimand = async (id: string) => {
        try {
            await updateDoc(doc(db, 'reprimands', id), { status: 'resolved' });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `reprimands/${id}`); }
    };

    const addSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
            
            if (supplierData.initialDebt && supplierData.initialDebt > 0) {
                await addDoc(collection(db, 'purchases'), {
                    date: supplierData.initialDebtDate || new Date().toISOString(),
                    supplierName: supplierData.name,
                    supplierPhone: supplierData.phone,
                    items: [],
                    total: supplierData.initialDebt,
                    paidAmount: 0,
                    paymentMethod: 'credit',
                    payments: []
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'suppliers'); }
    };

    const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
        try {
            await updateDoc(doc(db, 'suppliers', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `suppliers/${id}`); }
    };

    const deleteSupplier = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'suppliers', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `suppliers/${id}`); }
    };

    const updateShift = async (employeeId: string, type: string, justification?: string) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const q = query(collection(db, 'shifts'), where('employeeId', '==', employeeId), where('date', '==', today));
        const s = await getDocs(q);

        try {
            if (s.empty) {
                await addDoc(collection(db, 'shifts'), {
                    employeeId,
                    date: today,
                    [type]: new Date().toISOString(),
                    justification
                });
            } else {
                await updateDoc(doc(db, 'shifts', s.docs[0].id), {
                    [type]: new Date().toISOString(),
                    justification: justification || s.docs[0].data().justification
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'shifts'); }
    };

    const addPurchasePayment = async (purchaseId: string, amount: number, method: string) => {
        const purchase = purchases.find(p => p.id === purchaseId);
        if (!purchase) return;

        try {
            await updateDoc(doc(db, 'purchases', purchaseId), {
                paidAmount: purchase.paidAmount + amount,
                payments: [...(purchase.payments || []), { date: new Date().toISOString(), amount, method }]
            });

            await addCashMovement({
                type: 'exit',
                amount: amount,
                reason: `Abono a Compra #${purchaseId.slice(0, 8)} (${purchase.supplierName})`
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `purchases/${purchaseId}`); }
    };

    const addSalePayment = async (saleId: string, amount: number, method: string) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;

        try {
            await updateDoc(doc(db, 'sales', saleId), {
                paidAmount: sale.paidAmount + amount,
                payments: [...(sale.payments || []), { date: new Date().toISOString(), amount, method }]
            });

            await addCashMovement({
                type: 'entry',
                amount: amount,
                reason: `Abono a Venta #${saleId.slice(0, 8)}`
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `sales/${saleId}`); }
    };

    const updateConfig = async (updates: Partial<AppConfig>) => {
        try {
            await setDoc(doc(db, 'config', 'main'), { ...config, ...updates }, { merge: true });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'config/main'); }
    };

    const resetData = async () => {
        if (window.confirm("¿Estás seguro de que deseas restablecer todos los datos del sistema? Esto eliminará todo de la base de datos.")) {
            // In a real app we'd delete collections, but for safety let's just warn it's not implemented for safety.
            alert("Operación restringida por seguridad. Contacte soporte.");
        }
    };

    return (
        <DataContext.Provider value={{
            products, purchases, sales, cashFlow, employees, attendance, advances, suppliers, shifts, reprimands, config,
            loading,
            addProduct,
            updateProduct,
            deleteProduct,
            addPurchase,
            addSale,
            updateSale,
            deleteSale,
            processDespresaje,
            addCashMovement,
            updateCashMovement,
            deleteCashMovement,
            addEmployee,
            updateEmployee,
            deleteEmployee,
            markAttendance,
            addAdvance,
            addReprimand,
            resolveReprimand,
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
