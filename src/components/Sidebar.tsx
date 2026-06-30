import React, { useState } from 'react';
import { LayoutDashboard, FileSpreadsheet, PackageCheck, Package, BarChart3, AlertTriangle, Settings, Save, Download, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { saveToFile, downloadBackup, closeDatabase } = useAppStore();
  const [expandedSection, setExpandedSection] = useState<'cru' | 'tinto' | null>(currentPage.startsWith('tinto') ? 'tinto' : 'cru');
  
  const cruItems = [
    { id: 'cru_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cru_pedidos', label: 'Pedidos de Fio', icon: FileSpreadsheet },
    { id: 'cru_entradas', label: 'Entradas (Receção)', icon: PackageCheck },
    { id: 'cru_entregas', label: 'Histórico de Entregas', icon: Package },
    { id: 'cru_stock', label: 'Stock / Faltas', icon: BarChart3 },
    { id: 'cru_faltas', label: 'Relatório de Faltas', icon: AlertTriangle },
  ];

  const tintoItems = [
    { id: 'tinto_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tinto_pedidos', label: 'Pedidos de Tingimento', icon: FileSpreadsheet },
    { id: 'tinto_entradas', label: 'Entradas (Receção)', icon: PackageCheck },
    { id: 'tinto_entregas', label: 'Histórico de Entregas', icon: Package },
    { id: 'tinto_stock', label: 'Stock / Faltas', icon: BarChart3 },
    { id: 'tinto_faltas', label: 'Relatório de Faltas', icon: AlertTriangle },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">
            L
          </div>
          Gestão de Fios
        </h1>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto space-y-4">
        <div>
          <button 
            onClick={() => setExpandedSection(expandedSection === 'cru' ? null : 'cru')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors mb-2",
              expandedSection === 'cru' 
                ? "bg-slate-800 text-white shadow-sm" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <span>Fio Cru</span>
            {expandedSection === 'cru' ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          
          {expandedSection === 'cru' && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 mt-2 mb-4 pl-2 border-l-2 border-slate-100 ml-2">
              {cruItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-slate-100 text-slate-900" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-red-600" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setExpandedSection(expandedSection === 'tinto' ? null : 'tinto')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors mb-2",
              expandedSection === 'tinto' 
                ? "bg-slate-800 text-white shadow-sm" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <span>Fio Tinto</span>
            {expandedSection === 'tinto' ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          
          {expandedSection === 'tinto' && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 mt-2 mb-4 pl-2 border-l-2 border-slate-100 ml-2">
              {tintoItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-slate-100 text-slate-900" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-red-600" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
      <div className="p-4 border-t border-slate-200 space-y-1">
        <button
          onClick={downloadBackup}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <Download className="w-5 h-5 text-blue-500" />
          Transferir Backup
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
            currentPage === 'settings'
              ? "bg-slate-100 text-slate-900" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings className={cn("w-5 h-5", currentPage === 'settings' ? "text-red-600" : "text-slate-400")} />
          Configurações
        </button>
        <button
          onClick={closeDatabase}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 mt-2"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          Fechar Base de Dados
        </button>
      </div>
    </div>
  );
}
