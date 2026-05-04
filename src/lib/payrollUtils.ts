import { Employee, Advance, Shift, Reprimand } from '../types';

export const COLOMBIA_PAYROLL = {
    SMLV_2024: 1300000,
    AUX_TRANSPORTE_2024: 162000,
    HEALTH_EMPLOYEE: 0.04,
    PENSION_EMPLOYEE: 0.04,
    HEALTH_EMPLOYER: 0.085,
    PENSION_EMPLOYER: 0.12,
    // ARL Levels in Colombia:
    // Level 1: 0.522% (Risk I - Office/Admin)
    // Level 2: 1.044% (Risk II - Meat processing/Distribution)
    // Level 3: 2.436% (Risk III - Production/Warehouse)
    ARL_RISK: 0.01044, // Using level 2 as default for distribution business
    PRIMA: 0.0833,
    CESANTIAS: 0.0833,
    INTERESES_CESANTIAS: 0.12, // Anual, se calcula 1% mensual proporcinal
    VACACIONES: 0.0417,
};

export interface PayrollResult {
    employeeId: string;
    employeeName: string;
    daysWorked: number;
    basicSalary: number; // Proportional to days
    transportAux: number; // Proportional to days
    grossPay: number;
    healthDeduction: number;
    pensionDeduction: number;
    advancesTotal: number;
    reprimandsTotal: number;
    netPay: number;
    
    // Employer Liability (Prestaciones)
    prima: number;
    cesantias: number;
    interesesCesantias: number;
    vacaciones: number;
    
    // Social Security (Employer)
    pensionEmployer: number;
    healthEmployer: number; // Usually 0 if < 10 SMLV
    arl: number;
    totalEmployerCost: number;
}

export function calculateEmployeePayroll(
    employee: Employee,
    days: number,
    advances: Advance[],
    reprimands: Reprimand[]
): PayrollResult {
    const dailyBase = employee.salary / 30;
    const basicSalary = dailyBase * days;
    
    // Transport Aux calculation
    const earnsTranspAux = employee.salary <= (COLOMBIA_PAYROLL.SMLV_2024 * 2);
    const transportAux = earnsTranspAux ? (COLOMBIA_PAYROLL.AUX_TRANSPORTE_2024 / 30) * days : 0;
    
    const grossPay = basicSalary + transportAux;
    
    // Deductions base is basicSalary (excluding transport aux)
    const healthDeduction = basicSalary * COLOMBIA_PAYROLL.HEALTH_EMPLOYEE;
    const pensionDeduction = basicSalary * COLOMBIA_PAYROLL.PENSION_EMPLOYEE;
    
    const advancesTotal = advances.reduce((sum, a) => sum + a.amount, 0);
    const reprimandsTotal = reprimands.reduce((sum, r) => {
        if (r.type === 'salary_day') {
            return sum + dailyBase;
        }
        return sum + (dailyBase / 8 * (r.hours || 0));
    }, 0);
    
    const netPay = grossPay - healthDeduction - pensionDeduction - advancesTotal - reprimandsTotal;
    
    // Prestaciones (Base is Salary + Transport Aux)
    const basePrestaciones = basicSalary + transportAux;
    const prima = basePrestaciones * COLOMBIA_PAYROLL.PRIMA;
    const cesantias = basePrestaciones * COLOMBIA_PAYROLL.CESANTIAS;
    const interesesCesantias = cesantias * (COLOMBIA_PAYROLL.INTERESES_CESANTIAS / 12); // monthly calc
    const vacaciones = basicSalary * COLOMBIA_PAYROLL.VACACIONES; // Vacations base usually doesn't include transp aux
    
    // Social Security Employer
    const pensionEmployer = basicSalary * COLOMBIA_PAYROLL.PENSION_EMPLOYER;
    // Health Employer is 0 if earning less than 10 SMLV (Law 1607/2012)
    const healthEmployer = employee.salary >= (COLOMBIA_PAYROLL.SMLV_2024 * 10) ? basicSalary * COLOMBIA_PAYROLL.HEALTH_EMPLOYER : 0;
    const arl = basicSalary * COLOMBIA_PAYROLL.ARL_RISK;
    
    const totalEmployerCost = netPay + healthDeduction + pensionDeduction + prima + cesantias + interesesCesantias + vacaciones + pensionEmployer + healthEmployer + arl;

    return {
        employeeId: employee.id,
        employeeName: employee.name,
        daysWorked: days,
        basicSalary,
        transportAux,
        grossPay,
        healthDeduction,
        pensionDeduction,
        advancesTotal,
        reprimandsTotal,
        netPay,
        prima,
        cesantias,
        interesesCesantias,
        vacaciones,
        pensionEmployer,
        healthEmployer,
        arl,
        totalEmployerCost
    };
}
