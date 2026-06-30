import React, { useState } from 'react';
import { LayoutDashboard, FileSpreadsheet, PackageCheck, Package, BarChart3, AlertTriangle, Settings, Save, Download, LogOut, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { saveToFile, downloadBackup, closeDatabase } = useAppStore();
  const [expandedSection, setExpandedSection] = useState<'cru' | 'tinto' | null>(currentPage.startsWith('tinto') ? 'tinto' : 'cru');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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
    <div className={cn("bg-white border-r border-slate-200 flex flex-col h-full shrink-0 transition-all duration-300 relative z-50", isCollapsed ? "w-20" : "w-72")}>
      <div className="p-6 border-b border-slate-200 flex justify-between items-center h-[89px]">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold shrink-0">
              L
            </div>
            Gestão de Fios
          </h1>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold mx-auto shrink-0">
            L
          </div>
        )}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2"
            title="Recolher menu"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className={cn("flex-1 p-4 space-y-4", !isCollapsed ? "overflow-y-auto overflow-x-hidden" : "overflow-visible")}>
        {isCollapsed && (
          <div className="flex justify-center mb-6">
            <button 
              onClick={() => setIsCollapsed(false)} 
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
              title="Expandir menu"
            >
              <PanelLeftOpen className="w-6 h-6" />
            </button>
          </div>
        )}

        <div>
          {!isCollapsed ? (
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
          ) : (
            <div className="flex justify-center mb-2 relative group">
              <button 
                onClick={() => {
                  setExpandedSection('cru');
                  setIsCollapsed(false);
                }}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                  expandedSection === 'cru' 
                  ? "bg-slate-800 text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                C
              </button>

              <div className="absolute left-full top-0 pl-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 w-56 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-100 font-bold text-xs uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    Fio Cru
                  </div>
                  <div className="py-1">
                    {cruItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors text-left",
                            isActive 
                              ? "bg-slate-50 text-slate-900" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-red-600" : "text-slate-400")} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(expandedSection === 'cru' && !isCollapsed) && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 mt-2 mb-4 pl-2 border-l-2 border-slate-100 ml-2">
              {cruItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
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
          {!isCollapsed ? (
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
          ) : (
            <div className="flex justify-center mb-2 mt-4 relative group">
              <button 
                onClick={() => {
                  setExpandedSection('tinto');
                  setIsCollapsed(false);
                }}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                  expandedSection === 'tinto' 
                  ? "bg-slate-800 text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                T
              </button>

              <div className="absolute left-full top-0 pl-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 w-56 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-100 font-bold text-xs uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    Fio Tinto
                  </div>
                  <div className="py-1">
                    {tintoItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors text-left",
                            isActive 
                              ? "bg-slate-50 text-slate-900" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-red-600" : "text-slate-400")} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(expandedSection === 'tinto' && !isCollapsed) && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 mt-2 mb-4 pl-2 border-l-2 border-slate-100 ml-2">
              {tintoItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
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
      <div className={cn("p-4 border-t border-slate-200 space-y-1", isCollapsed && "flex flex-col items-center")}>
        <button
          onClick={downloadBackup}
          title="Transferir Backup"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-colors text-blue-600 hover:bg-blue-50 hover:text-blue-700",
            isCollapsed ? "justify-center w-10 h-10" : "w-full gap-3 px-4 py-3"
          )}
        >
          <Download className={cn("text-blue-500", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          {!isCollapsed && "Transferir Backup"}
        </button>
        <button
          onClick={() => onNavigate('settings')}
          title="Configurações"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-colors",
            isCollapsed ? "justify-center w-10 h-10" : "w-full gap-3 px-4 py-3",
            currentPage === 'settings'
              ? "bg-slate-100 text-slate-900" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings className={cn(currentPage === 'settings' ? "text-red-600" : "text-slate-400", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          {!isCollapsed && "Configurações"}
        </button>
        <button
          onClick={closeDatabase}
          title="Fechar Base de Dados"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 mt-2",
            isCollapsed ? "justify-center w-10 h-10" : "w-full gap-3 px-4 py-3"
          )}
        >
          <LogOut className={cn("text-red-500", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          {!isCollapsed && "Fechar Base de Dados"}
        </button>
      </div>
    </div>
  );
}
