import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Product, Purchase, Sale, CashMovement, Employee, Attendance, Advance, AppConfig, Supplier, Shift, Reprimand, Customer, Processing, Dotation, Asset, InventoryAdjustment } from '../types';
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface DataContextType extends AppState {
    loading: boolean;
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
    updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    addPurchase: (purchase: Omit<Purchase, 'id' | 'date'>) => Promise<void>;
    addSale: (sale: Omit<Sale, 'id' | 'date'>) => Promise<void>;
    updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
    updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;
    deletePurchase: (id: string) => Promise<void>;
    addProcessing: (processing: Omit<Processing, 'id' | 'date'>) => Promise<void>;
    updateProcessing: (id: string, processing: Partial<Processing>) => Promise<void>;
    deleteProcessing: (id: string) => Promise<void>;
    addCashMovement: (movement: Omit<CashMovement, 'id' | 'date'>) => Promise<string | null>;
    updateCashMovement: (id: string, movement: Partial<CashMovement>) => Promise<void>;
    deleteCashMovement: (id: string) => Promise<void>;
    addEmployee: (employee: Omit<Employee, 'id' | 'active'>) => Promise<void>;
    updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
    deleteEmployee: (id: string) => Promise<void>;
    markAttendance: (employeeId: string, status: Attendance['status']) => Promise<void>;
    deleteAttendance: (id: string) => Promise<void>;
    addAdvance: (employeeId: string, amount: number) => Promise<string | null>;
    addReprimand: (reprimand: Omit<Reprimand, 'id' | 'date' | 'status'>) => Promise<void>;
    resolveReprimand: (id: string) => Promise<void>;
    addDotation: (dotation: Omit<Dotation, 'id' | 'date'>) => Promise<void>;
    deleteDotation: (id: string) => Promise<void>;
    addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
    updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
    updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    addPurchasePayment: (purchaseId: string, amount: number, method: string) => Promise<void>;
    addSalePayment: (saleId: string, amount: number, method: string) => Promise<void>;
    deletePurchasePayment: (purchaseId: string, paymentIndex: number) => Promise<void>;
    deleteSalePayment: (saleId: string, paymentIndex: number) => Promise<void>;
    addCustomerDebtAbono: (customerId: string, amount: number) => Promise<void>;
    deleteCustomerDebtAbono: (customerId: string, paymentIndex: number) => Promise<void>;
    addSupplierDebtAbono: (supplierId: string, amount: number) => Promise<void>;
    deleteSupplierDebtAbono: (supplierId: string, paymentIndex: number) => Promise<void>;
    addExpense: (expense: any) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    addLoan: (loan: any) => Promise<void>;
    updateLoan: (id: string, updates: any) => Promise<void>;
    addLoanAbono: (loanId: string, amount: number, method: string) => Promise<void>;
    deleteLoanAbono: (loanId: string, abonoIndex: number) => Promise<void>;
    deleteLoan: (id: string) => Promise<void>;
    updateShift: (employeeId: string, type: 'clockIn' | 'clockOut' | 'breakfastStart' | 'breakfastEnd' | 'lunchStart' | 'lunchEnd', justification?: string) => Promise<void>;
    updateConfig: (config: Partial<AppConfig>) => Promise<void>;
    resetData: () => Promise<void>;
    verifyInventory: () => Promise<void>;
    inventoryLogs: InventoryAdjustment[];
    isInventoryRequired: () => boolean;
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
    purchaseCounter: 1,
    lastSequenceDate: ''
};

