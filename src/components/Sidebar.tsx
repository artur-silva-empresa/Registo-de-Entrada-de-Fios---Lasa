import React, { useState } from 'react';
import { LayoutDashboard, FileSpreadsheet, PackageCheck, Package, BarChart3, AlertTriangle, Settings, Save, Download, LogOut, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Eye, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { saveToFile, downloadBackup, closeDatabase, showModal, toggleHighContrast, toggleDarkMode, state } = useAppStore();
  const [expandedSection, setExpandedSection] = useState<'cru' | 'tinto' | null>(currentPage.startsWith('tinto') ? 'tinto' : 'cru');
  const [isCollapsed, setIsCollapsed] = useState(true);
  
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
    <div className={cn("bg-white border-r border-slate-200 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out relative z-50", isCollapsed ? "w-20" : "w-72")}>
      <div className="p-6 border-b border-slate-200 flex justify-between items-center h-[89px] overflow-hidden">
        <h1 className={cn("text-xl font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap transition-all duration-300 overflow-hidden", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-full")}>
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold shrink-0">
            L
          </div>
          <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0" : "opacity-100")}>Gestão de Fios</span>
        </h1>
        
        <div className={cn("absolute left-6 transition-all duration-300", isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none")}>
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold shrink-0">
            L
          </div>
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className={cn("text-slate-400 hover:text-slate-600 focus:outline-none shrink-0 transition-all duration-300", isCollapsed ? "ml-auto" : "ml-2")}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>
      <nav className={cn("flex-1 p-4 space-y-4", !isCollapsed ? "overflow-y-auto overflow-x-hidden" : "overflow-visible")}>
        <div>
          <div className="relative group">
            <button 
              onClick={() => {
                if (isCollapsed) {
                  setExpandedSection('cru');
                  setIsCollapsed(false);
                } else {
                  setExpandedSection(expandedSection === 'cru' ? null : 'cru');
                }
              }}
              className={cn(
                "relative w-full flex items-center rounded-lg font-bold uppercase tracking-wider transition-all duration-300 mb-2 overflow-hidden whitespace-nowrap",
                isCollapsed ? "h-10 justify-center px-0" : "px-4 py-3 justify-between",
                (isCollapsed ? currentPage.startsWith('cru') : expandedSection === 'cru') 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>Fio Cru</div>
              <div className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300", isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none")}>
                <span className="text-base">C</span>
              </div>
              <div className={cn("transition-all duration-300 overflow-hidden flex items-center", isCollapsed ? "w-0 opacity-0" : "w-4 opacity-100")}>
                {expandedSection === 'cru' ? <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>
            </button>

            {isCollapsed && (
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
            )}
          </div>
          
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            (expandedSection === 'cru' && !isCollapsed) ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="space-y-1 pl-2 border-l-2 border-slate-100 ml-2 mt-2">
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
            </div>
          </div>
        </div>

        <div>
          <div className="relative group mt-4">
            <button 
              onClick={() => {
                if (isCollapsed) {
                  setExpandedSection('tinto');
                  setIsCollapsed(false);
                } else {
                  setExpandedSection(expandedSection === 'tinto' ? null : 'tinto');
                }
              }}
              className={cn(
                "relative w-full flex items-center rounded-lg font-bold uppercase tracking-wider transition-all duration-300 mb-2 overflow-hidden whitespace-nowrap",
                isCollapsed ? "h-10 justify-center px-0" : "px-4 py-3 justify-between",
                (isCollapsed ? currentPage.startsWith('tinto') : expandedSection === 'tinto') 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>Fio Tinto</div>
              <div className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300", isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none")}>
                <span className="text-base">T</span>
              </div>
              <div className={cn("transition-all duration-300 overflow-hidden flex items-center", isCollapsed ? "w-0 opacity-0" : "w-4 opacity-100")}>
                {expandedSection === 'tinto' ? <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>
            </button>

            {isCollapsed && (
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
            )}
          </div>
          
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            (expandedSection === 'tinto' && !isCollapsed) ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="space-y-1 pl-2 border-l-2 border-slate-100 ml-2 mt-2">
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
            </div>
          </div>
        </div>
      </nav>
      <div className={cn("p-4 border-t border-slate-200 space-y-1 overflow-hidden transition-all duration-300", isCollapsed && "flex flex-col items-center")}>
        <button
          onClick={downloadBackup}
          title="Transferir Backup"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-all duration-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap overflow-hidden",
            isCollapsed ? "justify-center w-10 h-10 px-0" : "w-full px-4 py-3"
          )}
        >
          <Download className={cn("text-blue-500 shrink-0 transition-all duration-300", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3")}>Transferir Backup</span>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          title="Configurações"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden",
            isCollapsed ? "justify-center w-10 h-10 px-0" : "w-full px-4 py-3",
            currentPage === 'settings'
              ? "bg-slate-100 text-slate-900" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings className={cn("shrink-0 transition-all duration-300", currentPage === 'settings' ? "text-red-600" : "text-slate-400", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3")}>Configurações</span>
        </button>

        <div className={cn("flex w-full gap-2 mt-2", isCollapsed ? "flex-col items-center" : "flex-row")}>
          <button
            onClick={toggleHighContrast}
            title={state.highContrast ? "Desativar Alto Contraste" : "Ativar Alto Contraste"}
            className={cn(
              "flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden",
              isCollapsed ? "w-10 h-10 px-0" : "flex-1 px-4 py-3",
              state.highContrast ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Eye className={cn("shrink-0 transition-all duration-300", state.highContrast ? "text-white" : "text-slate-400", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
            <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 ml-2")}>Contraste</span>
          </button>
          
          <button
            onClick={toggleDarkMode}
            title={state.darkMode ? "Desativar Modo Escuro" : "Ativar Modo Escuro"}
            className={cn(
              "flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden",
              isCollapsed ? "w-10 h-10 px-0" : "flex-1 px-4 py-3",
              state.darkMode ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {state.darkMode ? (
              <Sun className={cn("shrink-0 transition-all duration-300 text-white", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
            ) : (
              <Moon className={cn("shrink-0 transition-all duration-300 text-slate-400", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
            )}
            <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 ml-2")}>
              {state.darkMode ? "Claro" : "Escuro"}
            </span>
          </button>
        </div>

        <button
          onClick={() => showModal('Confirmação', 'Tem a certeza que deseja fechar a base de dados?', closeDatabase)}
          title="Fechar Base de Dados"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-all duration-300 text-red-600 hover:bg-red-50 hover:text-red-700 mt-2 whitespace-nowrap overflow-hidden",
            isCollapsed ? "justify-center w-10 h-10 px-0" : "w-full px-4 py-3"
          )}
        >
          <LogOut className={cn("text-red-500 shrink-0 transition-all duration-300", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3")}>Fechar Base de Dados</span>
        </button>
      </div>
    </div>
  );
}
