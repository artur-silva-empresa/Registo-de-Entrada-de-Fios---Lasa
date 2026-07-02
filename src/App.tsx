import React, { useState, useEffect } from 'react';
import { AppProvider, useAppStore } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Pedidos } from './pages/Pedidos';
import { Entradas } from './pages/Entradas';
import { Entregas } from './pages/Entregas';
import { Stock } from './pages/Stock';
import { Faltas } from './pages/Faltas';
import { Settings } from './pages/Settings';

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('cru_dashboard');
  const [previousPage, setPreviousPage] = useState('cru_dashboard');
  const { state } = useAppStore();

  const handleNavigate = (page: string) => {
    if (page !== 'settings') {
      setPreviousPage(page);
    }
    setCurrentPage(page);
  };

  useEffect(() => {
    if (state.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.highContrast, state.darkMode]);

  const renderPage = () => {
    if (currentPage === 'settings') return <Settings onClose={() => handleNavigate(previousPage)} />;

    const isTinto = currentPage.startsWith('tinto_');
    const type = isTinto ? 'tinto' : 'cru';
    const page = currentPage.replace(/^(cru|tinto)_/, '');

    switch (page) {
      case 'dashboard':
        return <Dashboard type={type} onNavigate={handleNavigate} />;
      case 'pedidos':
        return <Pedidos type={type} />;
      case 'entradas':
        return <Entradas type={type} />;
      case 'entregas':
        return <Entregas type={type} />;
      case 'stock':
        return <Stock type={type} />;
      case 'faltas':
        return <Faltas type={type} />;
      default:
        return <Dashboard type={type} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 overflow-x-hidden">
        <div className="mx-auto w-full max-w-full">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