const clean = (data: any) => {
    return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
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
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [reprimands, setReprimands] = useState<Reprimand[]>([]);
    const [dotations, setDotations] = useState<Dotation[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [processings, setProcessings] = useState<Processing[]>([]);
    const [inventoryLogs, setInventoryLogs] = useState<InventoryAdjustment[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [config, setConfig] = useState<AppConfig>(initialConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Start listeners immediately. Since rules are public-read, this works without Firebase Auth.
        const unsubInventory = onSnapshot(collection(db, 'inventoryLogs'), (s) => {
            setInventoryLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as InventoryAdjustment)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'inventoryLogs'));

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

        const unsubCustomers = onSnapshot(collection(db, 'customers'), (s) => {
            setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'customers'));

        const unsubShifts = onSnapshot(collection(db, 'shifts'), (s) => {
            setShifts(s.docs.map(d => ({ id: d.id, ...d.data() } as Shift)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'shifts'));

        const unsubReprimands = onSnapshot(collection(db, 'reprimands'), (s) => {
            setReprimands(s.docs.map(d => ({ id: d.id, ...d.data() } as Reprimand)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'reprimands'));

        const unsubDotations = onSnapshot(collection(db, 'dotations'), (s) => {
            setDotations(s.docs.map(d => ({ id: d.id, ...d.data() } as Dotation)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'dotations'));

        const unsubProcessings = onSnapshot(collection(db, 'processings'), (s) => {
            setProcessings(s.docs.map(d => ({ id: d.id, ...d.data() } as Processing)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'processings'));

        const unsubAssets = onSnapshot(collection(db, 'assets'), (s) => {
            setAssets(s.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'assets'));

        const unsubExpenses = onSnapshot(collection(db, 'expenses'), (s) => {
            setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'expenses'));

        const unsubLoans = onSnapshot(collection(db, 'loans'), (s) => {
            setLoans(s.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        }, (e) => handleFirestoreError(e, OperationType.GET, 'loans'));

        return () => {
            unsubEmployees();
            unsubInventory();
            unsubConfig();
            unsubProducts();
            unsubPurchases();
            unsubSales();
            unsubCash();
            unsubAttendance();
            unsubAdvances();
            unsubSuppliers();
            unsubCustomers();
            unsubShifts();
            unsubReprimands();
            unsubDotations();
            unsubProcessings();
            unsubAssets();
            unsubExpenses();
            unsubLoans();
        };
    }, []);

    const addProduct = async (product: Omit<Product, 'id'>) => {
        try {
            await addDoc(collection(db, 'products'), clean(product));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'products'); }
    };

    const updateProduct = async (id: string, updates: Partial<Product>, adjustmentReason?: string, userName?: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
 
        try {
            if (adjustmentReason && updates.stock !== undefined && updates.stock !== product.stock) {
                await addDoc(collection(db, 'inventoryLogs'), {
                    productId: id,
                    productName: product.name,
                    date: new Date().toISOString(),
                    oldStock: product.stock,
                    newStock: updates.stock,
                    reason: adjustmentReason,
                    userName: userName || auth.currentUser?.email || 'Sistema'
                });
            }
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
        const today = format(new Date(), 'yyyy-MM-dd');
        let nextNumber = (config.purchaseCounter || 0) + 1;
        
        if (config.lastSequenceDate !== today) {
            nextNumber = 1;
        }

        const purchase = {
            ...purchaseData,
            purchaseNumber: nextNumber,
            date: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'purchases'), clean(purchase));
            await updateConfig({ 
                purchaseCounter: nextNumber,
                lastSequenceDate: today
            });
            
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
                    reason: `Compra #${docRef.id.slice(0, 8)} (${purchase.supplierName})`,
                    category: 'purchase'
                });
            } else if (purchase.paidAmount > 0) {
                await addCashMovement({
                    type: 'exit',
                    amount: purchase.paidAmount,
                    reason: `Abono Inicial Compra #${docRef.id.slice(0, 8)} (${purchase.supplierName})`,
                    category: 'purchase'
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'purchases'); }
    };

    const updateCustomerBalance = async (customerId: string, amount: number, reason: string) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;
        
        try {
            const currentBalance = customer.balance || 0;
            await updateCustomer(customerId, { balance: currentBalance + amount });
            
            // Log as a special movement
            await addCashMovement({
                amount: 0,
                type: 'entry',
                reason: `Cargar Saldo (Trueque) - ${customer.name}: ${reason} (Nuevo Saldo: ${currentBalance + amount})`
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `customers/${customerId}`); }
    };

    const addSale = async (saleData: Omit<Sale, 'id' | 'date' | 'saleNumber'>) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        let nextNumber = (config.saleCounter || 0) + 1;
        
        if (config.lastSequenceDate !== today) {
            nextNumber = 1;
        }

        const sale = {
            ...saleData,
            saleNumber: nextNumber,
            date: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'sales'), clean(sale));
            const saleId = docRef.id;

            await updateConfig({ 
                saleCounter: nextNumber,
                lastSequenceDate: today
            });
            
            // Sync inventory
            for (const item of sale.items) {
                const p = products.find(prod => prod.id === item.productId);
                if (p) {
                    await updateProduct(p.id, { stock: p.stock - item.quantity });
                }
            }

            // Sync cash / Balance
            if (sale.paymentMethod === 'balance' && sale.customerId) {
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    const balanceUsed = Math.min(customer.balance || 0, sale.paidAmount);
                    await updateCustomer(customer.id, { balance: (customer.balance || 0) - balanceUsed });
                }
            }

            // If there are detailed payments, process them
            if (sale.payments && sale.payments.length > 0) {
                const updatedPayments = [];
                for (const pmt of sale.payments) {
                    // Transfer payments are recorded but don't always go into the same "Cash" bucket if we want to distinguish
                    // For now, satisfy the "Entry" requirement
                    const moveRef = await addDoc(collection(db, 'cashFlow'), clean({
                        date: new Date().toISOString(),
                        type: 'entry',
                        amount: pmt.method === 'Balance' ? 0 : pmt.amount,
                        reason: `Venta #${saleId.slice(0, 8)} (${pmt.method})${sale.customerName ? ` - ${sale.customerName}` : ''}`,
                        category: 'sale'
                    }));
                    updatedPayments.push({ ...pmt, cashMovementId: moveRef.id });
                }
                // Update sale with movement IDs
                await updateDoc(doc(db, 'sales', saleId), { payments: updatedPayments });
            } else if (sale.paymentMethod === 'cash' || sale.paidAmount > 0) {
                const isBalancePayment = sale.paymentMethod === 'balance';
                await addCashMovement({
                    type: 'entry',
                    amount: isBalancePayment ? 0 : sale.paidAmount,
                    reason: `Venta #${saleId.slice(0, 8)}${sale.customerName ? ` (${sale.customerName})` : ''}${isBalancePayment ? ' [PAGO CON SALDO]' : ''}`,
                    category: 'sale'
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'sales'); }
    };

    const updateSale = async (id: string, updates: Partial<Sale>) => {
        try {
            await updateDoc(doc(db, 'sales', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `sales/${id}`); }
    };

    const updatePurchase = async (id: string, updates: Partial<Purchase>) => {
        try {
            await updateDoc(doc(db, 'purchases', id), updates);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `purchases/${id}`); }
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

            // Find and delete associated cash movement
            const saleSnippet = id.slice(0, 8);
            const movement = cashFlow.find(m => m.reason.includes(`Venta #${saleSnippet}`));
            if (movement) {
                await deleteCashMovement(movement.id);
            }
            
            await deleteDoc(doc(db, 'sales', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `sales/${id}`); }
    };

    const deletePurchase = async (id: string) => {
        const purchase = purchases.find(p => p.id === id);
        if (!purchase) return;

        try {
            // Restore inventory (subtract what was added)
            for (const item of purchase.items) {
                const p = products.find(prod => prod.id === item.productId);
                if (p) {
                    await updateProduct(p.id, { stock: p.stock - item.quantity });
                }
            }

            // Find and delete associated cash movement
            const purchaseSnippet = id.slice(0, 8);
            const movement = cashFlow.find(m => m.reason.includes(`Compra #${purchaseSnippet}`));
            if (movement) {
                await deleteCashMovement(movement.id);
            }
            
            await deleteDoc(doc(db, 'purchases', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `purchases/${id}`); }
    };

    const addProcessing = async (processingData: Omit<Processing, 'id' | 'date'>) => {
        try {
            const processing = {
                ...processingData,
                date: new Date().toISOString()
            };

            await addDoc(collection(db, 'processings'), clean(processing));

            // Rest input from inventory
            if (processing.inputItems && processing.inputItems.length > 0) {
                for (const input of processing.inputItems) {
                    const prod = products.find(p => p.id === input.productId);
                    if (prod) {
                        await updateProduct(prod.id, { stock: prod.stock - (input.quantity || 0) });
                    }
                }
            } else if (processing.inputProductId && processing.inputQuantity) {
                // Legacy single input support
                const whole = products.find(p => p.id === processing.inputProductId);
                if (whole) {
                    await updateProduct(whole.id, { stock: whole.stock - (processing.inputQuantity || 0) });
                }
            }

            // Add derivations to inventory
            for (const d of processing.outputItems) {
                const prod = products.find(p => p.id === d.productId);
                if (prod) {
                    await updateProduct(prod.id, { stock: prod.stock + (d.quantity || 0) });
                }
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'processings'); }
    };

    const updateProcessing = async (id: string, updates: Partial<Processing>) => {
        const existing = processings.find(p => p.id === id);
        if (!existing) return;

        try {
            // 1. Revert previous stock changes
            if (existing.inputItems && existing.inputItems.length > 0) {
                for (const input of existing.inputItems) {
                    const prod = products.find(p => p.id === input.productId);
                    if (prod) await updateProduct(prod.id, { stock: prod.stock + (input.quantity || 0) });
                }
            } else if (existing.inputProductId && existing.inputQuantity) {
                const whole = products.find(p => p.id === existing.inputProductId);
                if (whole) await updateProduct(whole.id, { stock: whole.stock + (existing.inputQuantity || 0) });
            }

            for (const d of existing.outputItems) {
                const prod = products.find(p => p.id === d.productId);
                if (prod) await updateProduct(prod.id, { stock: prod.stock - (d.quantity || 0) });
            }

            // 2. Apply new processing data
            const merging = { ...existing, ...updates };
            
            // Apply new stock changes
            if (merging.inputItems && merging.inputItems.length > 0) {
                for (const input of merging.inputItems) {
                    const prod = products.find(p => p.id === input.productId);
                    if (prod) await updateProduct(prod.id, { stock: prod.stock - (input.quantity || 0) });
                }
            } else if (merging.inputProductId && merging.inputQuantity) {
                const whole = products.find(p => p.id === merging.inputProductId);
                if (whole) await updateProduct(whole.id, { stock: whole.stock - (merging.inputQuantity || 0) });
            }

            for (const d of merging.outputItems) {
                const prod = products.find(p => p.id === d.productId);
                if (prod) await updateProduct(prod.id, { stock: prod.stock + (d.quantity || 0) });
            }

            await updateDoc(doc(db, 'processings', id), clean(updates));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `processings/${id}`); }
    };

    const deleteProcessing = async (id: string) => {
        const existing = processings.find(p => p.id === id);
        if (!existing) return;

        try {
            // Revert stock changes
            if (existing.inputItems && existing.inputItems.length > 0) {
                for (const input of existing.inputItems) {
                    const prod = products.find(p => p.id === input.productId);
                    if (prod) await updateProduct(prod.id, { stock: prod.stock + (input.quantity || 0) });
                }
            } else if (existing.inputProductId && existing.inputQuantity) {
                const whole = products.find(p => p.id === existing.inputProductId);
                if (whole) await updateProduct(whole.id, { stock: whole.stock + (existing.inputQuantity || 0) });
            }

            for (const d of existing.outputItems) {
                const prod = products.find(p => p.id === d.productId);
                if (prod) await updateProduct(prod.id, { stock: prod.stock - (d.quantity || 0) });
            }

            await deleteDoc(doc(db, 'processings', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `processings/${id}`); }
    };

    const addCashMovement = async (movementData: Omit<CashMovement, 'id' | 'date'>) => {
        const movement = {
            ...movementData,
            category: movementData.category || 'manual',
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

    const deleteAttendance = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'attendance', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `attendance/${id}`); }
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
                reason: `Adelanto: ${employee.name}`,
                category: 'advance'
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

    const addDotation = async (dotationData: Omit<Dotation, 'id' | 'date'>) => {
        try {
            const dotation = {
                ...dotationData,
                date: new Date().toISOString()
            };
            await addDoc(collection(db, 'dotations'), dotation);
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'dotations'); }
    };

    const deleteDotation = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'dotations', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `dotations/${id}`); }
    };

    const addAsset = async (assetData: Omit<Asset, 'id'>) => {
        try {
            await addDoc(collection(db, 'assets'), clean(assetData));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'assets'); }
    };

    const updateAsset = async (id: string, updates: Partial<Asset>) => {
        try {
            await updateDoc(doc(db, 'assets', id), clean(updates));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `assets/${id}`); }
    };

    const deleteAsset = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'assets', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `assets/${id}`); }
    };

    const addSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'suppliers'), clean(supplierData));
            
            if (supplierData.initialDebt && supplierData.initialDebt > 0) {
                const today = format(new Date(), 'yyyy-MM-dd');
                let nextNumber = (config.purchaseCounter || 0) + 1;
                
                if (config.lastSequenceDate !== today) {
                    nextNumber = 1;
                }

                await addDoc(collection(db, 'purchases'), {
                    purchaseNumber: nextNumber,
                    date: supplierData.initialDebtDate || new Date().toISOString(),
                    supplierName: supplierData.name,
                    supplierId: docRef.id,
                    supplierPhone: supplierData.phone,
                    items: [],
                    total: supplierData.initialDebt,
                    paidAmount: 0,
                    paymentMethod: 'credit',
                    payments: []
                });

                await updateConfig({ 
                    purchaseCounter: nextNumber,
                    lastSequenceDate: today
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'suppliers'); }
    };

    const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
        try {
            await updateDoc(doc(db, 'suppliers', id), clean(updates));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `suppliers/${id}`); }
    };

    const deleteSupplier = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'suppliers', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `suppliers/${id}`); }
    };

    const addCustomer = async (customerData: Omit<Customer, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'customers'), clean(customerData));
            
            if (customerData.initialDebt && customerData.initialDebt > 0) {
                const today = format(new Date(), 'yyyy-MM-dd');
                let nextSaleNumber = (config.saleCounter || 0) + 1;
                if (config.lastSequenceDate !== today) nextSaleNumber = 1;

                await addDoc(collection(db, 'sales'), {
                    date: customerData.initialDebtDate || new Date().toISOString(),
                    customerName: customerData.name,
                    customerId: docRef.id,
                    customerPhone: customerData.phone,
                    items: [],
                    total: customerData.initialDebt,
                    paidAmount: 0,
                    paymentMethod: 'credit',
                    saleNumber: nextSaleNumber
                });
                
                await updateConfig({ 
                    saleCounter: nextSaleNumber,
                    lastSequenceDate: today
                });
            }
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'customers'); }
    };

    const updateCustomer = async (id: string, updates: Partial<Customer>) => {
        try {
            await updateDoc(doc(db, 'customers', id), clean(updates));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `customers/${id}`); }
    };

    const deleteCustomer = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'customers', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `customers/${id}`); }
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
            const cashMovementId = await addCashMovement({
                type: 'exit',
                amount: amount,
                reason: `Abono a Compra #${purchaseId.slice(0, 8)} (${purchase.supplierName})`,
                category: 'purchase'
            }) || undefined;

            await updateDoc(doc(db, 'purchases', purchaseId), {
                paidAmount: purchase.paidAmount + amount,
                payments: [...(purchase.payments || []), { date: new Date().toISOString(), amount, method, cashMovementId }]
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `purchases/${purchaseId}`); }
    };

    const deletePurchasePayment = async (purchaseId: string, paymentIndex: number) => {
        const purchase = purchases.find(p => p.id === purchaseId);
        if (!purchase || !purchase.payments || !purchase.payments[paymentIndex]) return;

        const payment = purchase.payments[paymentIndex];

        try {
            if (payment.cashMovementId) {
                await deleteCashMovement(payment.cashMovementId);
            }

            const updatedPayments = purchase.payments.filter((_, i) => i !== paymentIndex);
            await updateDoc(doc(db, 'purchases', purchaseId), {
                paidAmount: purchase.paidAmount - payment.amount,
                payments: updatedPayments
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `purchases/${purchaseId}`); }
    };

    const addSalePayment = async (saleId: string, amount: number, method: string) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;

        try {
            // Handle Balance adjustment if method is balance
            if (method === 'balance' && sale.customerId) {
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    await updateCustomer(customer.id, { balance: (customer.balance || 0) - amount });
                }
            }

            const cashMovementId = await addCashMovement({
                type: 'entry',
                amount: method === 'balance' ? 0 : amount,
                reason: `Abono a Venta #${saleId.slice(0, 8)}${method === 'balance' ? ' [SALDO]' : ''}`,
                category: 'sale'
            }) || undefined;

            await updateDoc(doc(db, 'sales', saleId), {
                paidAmount: sale.paidAmount + amount,
                payments: [...(sale.payments || []), { date: new Date().toISOString(), amount, method, cashMovementId }]
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `sales/${saleId}`); }
    };

    const deleteSalePayment = async (saleId: string, paymentIndex: number) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale || !sale.payments || !sale.payments[paymentIndex]) return;

        const payment = sale.payments[paymentIndex];

        try {
            // Revert Balance adjustment if method was balance
            if (payment.method === 'balance' && sale.customerId) {
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    await updateCustomer(customer.id, { balance: (customer.balance || 0) + payment.amount });
                }
            }

            if (payment.cashMovementId) {
                await deleteCashMovement(payment.cashMovementId);
            }

            const updatedPayments = sale.payments.filter((_, i) => i !== paymentIndex);
            await updateDoc(doc(db, 'sales', saleId), {
                paidAmount: sale.paidAmount - payment.amount,
                payments: updatedPayments
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `sales/${saleId}`); }
    };

    const addCustomerDebtAbono = async (customerId: string, amount: number) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        try {
            const cashMovementId = await addCashMovement({
                type: 'entry',
                amount: amount,
                reason: `Recaudo Saldo Antiguo: ${customer.name}`,
                category: 'sale'
            }) || undefined;

            await updateDoc(doc(db, 'customers', customerId), {
                initialDebt: (customer.initialDebt || 0) - amount,
                initialDebtPayments: [...(customer.initialDebtPayments || []), { date: new Date().toISOString(), amount, method: 'Efectivo', cashMovementId }]
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `customers/${customerId}`); }
    };

    const deleteCustomerDebtAbono = async (customerId: string, paymentIndex: number) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer || !customer.initialDebtPayments || !customer.initialDebtPayments[paymentIndex]) return;

        const payment = customer.initialDebtPayments[paymentIndex];

        try {
            if (payment.cashMovementId) {
                await deleteCashMovement(payment.cashMovementId);
            }

            const updatedPayments = customer.initialDebtPayments.filter((_, i) => i !== paymentIndex);
            await updateDoc(doc(db, 'customers', customerId), {
                initialDebt: (customer.initialDebt || 0) + payment.amount,
                initialDebtPayments: updatedPayments
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `customers/${customerId}`); }
    };

    const addSupplierDebtAbono = async (supplierId: string, amount: number) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;

        try {
            const cashMovementId = await addCashMovement({
                type: 'exit',
                amount: amount,
                reason: `Abono a Saldo Antiguo Proveedor: ${supplier.name}`,
                category: 'purchase'
            }) || undefined;

            await updateDoc(doc(db, 'suppliers', supplierId), {
                initialDebt: (supplier.initialDebt || 0) - amount,
                initialDebtPayments: [...(supplier.initialDebtPayments || []), { date: new Date().toISOString(), amount, method: 'Efectivo', cashMovementId }]
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `suppliers/${supplierId}`); }
    };

    const deleteSupplierDebtAbono = async (supplierId: string, paymentIndex: number) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier || !supplier.initialDebtPayments || !supplier.initialDebtPayments[paymentIndex]) return;

        const payment = supplier.initialDebtPayments[paymentIndex];

        try {
            if (payment.cashMovementId) {
                await deleteCashMovement(payment.cashMovementId);
            }

            const updatedPayments = supplier.initialDebtPayments.filter((_, i) => i !== paymentIndex);
            await updateDoc(doc(db, 'suppliers', supplierId), {
                initialDebt: (supplier.initialDebt || 0) + payment.amount,
                initialDebtPayments: updatedPayments
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `suppliers/${supplierId}`); }
    };

    const updateConfig = async (updates: Partial<AppConfig>) => {
        try {
            await setDoc(doc(db, 'config', 'main'), { ...config, ...updates }, { merge: true });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'config/main'); }
    };

    const verifyInventory = async () => {
        try {
            await updateConfig({ lastInventoryCheckDate: format(new Date(), 'yyyy-MM-dd') });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'config/main'); }
    };

    const isInventoryRequired = () => {
        if (loading) return false;
        const now = new Date();
        const day = now.getDate();
        const todayStr = format(now, 'yyyy-MM-dd');
        
        // Mandatory on 1st, 15th and 30th
        const isTargetDay = day === 1 || day === 15 || day === 30;
        
        if (isTargetDay) {
            return config.lastInventoryCheckDate !== todayStr;
        }
        return false;
    };

    const addExpense = async (expense: any) => {
        try {
            const expenseWithDate = { ...expense, date: expense.date || new Date().toISOString() };
            await addDoc(collection(db, 'expenses'), clean(expenseWithDate));
            
            // Register as exit in cash flow
            await addCashMovement({
                type: 'exit',
                amount: expense.amount,
                reason: `Gasto: ${expense.category} - ${expense.description}`,
                category: 'expense'
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'expenses'); }
    };

    const deleteExpense = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'expenses', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `expenses/${id}`); }
    };

    const addLoan = async (loan: any) => {
        try {
            const loanWithId = { 
                ...loan, 
                date: loan.date || new Date().toISOString(),
                paidAmount: 0,
                payments: [],
                status: 'pending'
            };
            const docRef = await addDoc(collection(db, 'loans'), clean(loanWithId));
            
            // Deduction from cash
            await addCashMovement({
                type: 'exit',
                amount: loan.amount,
                reason: `Préstamo a Tercero: ${loan.borrowerName}`,
                category: 'loan'
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'loans'); }
    };

    const updateLoan = async (id: string, updates: any) => {
        try {
            await updateDoc(doc(db, 'loans', id), clean(updates));
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `loans/${id}`); }
    };

    const addLoanAbono = async (loanId: string, amount: number, method: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        try {
            const cashMovementId = await addCashMovement({
                type: 'entry',
                amount: amount,
                reason: `Abono de Préstamo: ${loan.borrowerName}`,
                category: 'loan'
            }) || undefined;

            const newPaidAmount = (loan.paidAmount || 0) + amount;
            await updateDoc(doc(db, 'loans', loanId), {
                paidAmount: newPaidAmount,
                status: newPaidAmount >= loan.amount ? 'paid' : 'pending',
                payments: [...(loan.payments || []), { 
                    date: new Date().toISOString(), 
                    amount, 
                    method, 
                    cashMovementId 
                }]
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `loans/${loanId}`); }
    };

    const deleteLoanAbono = async (loanId: string, abonoIndex: number) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan || !loan.payments || !loan.payments[abonoIndex]) return;

        const payment = loan.payments[abonoIndex];

        try {
            if (payment.cashMovementId) {
                await deleteCashMovement(payment.cashMovementId);
            }

            const updatedPayments = loan.payments.filter((_, i) => i !== abonoIndex);
            const newPaidAmount = (loan.paidAmount || 0) - payment.amount;
            await updateDoc(doc(db, 'loans', loanId), {
                paidAmount: newPaidAmount,
                status: newPaidAmount >= loan.amount ? 'paid' : 'pending',
                payments: updatedPayments
            });
        } catch (e) { handleFirestoreError(e, OperationType.WRITE, `loans/${loanId}`); }
    };

    const deleteLoan = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'loans', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `loans/${id}`); }
    };

    const resetData = async () => {
        if (window.confirm("¿Estás seguro de que deseas restablecer todos los datos del sistema? Esto eliminará todo de la base de datos.")) {
            // In a real app we'd delete collections, but for safety let's just warn it's not implemented for safety.
            alert("Operación restringida por seguridad. Contacte soporte.");
        }
    };

    return (
        <DataContext.Provider value={{
            products, purchases, sales, cashFlow, employees, attendance, advances, suppliers, customers, shifts, reprimands, processings, dotations, assets, inventoryLogs, expenses, loans, config,
            loading,
            addProduct,
            updateProduct,
            deleteProduct,
            addPurchase,
            updatePurchase,
            addSale,
            updateSale,
            deleteSale,
            deletePurchase,
            addProcessing,
            updateProcessing,
            deleteProcessing,
            addCashMovement,
            updateCashMovement,
            deleteCashMovement,
            addExpense,
            deleteExpense,
            addLoan,
            updateLoan,
            addLoanAbono,
            deleteLoanAbono,
            deleteLoan,
            addEmployee,
            updateEmployee,
            deleteEmployee,
            markAttendance,
            deleteAttendance,
            addAdvance,
            addReprimand,
            resolveReprimand,
            addDotation,
            deleteDotation,
            addAsset,
            updateAsset,
            deleteAsset,
            addSupplier,
            updateSupplier,
            deleteSupplier,
            addCustomer,
            updateCustomer,
            updateCustomerBalance,
            deleteCustomer,
            updateShift,
            addPurchasePayment,
            addSalePayment,
            deletePurchasePayment,
            deleteSalePayment,
            addCustomerDebtAbono,
            deleteCustomerDebtAbono,
            addSupplierDebtAbono,
            deleteSupplierDebtAbono,
            updateConfig,
            resetData,
            verifyInventory,
            isInventoryRequired
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
