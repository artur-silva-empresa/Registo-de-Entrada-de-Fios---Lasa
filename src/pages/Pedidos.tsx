import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { parseExcel, exportToExcel } from '../lib/excel';
import { Upload, FileSpreadsheet, Trash2, ChevronDown, ChevronUp, FileUp, ChevronRight, PackagePlus, Download, Pencil, Search, X } from 'lucide-react';

const parseCustomDateLocal = (dateStr?: string): Date | null => {
  if (!dateStr || dateStr === '-') return null;
  const str = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }
  
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    } else {
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let p2 = parts[2];
      
      let month = p0;
      let day = p1;
      
      if (p0 > 12) {
        day = p0;
        month = p1;
      }
      
      let year = parseInt(p2, 10);
      if (year < 100) year += 2000;
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
  }
  
  const dObj = new Date(str);
  if (!isNaN(dObj.getTime())) return dObj;
  
  return null;
};

const isPastDate = (dateStr?: string) => {
  const d = parseCustomDateLocal(dateStr);
  if (!d) return false;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  return d.getTime() < now.getTime();
};

const formatShortDate = (dateStr?: string) => {
  if (!dateStr || dateStr === '-') return '-';
  
  const dObj = parseCustomDateLocal(dateStr);
  if (dObj) {
    const dd = String(dObj.getDate()).padStart(2, '0');
    const mm = String(dObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dObj.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
  
  return dateStr;
};

const toInputDateValue = (dateStr?: string) => {
  const dObj = parseCustomDateLocal(dateStr);
  if (dObj) {
    const yyyy = dObj.getFullYear();
    const mm = String(dObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};

export function Pedidos({ type = 'cru' }: { type?: 'cru' | 'tinto' }) {
  const { state, addRequest, deleteRequest, addDelivery, updateDelivery, deleteDelivery, updateRequestItem } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedItemForDelivery, setSelectedItemForDelivery] = useState<any>(null);
  const [deliveryQuantity, setDeliveryQuantity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryObservations, setDeliveryObservations] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'entregue' | 'bobinar_2_1' | 'nao_aprovado'>('entregue');

  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [editDeliveryQuantity, setEditDeliveryQuantity] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryNote, setEditDeliveryNote] = useState('');
  const [editDeliveryObservations, setEditDeliveryObservations] = useState('');
  const [editDeliveryStatus, setEditDeliveryStatus] = useState<'entregue' | 'bobinar_2_1' | 'nao_aprovado'>('entregue');

  const [editingItemField, setEditingItemField] = useState<{ id: string, field: 'dyeingDate' | 'deadline' } | null>(null);
  const [editingItemValue, setEditingItemValue] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const startEditingItem = (item: any, field: 'dyeingDate' | 'deadline') => {
    setEditingItemField({ id: item.id, field });
    setEditingItemValue(toInputDateValue(item[field]));
  };

  const saveEditingItem = (id: string, field: 'dyeingDate' | 'deadline') => {
    if (editingItemField?.id === id && editingItemField.field === field) {
      let valToSave = editingItemValue;
      if (valToSave) {
        const [y, m, d] = valToSave.split('-');
        if (y && m && d) {
           valToSave = `${d}/${m}/${y.slice(-2)}`;
        }
      }
      updateRequestItem(id, { [field]: valToSave });
      setEditingItemField(null);
    }
  };

  const allRequests = state.requests
    .filter(r => (r.type || 'cru') === type)
    .sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, ''), 10);
      const numB = parseInt(b.number.replace(/\D/g, ''), 10);
      
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numB - numA;
      }
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    });
    
  const requestIds = new Set(allRequests.map(r => r.id));
  const allItems = state.items.filter(i => requestIds.has(i.requestId));

  const isItemTramar = (item: any) => item.bobbin2To1 && String(item.bobbin2To1).trim() !== '' && String(item.bobbin2To1).trim() !== '-';

  const requests = allRequests.filter(request => {
    if (type === 'cru' && filterType !== 'all') {
      const isCertificado = /^\d{4}\s*-/.test(request.number);
      if (filterType === 'certificados' && !isCertificado) return false;
      if (filterType === 'normais' && isCertificado) return false;
    }

    let requestItems = allItems.filter(i => i.requestId === request.id);

    if (type === 'tinto' && filterType !== 'all') {
      if (filterType === 'tramar') {
        requestItems = requestItems.filter(isItemTramar);
      } else if (filterType === 'urdir') {
        requestItems = requestItems.filter(i => !isItemTramar(i));
      } else if (filterType === 'atraso') {
        requestItems = requestItems.filter(i => {
          const delivered = state.deliveries.filter(d => d.itemId === i.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
          const isCompleted = delivered >= Number(i.quantity);
          return !isCompleted && isPastDate(i.deadline);
        });
      }
      if (requestItems.length === 0) return false;
    }

    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    return request.number.toLowerCase().includes(searchLower) ||
           requestItems.some(item => 
             item.description.toLowerCase().includes(searchLower) ||
             (item.coneColor && item.coneColor.toLowerCase().includes(searchLower)) ||
             (item.observations && item.observations.toLowerCase().includes(searchLower))
           );
  });
  
  const items = allItems.filter(i => {
    if (!requests.some(r => r.id === i.requestId)) return false;
    if (type === 'tinto' && filterType !== 'all') {
      if (filterType === 'tramar') return isItemTramar(i);
      if (filterType === 'urdir') return !isItemTramar(i);
      if (filterType === 'atraso') {
        const delivered = state.deliveries.filter(d => d.itemId === i.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
        const isCompleted = delivered >= Number(i.quantity);
        return !isCompleted && isPastDate(i.deadline);
      }
    }
    return true;
  });
  const itemIds = new Set(items.map(i => i.id));
  const deliveries = state.deliveries.filter(d => itemIds.has(d.itemId));

  const handleExport = () => {
    exportToExcel(requests, items, deliveries);
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      let totalAdded = 0;
      for (const file of files) {
        const parsed = await parseExcel(file);
        if (parsed.items.length > 0) {
          await addRequest(
            { number: parsed.number, date: parsed.date, type: parsed.type || type },
            parsed.items
          );
          totalAdded++;
        } else {
          alert(`Atenção: Nenhum artigo válido encontrado no ficheiro "${file.name}". O ficheiro não tem o formato esperado ou está vazio.`);
        }
      }
    } catch (error) {
      console.error('Error parsing excel', error);
      setUploadError('Erro ao processar um ou mais ficheiros Excel. Verifique o formato.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    const validFiles = files.filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (validFiles.length > 0) {
      await processFiles(validFiles);
    }
  };

  return (
    <div 
      className={`space-y-8 min-h-[calc(100vh-8rem)] rounded-xl transition-all duration-200 ${
        isDragging ? 'bg-red-50/30 outline-dashed outline-2 outline-red-400 outline-offset-8' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 whitespace-nowrap">Pedidos de {type === 'cru' ? 'Fio' : 'Tingimento'}</h1>
            <p className="text-slate-500 mt-2">Faça upload e gira as solicitações de entrega diária.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            <input
              type="file"
              accept=".xlsx, .xls"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'A processar...' : 'Upload Pedidos'}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {type === 'cru' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-700 sm:w-64"
            >
              <option value="all" className="bg-white text-slate-900">Todos os Pedidos</option>
              <option value="certificados" className="bg-white text-slate-900">Pedidos Fios Certificados</option>
              <option value="normais" className="bg-white text-slate-900">Pedidos Fios Normais</option>
            </select>
          )}
          {type === 'tinto' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-700 sm:w-64"
            >
              <option value="all" className="bg-white text-slate-900">Todos os Pedidos</option>
              <option value="tramar" className="bg-white text-slate-900">Fios para Tramar</option>
              <option value="urdir" className="bg-white text-slate-900">Fios para Urdir</option>
              <option value="atraso" className="bg-white text-slate-900">Em Atraso</option>
            </select>
          )}
        </div>
      </header>

      {state.lastInlineEditAt && (
        <div className="mb-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-2">
          <Pencil className="w-3 h-3 text-slate-400" />
          <span>
            <strong>Auditoria:</strong> Última modificação na tabela efetuada a {new Date(state.lastInlineEditAt).toLocaleString('pt-PT')}
          </span>
        </div>
      )}

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative">
          <span className="block sm:inline">{uploadError}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setUploadError(null)}
          >
            <span className="text-red-500 hover:text-red-700">×</span>
          </button>
        </div>
      )}

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-red-500 m-8">
          <div className="text-center flex flex-col items-center pointer-events-none">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <FileUp className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Largue os ficheiros aqui</h2>
            <p className="text-slate-500 mt-2">Suporta múltiplos ficheiros .xlsx e .xls</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        {requests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum pedido registado</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              Faça upload ou arraste ficheiros Excel com a solicitação de entrega diária para começar.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 text-red-600 font-medium hover:text-red-700"
            >
              Procurar ficheiros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {requests.map((request) => {
              const requestItems = items.filter(i => i.requestId === request.id);
              const isExpanded = expandedRequest === request.id;

              const totalQuantity = requestItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
              
              const completedItemsCount = requestItems.filter(item => {
                const itemDeliveries = deliveries.filter(d => d.itemId === item.id);
                const delivered = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
                return delivered >= Number(item.quantity || 0);
              }).length;
              
              const totalItemsCount = requestItems.length;
              const rawProgress = totalItemsCount > 0 ? (completedItemsCount / totalItemsCount) * 100 : 0;
              const progressDisplay = Math.min(100, Math.round(rawProgress)).toString();
              const progressWidth = Math.min(100, Math.round(rawProgress));

              return (
                <div key={request.id} className="bg-white">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 truncate">
                          {type === 'cru' ? 'Solicitação' : 'Pedido de Tingimento'} {request.number}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                          Data: {request.date.replace(/DE:.*/i, '').trim()} • Upload: {new Date(request.uploadDate).toLocaleDateString('pt-PT')}
                        </p>
                        {type === 'tinto' && requestItems[0]?.observations && (
                          <p className="text-sm text-slate-600 mt-1 truncate" title={requestItems[0].observations}>
                            <span className="font-medium">Obs:</span> {requestItems[0].observations}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden lg:block w-48 px-4 shrink-0">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider">Progresso</span>
                        <span className="font-bold text-slate-700">{progressDisplay}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${progressWidth === 100 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${progressWidth}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 justify-end ml-4 w-56">
                      <div className="text-right hidden sm:block flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{requestItems.length} itens</p>
                        <p className="text-xs text-slate-500 truncate">
                          {totalQuantity.toLocaleString('pt-PT')} qtd total
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestToDelete(request.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Apagar pedido"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 bg-slate-50 border-t border-slate-100">
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[10px] text-slate-500 uppercase bg-slate-100">
                            <tr>
                              {type === 'cru' ? (
                                <>
                                  <th className="px-2 py-2 rounded-tl-lg"><div className="resize-x overflow-auto min-w-[60px] pb-1">Secção</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Descrição</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Quantidade</div></th>
                                </>
                              ) : (
                                <>
                                  <th className="px-2 py-2 rounded-tl-lg"><div className="resize-x overflow-auto min-w-[60px] pb-1">Cor</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Tipo de Fio</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Bobines</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Data Pedida</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Data Tingimento</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Prazo Final</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Peso / Bob.</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Bobinar 2 p/ 1</div></th>
                                  <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Quantidade (Kg)</div></th>
                                </>
                              )}
                              <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Quantidade Entregue</div></th>
                              {type === 'cru' && (
                                <th className="px-2 py-2"><div className="resize-x overflow-auto min-w-[60px] pb-1">Observações</div></th>
                              )}
                              <th className="px-2 py-2 rounded-tr-lg w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {requestItems.map((item, idx) => {
                              const itemDeliveries = deliveries.filter(d => d.itemId === item.id);
                              const delivered = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
                              const hasDeliveries = itemDeliveries.length > 0;
                              const isItemExpanded = expandedItems.has(item.id);
                              
                              const isCompleted = delivered >= Number(item.quantity);
                              const isDeadlineDelayed = type === 'tinto' && !isCompleted && isPastDate(item.deadline);
                              
                              const sortedDeliveries = [...itemDeliveries].sort((a, b) => {
                                const dateA = new Date(a.deliveryDate || a.date).getTime();
                                const dateB = new Date(b.deliveryDate || b.date).getTime();
                                return dateB - dateA; // Sort descending (newest first)
                              });
                              
                              return (
                                <React.Fragment key={item.id}>
                                  <tr 
                                    className={`${isDeadlineDelayed ? 'bg-red-50' : 'bg-white'} ${hasDeliveries ? `cursor-pointer ${isDeadlineDelayed ? 'hover:bg-red-100' : 'hover:bg-slate-50'} transition-colors` : ''}`}
                                    onClick={() => hasDeliveries && toggleItem(item.id)}
                                  >
                                    {type === 'cru' ? (
                                      <>
                                        <td className="px-2 py-2 font-medium text-slate-900 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            {hasDeliveries ? (
                                              isItemExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            ) : (
                                              <div className="w-4 h-4 flex-shrink-0" />
                                            )}
                                            {item.section}
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{item.description}</td>
                                        <td className="px-2 py-2 font-bold text-slate-700 whitespace-nowrap">
                                          {Number(item.quantity).toLocaleString('pt-PT')} {item.unit || 'Kg'}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-2 py-2 font-medium text-slate-900 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            {hasDeliveries ? (
                                              isItemExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            ) : (
                                              <div className="w-4 h-4 flex-shrink-0" />
                                            )}
                                            <span className="truncate max-w-[120px] inline-block" title={item.coneColor || ''}>{item.coneColor || '-'}</span>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap"><span className="truncate max-w-[150px] inline-block" title={item.description}>{item.description}</span></td>
                                        <td className="px-2 py-2 font-bold text-slate-700 whitespace-nowrap">{item.bobbins || '-'}</td>
                                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{formatShortDate(item.requestedDate)}</td>
                                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap group hover:bg-slate-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); startEditingItem(item, 'dyeingDate'); }}>
                                          {editingItemField?.id === item.id && editingItemField?.field === 'dyeingDate' ? (
                                            <input
                                              type="date"
                                              autoFocus
                                              value={editingItemValue}
                                              onChange={(e) => setEditingItemValue(e.target.value)}
                                              onBlur={() => saveEditingItem(item.id, 'dyeingDate')}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEditingItem(item.id, 'dyeingDate');
                                                if (e.key === 'Escape') setEditingItemField(null);
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="px-1 py-0.5 border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-xs w-[110px]"
                                            />
                                          ) : (
                                            <div className="flex items-center justify-between min-w-[70px]">
                                              <span>{formatShortDate(item.dyeingDate)}</span>
                                              <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap group hover:bg-slate-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); startEditingItem(item, 'deadline'); }}>
                                          {editingItemField?.id === item.id && editingItemField?.field === 'deadline' ? (
                                            <input
                                              type="date"
                                              autoFocus
                                              value={editingItemValue}
                                              onChange={(e) => setEditingItemValue(e.target.value)}
                                              onBlur={() => saveEditingItem(item.id, 'deadline')}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEditingItem(item.id, 'deadline');
                                                if (e.key === 'Escape') setEditingItemField(null);
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="px-1 py-0.5 border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-xs w-[110px]"
                                            />
                                          ) : (
                                            <div className="flex items-center justify-between min-w-[70px]">
                                              <span>{formatShortDate(item.deadline)}</span>
                                              <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{item.weightPerBobbin || '-'}</td>
                                        <td className={`px-2 py-2 whitespace-nowrap font-medium ${itemDeliveries.some(d => d.status === 'bobinar_2_1') ? 'text-amber-500' : 'text-slate-600'}`}>
                                          {item.bobbin2To1 || '-'}
                                        </td>
                                        <td className="px-2 py-2 font-bold text-slate-700 whitespace-nowrap">
                                          {Number(item.quantity).toLocaleString('pt-PT')} {item.unit || 'Kg'}
                                        </td>
                                      </>
                                    )}
                                    <td className="px-2 py-2 font-medium text-emerald-600 whitespace-nowrap">{delivered.toLocaleString('pt-PT')}</td>
                                    {type === 'cru' && (
                                      <td className="px-2 py-2 text-slate-500 italic max-w-xs truncate" title={item.observations || ''}>{item.observations || '-'}</td>
                                    )}
                                    <td className="px-2 py-2 text-right">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItemForDelivery(item);
                                          setDeliveryQuantity(Math.max(0, Number(item.quantity) - delivered).toString());
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Registar Entrega"
                                      >
                                        <PackagePlus className="w-5 h-5" />
                                      </button>
                                    </td>
                                  </tr>
                                  {isItemExpanded && hasDeliveries && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={type === 'cru' ? 6 : 10} className="px-4 py-4">
                                        <div className="pl-6 border-l-2 border-slate-200 ml-2">
                                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Histórico de Entregas</h4>
                                          <div className="space-y-3">
                                            {sortedDeliveries.map((delivery) => (
                                              <div key={delivery.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm group">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                                                  <div className="flex items-center gap-2 min-w-[140px]">
                                                    <span className={`font-bold ${delivery.status === 'nao_aprovado' ? 'text-orange-500' : delivery.status === 'bobinar_2_1' ? 'text-amber-500' : 'text-emerald-600'}`}>{delivery.quantity} {item.unit || 'Kg'} {delivery.status === 'nao_aprovado' ? 'em análise' : delivery.status === 'bobinar_2_1' ? 'em bobinagem' : 'entregues'}</span>
                                                    <span className="text-slate-400 text-xs">•</span>
                                                    <span className="text-slate-600">
                                                      {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-PT') : new Date(delivery.date).toLocaleDateString('pt-PT')}
                                                    </span>
                                                  </div>
                                                  {delivery.deliveryNote && (
                                                    <div className="text-slate-600 flex items-center gap-1">
                                                      <span className="font-medium text-slate-500">Guia:</span> {delivery.deliveryNote}
                                                    </div>
                                                  )}
                                                  {delivery.observations && (
                                                    <div className="text-slate-600 flex items-center gap-1">
                                                      <span className="font-medium text-slate-500">Obs:</span> {delivery.observations}
                                                    </div>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingDelivery({ ...delivery, itemDescription: item.description, itemSection: item.section, itemUnit: item.unit, originalItem: item });
                                                    setEditDeliveryQuantity(delivery.quantity.toString());
                                                    setEditDeliveryDate(delivery.deliveryDate ? delivery.deliveryDate.split('T')[0] : delivery.date.split('T')[0]);
                                                    setEditDeliveryNote(delivery.deliveryNote || '');
                                                    setEditDeliveryObservations(delivery.observations || '');
                                                    setEditDeliveryStatus(delivery.status || 'entregue');
                                                  }}
                                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-100"
                                                  title="Editar Entrega"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeliveryToDelete(delivery.id);
                                                  }}
                                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-100"
                                                  title="Apagar Entrega"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {requestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Apagar Pedido</h3>
            <p className="text-slate-500 mb-6">
              Tem a certeza que deseja apagar este pedido? Esta ação não pode ser desfeita e todos os itens associados serão removidos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRequestToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteRequest(requestToDelete);
                  setRequestToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {deliveryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Apagar Entrega</h3>
            <p className="text-slate-500 mb-6">
              Tem a certeza que deseja apagar este registo de entrega? Esta ação não pode ser desfeita e a quantidade em falta será atualizada.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeliveryToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteDelivery(deliveryToDelete);
                  setDeliveryToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItemForDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Registar Entrega</h3>
            
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-900">{selectedItemForDelivery.description}</p>
              <p className="text-xs text-slate-500 mt-1">Secção: {selectedItemForDelivery.section}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade Entregue ({selectedItemForDelivery.unit || 'Kg'})
                </label>
                <input
                  type="number"
                  value={deliveryQuantity}
                  onChange={(e) => setDeliveryQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Guia de Remessa (Opcional)</label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Nº da guia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea
                  value={deliveryObservations}
                  onChange={(e) => setDeliveryObservations(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={2}
                  placeholder="Notas adicionais"
                />
              </div>

              {type === 'tinto' && isItemTramar(selectedItemForDelivery) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado da Entrega</label>
                  <select
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value as 'entregue' | 'bobinar_2_1' | 'nao_aprovado')}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="bobinar_2_1" className="bg-white text-slate-900">Em processo de bobinagem</option>
                    <option value="entregue" className="bg-white text-slate-900">Fio entregue</option>
                    <option value="nao_aprovado" className="bg-white text-slate-900">Fio não aprovado</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedItemForDelivery(null);
                  setDeliveryNote('');
                  setDeliveryObservations('');
                  setDeliveryStatus('entregue');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedItemForDelivery && deliveryQuantity) {
                    addDelivery(
                      selectedItemForDelivery.id,
                      Number(deliveryQuantity),
                      deliveryNote,
                      deliveryDate,
                      deliveryObservations,
                      deliveryStatus
                    );
                    setSelectedItemForDelivery(null);
                    setDeliveryNote('');
                    setDeliveryObservations('');
                    setDeliveryStatus('entregue');
                  }
                }}
                disabled={!deliveryQuantity || Number(deliveryQuantity) <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Editar Entrega</h3>
            
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-900">{editingDelivery.itemDescription}</p>
              <p className="text-xs text-slate-500 mt-1">Secção: {editingDelivery.itemSection}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade Entregue ({editingDelivery.itemUnit || 'Kg'})
                </label>
                <input
                  type="number"
                  value={editDeliveryQuantity}
                  onChange={(e) => setEditDeliveryQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Guia de Remessa (Opcional)</label>
                <input
                  type="text"
                  value={editDeliveryNote}
                  onChange={(e) => setEditDeliveryNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nº da guia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea
                  value={editDeliveryObservations}
                  onChange={(e) => setEditDeliveryObservations(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Notas adicionais"
                />
              </div>

              {type === 'tinto' && editingDelivery?.originalItem && isItemTramar(editingDelivery.originalItem) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado da Entrega</label>
                  <select
                    value={editDeliveryStatus}
                    onChange={(e) => setEditDeliveryStatus(e.target.value as 'entregue' | 'bobinar_2_1' | 'nao_aprovado')}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bobinar_2_1" className="bg-white text-slate-900">Em processo de bobinagem</option>
                    <option value="entregue" className="bg-white text-slate-900">Fio entregue</option>
                    <option value="nao_aprovado" className="bg-white text-slate-900">Fio não aprovado</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingDelivery(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (editingDelivery && editDeliveryQuantity) {
                    updateDelivery(editingDelivery.id, {
                      quantity: Number(editDeliveryQuantity),
                      deliveryDate: editDeliveryDate,
                      deliveryNote: editDeliveryNote,
                      observations: editDeliveryObservations,
                      status: editDeliveryStatus
                    });
                    setEditingDelivery(null);
                  }
                }}
                disabled={!editDeliveryQuantity || Number(editDeliveryQuantity) <= 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
