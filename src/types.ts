export type Unit = 'kg' | 'und';

export interface Product {
    id: string;
    name: string;
    unit: Unit;
    price: number;
    cost: number;
    stock: number;
    initialStock: number;
    category?: string;
}

export interface PurchaseItem {
    productId: string;
    quantity: number;
    cost: number;
}

export interface Purchase {
    id: string;
    purchaseNumber: number;
    date: string;
    supplierName: string;
    supplierPhone: string;
    buyerName?: string;
    buyerPhone?: string;
    items: PurchaseItem[];
    total: number;
    paidAmount: number;
    paymentMethod: 'cash' | 'transfer' | 'credit';
    payments?: { date: string, amount: number, method: string }[];
}

export interface SaleItem {
    productId: string;
    quantity: number;
    price: number;
}

export interface Sale {
    id: string;
    saleNumber: number;
    date: string;
    customerName?: string;
    customerPhone?: string;
    sellerName?: string;
    sellerPhone?: string;
    items: SaleItem[];
    total: number;
    paidAmount: number;
    paymentMethod: 'cash' | 'credit';
    payments?: { date: string, amount: number, method: string }[];
}

export interface CashMovement {
    id: string;
    date: string;
    type: 'entry' | 'exit';
    amount: number;
    reason: string;
}

export interface Employee {
    id: string;
    name: string;
    email?: string;
    password?: string;
    role: 'admin' | 'employee';
    salary: number;
    active: boolean;
    photo?: string | null;
    restDay?: number; // 0-6 (0=Domingo, 1=Lunes, etc.)
}

export interface Attendance {
    id: string;
    employeeId: string;
    date: string;
    status: 'present' | 'absent' | 'late';
}

export interface Advance {
    id: string;
    employeeId: string;
    date: string;
    amount: number;
}

export interface Reprimand {
    id: string;
    employeeId: string;
    date: string;
    reason: string;
    type: 'time' | 'salary_day';
    hours?: number; // solo si es 'time'
    status: 'pending' | 'resolved';
}

export interface AppConfig {
    logo: string | null;
    companyName: string;
    nit: string;
    phone1: string;
    phone2: string;
    address: string;
    warehouseAddress: string;
    email: string;
    manager: string;
    saleCounter: number;
    purchaseCounter: number;
    lastSequenceDate: string;
}

export interface Supplier {
    id: string;
    name: string;
    phone: string;
    initialDebt?: number;
    initialDebtDate?: string;
}

export interface Shift {
    id: string;
    employeeId: string;
    date: string; // ISO Date YYYY-MM-DD
    clockIn?: string; // ISO Timestamp
    clockOut?: string; // ISO Timestamp
    breakfastStart?: string;
    breakfastEnd?: string;
    lunchStart?: string;
    lunchEnd?: string;
    justification?: string;
}

export interface AppState {
    products: Product[];
    purchases: Purchase[];
    sales: Sale[];
    cashFlow: CashMovement[];
    employees: Employee[];
    attendance: Attendance[];
    advances: Advance[];
    suppliers: Supplier[];
    shifts: Shift[];
    reprimands: Reprimand[];
    config: AppConfig;
}
