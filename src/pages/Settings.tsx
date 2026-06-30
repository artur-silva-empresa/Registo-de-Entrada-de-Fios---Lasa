import React from 'react';
import { Database, Download, Upload, Save, AlertCircle, CheckCircle2, Eye } from 'lucide-react';
import { useAppStore } from '../store';

export function Settings() {
  const { handleOpenFile, fileHandle, state, toggleHighContrast } = useAppStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 mt-2">Gira a base de dados da aplicação e preferências.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Acessibilidade</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Modo de Alto Contraste</h3>
              <p className="text-sm text-slate-500 mt-1">Aumenta o contraste visual para melhor leitura em ambientes industriais.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={state.highContrast || false}
                onChange={toggleHighContrast}
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Base de Dados Local</h2>
          </div>
          
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Estado Atual</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Ficheiro aberto:</span>
              {fileHandle ? (
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {fileHandle.name}
                </span>
              ) : (
                <span className="font-medium text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Nenhum ficheiro aberto
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm mt-2">
              <span className="text-slate-500">Aviso:</span>
              <span className="font-medium text-slate-400">
                Por motivos de segurança do browser, terá de selecionar o ficheiro manualmente sempre que iniciar a aplicação.
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            A aplicação está a funcionar 100% offline no seu browser. Os dados são guardados e lidos diretamente do ficheiro JSON que selecionou.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Abrir Outra Base de Dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
