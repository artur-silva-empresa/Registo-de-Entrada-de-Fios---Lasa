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
import { X } from 'lucide-react';

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('cru_dashboard');
  const [previousPage, setPreviousPage] = useState('cru_dashboard');
  const { state, closeDatabase, showModal } = useAppStore();

  const handleNavigate = (page: string) => {
    if (page !== 'settings') {
      setPreviousPage(page);
    }
    setCurrentPage(page);
  };

  const confirmClose = () => {
    showModal('Fechar Base de Dados', 'Tem a certeza que pretende fechar a base de dados atual?', closeDatabase);
  };

  useEffect(() => {
    let hasAttemptedFullscreen = false;

    const tryFullscreen = () => {
      if (hasAttemptedFullscreen) return;
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
      hasAttemptedFullscreen = true;
      document.removeEventListener('click', tryFullscreen);
      document.removeEventListener('keydown', tryFullscreen);
      document.removeEventListener('touchstart', tryFullscreen);
    };

    document.addEventListener('click', tryFullscreen);
    document.addEventListener('keydown', tryFullscreen);
    document.addEventListener('touchstart', tryFullscreen);

    return () => {
      document.removeEventListener('click', tryFullscreen);
      document.removeEventListener('keydown', tryFullscreen);
      document.removeEventListener('touchstart', tryFullscreen);
    };
  }, []);

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
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex justify-end p-3 pb-0 pr-4">
          <button
            onClick={confirmClose}
            className="p-1.5 bg-slate-900 text-white hover:bg-slate-700 dark:bg-[#f8fafc] dark:text-[#0f172a] dark:hover:bg-[#e2e8f0] shadow-sm border border-slate-700 dark:border-[#cbd5e1] rounded-md transition-colors shrink-0"
            title="Fechar Base de Dados"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 pt-2 md:pt-2 lg:pt-2 overflow-x-hidden relative">
          <div className="mx-auto w-full max-w-full">
            {renderPage()}
          </div>
        </main>
      </div>
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
