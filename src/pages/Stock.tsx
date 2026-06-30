import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Search, Filter, ArrowUpDown, ChevronDown, ChevronRight, Download, History, X } from 'lucide-react';
import { exportToExcel } from '../lib/excel';

export function Stock({ type = 'cru' }: { type?: 'cru' | 'tinto' }) {
  const { state } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [historyItem, setHistoryItem] = useState<any>(null);

  const requests = state.requests.filter(r => (r.type || 'cru') === type);
  const requestIds = new Set(requests.map(r => r.id));
  const items = state.items.filter(i => requestIds.has(i.requestId));
  const itemIds = new Set(items.map(i => i.id));
  const deliveries = state.deliveries.filter(d => itemIds.has(d.itemId));

  const handleExport = () => {
    exportToExcel(requests, items, deliveries);
  };

  // Aggregate items by description, section, and unit
  const aggregatedStock = items.reduce((acc, item) => {
    const sectionDisplay = type === 'tinto' 
                           ? (item.bobbin2To1 && item.bobbin2To1.trim() !== '-' && item.bobbin2To1.trim() !== '' ? 'Fios para tramar' : 'Fios para urdir')
                           : (item.section.toLowerCase().includes('tecelagem') ? 'Tecelagem' :
                              item.section.toLowerCase().includes('tinturaria') ? 'Tinturaria' : 
                              item.section.toLowerCase().includes('urdir') ? 'Urdir' : 'Outros');
    
    const unitDisplay = item.unit || 'Kg';
    const groupByValue = type === 'tinto' ? (item.coneColor || item.description) : item.description;
    const key = `${groupByValue}-${sectionDisplay}-${unitDisplay}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        description: groupByValue,
        section: sectionDisplay,
        unit: unitDisplay,
        requested: 0,
        delivered: 0,
        pending: 0,
        items: []
      };
    }
    
    const delivered = deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const pending = Number(item.quantity || 0) - delivered;
    
    acc[key].requested += Number(item.quantity || 0);
    acc[key].delivered += delivered;
    acc[key].pending += pending;
    
    const request = requests.find(r => r.id === item.requestId);
    acc[key].items.push({
      ...item,
      requestNumber: request?.number || 'N/A',
      pending,
      delivered
    });
    
    return acc;
  }, {} as Record<string, { id: string; description: string; section: string; unit: string; requested: number; delivered: number; pending: number; items: any[] }>);

  const stockList = (Object.values(aggregatedStock) as Array<{ id: string; description: string; section: string; unit: string; requested: number; delivered: number; pending: number; items: any[] }>).filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.section.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filter === 'pending') return item.pending > 0;
    if (filter === 'delivered') return item.pending <= 0;
    return true;
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  let historyRecords: any[] = [];
  if (historyItem) {
    const itemRequests = historyItem.items.map((i: any) => {
       const req = state.requests.find(r => r.id === i.requestId);
       return {
         id: `req-${i.id}`,
         type: 'entrada',
         date: req ? new Date(req.uploadDate) : new Date(0),
         title: `Pedido ${req?.number || 'N/A'}`,
         quantity: i.quantity,
         unit: i.unit || 'Kg',
         note: ''
       };
    });
    
    const itemDeliveries = historyItem.items.flatMap((i: any) => 
      state.deliveries.filter(d => d.itemId === i.id).map(d => ({
        id: `del-${d.id}`,
        type: 'entrega',
        date: new Date(d.deliveryDate || d.date),
        title: `Entrega (Pedido ${i.requestNumber})`,
        quantity: d.quantity,
        unit: i.unit || 'Kg',
        note: [d.deliveryNote, d.observations].filter(Boolean).join(' - ')
      }))
    );

    historyRecords = [...itemRequests, ...itemDeliveries]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stock / Faltas {type === 'tinto' && '(Fio Tinto)'}</h1>
          <p className="text-slate-500 mt-2">Visualize o estado global dos fios solicitados e entregues.</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="w-5 h-5" />
          Exportar Excel
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por descrição ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 py-2 px-4 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">Todos os Fios</option>
              <option value="pending">Com Faltas (Pendentes)</option>
              <option value="delivered">Totalmente Entregues</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="font-semibold border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 resize-x overflow-auto min-w-[250px] w-[350px]">{type === 'tinto' ? 'Cor' : 'Descrição do Fio'}</div>
                </th>
                <th className="font-semibold border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 resize-x overflow-auto min-w-[100px]">Destino</div>
                </th>
                <th className="font-semibold text-right border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 resize-x overflow-auto min-w-[100px]">Solicitado</div>
                </th>
                <th className="font-semibold text-right border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 resize-x overflow-auto min-w-[100px]">Entregue</div>
                </th>
                <th className="font-semibold text-right border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 resize-x overflow-auto min-w-[100px]">Em Falta</div>
                </th>
                <th className="font-semibold text-center border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 min-w-[100px]">Estado</div>
                </th>
                <th className="font-semibold text-center border-r border-slate-200 p-0 w-0">
                  <div className="px-4 py-3 min-w-[80px]">Histórico</div>
                </th>
                <th className="p-0 w-full"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stockList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhum fio encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                stockList.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        className="bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(item.id)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 break-words whitespace-normal min-w-[300px]" title={item.description}>
                          <div className="flex items-start gap-2">
                            <div className="mt-1">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              )}
                            </div>
                            <span>{item.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.section === 'Tecelagem' ? 'bg-indigo-100 text-indigo-800' :
                            item.section === 'Tinturaria' ? 'bg-fuchsia-100 text-fuchsia-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {item.section}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {item.requested.toLocaleString('pt-PT')} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          {item.delivered.toLocaleString('pt-PT')} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">
                          {item.pending > 0 ? item.pending.toLocaleString('pt-PT') : '0'} {item.pending > 0 ? item.unit : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.pending <= 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Completo
                            </span>
                          ) : item.delivered > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryItem(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver histórico"
                          >
                            <History className="w-5 h-5" />
                          </button>
                        </td>
                        <td></td>
                      </tr>
                      {isExpanded && item.items.map((subItem, idx) => (
                        <tr key={`${item.id}-sub-${idx}`} className="bg-slate-50/80 border-t-0">
                          <td className="px-4 py-2 pl-12 text-sm text-slate-600">
                            Pedido {subItem.requestNumber}
                            {subItem.coneColor && <span className="ml-2 text-xs text-slate-400">(Cor: {subItem.coneColor})</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-500">{subItem.section}</td>
                          <td className="px-4 py-2 text-right text-sm text-slate-600">{Number(subItem.quantity).toLocaleString('pt-PT')} {subItem.unit || 'Kg'}</td>
                          <td className="px-4 py-2 text-right text-sm text-emerald-600">{subItem.delivered.toLocaleString('pt-PT')} {subItem.unit || 'Kg'}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-amber-600">{subItem.pending > 0 ? subItem.pending.toLocaleString('pt-PT') : '0'} {subItem.pending > 0 ? (subItem.unit || 'Kg') : ''}</td>
                          <td className="px-4 py-2 text-center">
                            {subItem.pending <= 0 ? (
                              <span className="text-xs text-emerald-600 font-medium">Completo</span>
                            ) : subItem.delivered > 0 ? (
                              <span className="text-xs text-blue-600 font-medium">Parcial</span>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">Pendente</span>
                            )}
                          </td>
                          <td></td>
                          <td></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Histórico Recente</h3>
                <p className="text-sm text-slate-500 mt-1">{historyItem.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">Secção: {historyItem.section}</p>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {historyRecords.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum registo encontrado.</p>
              ) : (
                historyRecords.map((record) => (
                  <div key={record.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          record.type === 'entrada' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {record.type === 'entrada' ? 'Pedido' : 'Entrega'}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{record.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {record.date.toLocaleDateString('pt-PT')}
                      </p>
                      {record.note && (
                        <p className="text-xs text-slate-600 mt-1 italic">Obs: {record.note}</p>
                      )}
                    </div>
                    <div className={`font-bold text-sm ${record.type === 'entrada' ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {record.type === 'entrada' ? '+' : ''}{Number(record.quantity).toLocaleString('pt-PT')} {record.unit}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
