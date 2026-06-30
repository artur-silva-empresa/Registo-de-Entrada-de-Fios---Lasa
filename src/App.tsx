import React, { useState } from 'react';
import { AppProvider } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Pedidos } from './pages/Pedidos';
import { Entradas } from './pages/Entradas';
import { Entregas } from './pages/Entregas';
import { Stock } from './pages/Stock';
import { Faltas } from './pages/Faltas';
import { Settings } from './pages/Settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState('cru_dashboard');

  const renderPage = () => {
    if (currentPage === 'settings') return <Settings />;

    const isTinto = currentPage.startsWith('tinto_');
    const type = isTinto ? 'tinto' : 'cru';
    const page = currentPage.replace(/^(cru|tinto)_/, '');

    switch (page) {
      case 'dashboard':
        return <Dashboard type={type} />;
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
    <AppProvider>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
}
