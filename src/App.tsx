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
import Despresaje from './pages/Despresaje';
import CashFlow from './pages/CashFlow';
import Employees from './pages/Employees';
import Credits from './pages/Credits';
import Reports from './pages/Reports';
import Config from './pages/Config';

const MainContent: React.FC = () => {
  const { isAuthenticated, user, hasEnteredBase } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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
      case 'despresaje': return <Despresaje />;
      case 'cash': return <CashFlow />;
      case 'employees': return <Employees />;
      case 'credits': return <Credits />;
      case 'reports': return <Reports />;
      case 'config': return <Config />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
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

