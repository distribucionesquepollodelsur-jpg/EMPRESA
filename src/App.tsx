/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import BaseEntry from './components/BaseEntry';

// Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Despresaje from './pages/Despresaje';
import CashFlow from './pages/CashFlow';
import Employees from './pages/Employees';
import Assets from './pages/Assets';
import LaborContracts from './pages/LaborContracts';
import Payroll from './pages/Payroll';
import Credits from './pages/Credits';
import Expenses from './pages/Expenses';
import Loans from './pages/Loans';
import Reports from './pages/Reports';
import Config from './pages/Config';
import Recruitment from './pages/Recruitment';
import DailyBalance from './pages/DailyBalance';

import { useData } from './context/DataContext';
import { Loader2 } from 'lucide-react';
import InventoryBlocker from './components/InventoryBlocker';

const MainContent: React.FC = () => {
  const { isAuthenticated, user, hasEnteredBase, loading: authLoading } = useAuth();
  const { loading: dataLoading, isInventoryRequired } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');

  const showInventoryBlocker = isInventoryRequired() && isAuthenticated && activeTab !== 'inventory';

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!hasEnteredBase && user?.role !== 'admin') {
    return <BaseEntry />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'suppliers': return <Suppliers />;
      case 'purchases': return <Purchases />;
      case 'sales': return <Sales />;
      case 'customers': return <Customers />;
      case 'despresaje': return <Despresaje />;
      case 'cash': return <CashFlow />;
      case 'employees': return <Employees />;
      case 'payroll': return <Payroll />;
      case 'assets': return <Assets />;
      case 'contracts': return <LaborContracts />;
      case 'recruitment': return <Recruitment />;
      case 'credits': return <Credits />;
      case 'expenses': return <Expenses />;
      case 'loans': return <Loans />;
      case 'reports': return <Reports />;
      case 'daily-balance': return <DailyBalance />;
      case 'config': return <Config />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {showInventoryBlocker && <InventoryBlocker onGoToInventory={() => setActiveTab('inventory')} />}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </DataProvider>
  );
}

