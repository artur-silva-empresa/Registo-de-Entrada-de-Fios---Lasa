import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Package, AlertCircle, CheckCircle2, TrendingUp, BellRing, Clock, ChevronDown, ChevronUp, ArrowRight, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportAlertsToExcel } from '../lib/excel';

const splitText = (text: string, maxLength: number) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  words.forEach(word => {
    if ((currentLine + word).length > maxLength) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.slice(0, 4);
};

const CustomXAxisTick = ({ x, y, payload }: any) => {
  const lines = splitText(payload.value, 18);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={24} textAnchor="middle" fill="currentColor" className="text-slate-900" fontSize={11} fontWeight="bold">
        {lines.map((line, index) => (
          <tspan x={0} dy={index === 0 ? 0 : 14} key={index}>
            {line}{index === 3 && payload.value.length > 72 ? '...' : ''}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const parseCustomDateLocal = (dateStr?: string): Date | null => {
  if (!dateStr || dateStr === '-') return null;
  const str = dateStr.trim();
      
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

export function Dashboard({ type = 'cru', onNavigate }: { type?: 'cru' | 'tinto', onNavigate?: (page: string) => void }) {
  const { state } = useAppStore();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'all' | '48h' | 'overdue'>('all');

  const requests = state.requests
    .filter(r => (r.type || 'cru') === type)
    .sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, ''), 10);
      const numB = parseInt(b.number.replace(/\D/g, ''), 10);
      
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numB - numA;
      }
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    });
  const requestIds = new Set(requests.map(r => r.id));
  const items = state.items.filter(i => requestIds.has(i.requestId));
  const itemIds = new Set(items.map(i => i.id));
  const deliveries = state.deliveries.filter(d => itemIds.has(d.itemId));

  const totalsByUnit = items.reduce((acc, item) => {
    const unit = item.unit || 'Kg';
    if (!acc[unit]) acc[unit] = { requested: 0, delivered: 0, pending: 0 };
    acc[unit].requested += Number(item.quantity || 0);
    return acc;
  }, {} as Record<string, { requested: number, delivered: number, pending: number }>);

  deliveries.forEach(d => {
    const item = items.find(i => i.id === d.itemId);
    if (item) {
      const unit = item.unit || 'Kg';
      if (!totalsByUnit[unit]) totalsByUnit[unit] = { requested: 0, delivered: 0, pending: 0 };
      totalsByUnit[unit].delivered += Number(d.quantity || 0);
    }
  });

  Object.keys(totalsByUnit).forEach(unit => {
    totalsByUnit[unit].pending = Math.max(0, totalsByUnit[unit].requested - totalsByUnit[unit].delivered);
  });

  const availableUnits = Object.keys(totalsByUnit);

  const pendingItemsCount = items.filter(item => {
    const delivered = deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    return delivered < Number(item.quantity || 0);
  }).length;

  const renderTotals = (type: 'requested' | 'delivered' | 'pending') => {
    const entries = Object.entries(totalsByUnit).filter(([_, data]) => data[type] > 0);
    if (entries.length === 0) return <p className="text-2xl font-bold text-slate-900">0</p>;
    
    return (
      <div className="space-y-1">
        {entries.map(([unit, data]) => (
          <div key={unit} className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{data[type].toLocaleString('pt-PT')}</span>
            <span className="text-sm font-medium text-slate-500">{unit}</span>
          </div>
        ))}
      </div>
    );
  };

  // Prepare data for the bar charts
  const chartDataByUnit = new Map<string, any[]>();
  
  availableUnits.forEach(unit => {
    const chartDataMap = new Map<string, any>();
    
    items.forEach(item => {
      const itemUnit = item.unit || 'Kg';
      if (itemUnit !== unit) return;

      const key = item.description;
      if (!chartDataMap.has(key)) {
        chartDataMap.set(key, {
          name: item.description,
          unit: unit,
          'Quantidade Pedida': 0,
          'Quantidade Entregue': 0,
          'Quantidade em Falta': 0,
        });
      }
      const data = chartDataMap.get(key);
      data['Quantidade Pedida'] += Number(item.quantity || 0);
    });

    deliveries.forEach(d => {
      const item = items.find(i => i.id === d.itemId);
      if (item) {
        const itemUnit = item.unit || 'Kg';
        if (itemUnit !== unit) return;

        const key = item.description;
        if (chartDataMap.has(key)) {
          chartDataMap.get(key)['Quantidade Entregue'] += Number(d.quantity || 0);
        }
      }
    });

    const chartData = Array.from(chartDataMap.values()).map(data => {
      data['Quantidade em Falta'] = Math.max(0, data['Quantidade Pedida'] - data['Quantidade Entregue']);
      return data;
    }).sort((a, b) => b['Quantidade Pedida'] - a['Quantidade Pedida']).slice(0, 15);

    if (chartData.length > 0) {
      chartDataByUnit.set(unit, chartData);
    }
  });

  // Calculate specific stats for Tinto (Lasa and Luzmonte)
  let lasaStats = { requested: 0, delivered: 0, pending: 0, onTime: 0, late: 0, totalDeliveries: 0 };
  let luzmonteStats = { requested: 0, delivered: 0, pending: 0, onTime: 0, late: 0, totalDeliveries: 0 };

  if (type === 'tinto') {
    const lasaRequests = requests.filter(r => r.number.toLowerCase().includes('lasa'));
    const luzmonteRequests = requests.filter(r => r.number.toLowerCase().includes('luzmonte'));

    const calcStats = (reqs: any[]) => {
      let req = 0, del = 0, pend = 0, onTime = 0, late = 0, totDel = 0;
      const reqIds = new Set(reqs.map(r => r.id));
      const reqItems = state.items.filter(i => reqIds.has(i.requestId));
      const reqItemIds = new Set(reqItems.map(i => i.id));
      const reqDeliveries = state.deliveries.filter(d => reqItemIds.has(d.itemId));

      reqItems.forEach(item => {
        req += Number(item.quantity || 0);
      });

      reqDeliveries.forEach(d => {
        del += Number(d.quantity || 0);
        
        const item = reqItems.find(i => i.id === d.itemId);
        let isLate = false;
        if (item && item.deadline) {
          const deadlineDate = parseCustomDateLocal(item.deadline);
          if (deadlineDate) {
            deadlineDate.setHours(0,0,0,0);
            const deliveryDateObj = new Date(d.deliveryDate || d.date);
            deliveryDateObj.setHours(0,0,0,0);
            if (deliveryDateObj > deadlineDate) {
              isLate = true;
            }
          }
        }
        totDel++;
        if (isLate) late++;
        else onTime++;
      });

      pend = Math.max(0, req - del);
      return { requested: req, delivered: del, pending: pend, onTime, late, totalDeliveries: totDel };
    };

    lasaStats = calcStats(lasaRequests);
    luzmonteStats = calcStats(luzmonteRequests);
  }

  const renderTintoTotals = (requested: number, pending: number) => {
    return (
      <div className="space-y-2 mt-2 w-full">
        <div className="flex justify-between items-end">
          <span className="text-sm font-medium text-slate-500">Total Pedido:</span>
          <div>
            <span className="text-xl font-bold text-slate-900">{requested.toLocaleString('pt-PT')}</span>
            <span className="text-sm font-medium text-slate-500 ml-1">Kg</span>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-sm font-medium text-slate-500">Total em Falta:</span>
          <div>
            <span className="text-xl font-bold text-amber-600">{pending.toLocaleString('pt-PT')}</span>
            <span className="text-sm font-medium text-slate-500 ml-1">Kg</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTintoDeliveries = (delivered: number, stats: typeof lasaStats) => {
    const pctOnTime = stats.totalDeliveries > 0 ? (stats.onTime / stats.totalDeliveries) * 100 : 0;
    const pctLate = stats.totalDeliveries > 0 ? (stats.late / stats.totalDeliveries) * 100 : 0;
    
    return (
      <div className="space-y-2 mt-2 w-full">
        <div className="flex justify-between items-end">
          <span className="text-sm font-medium text-slate-500">Total Entregue:</span>
          <div>
            <span className="text-xl font-bold text-emerald-600">{delivered.toLocaleString('pt-PT')}</span>
            <span className="text-sm font-medium text-slate-500 ml-1">Kg</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-100">
          <span className="text-slate-500">No Prazo:</span>
          <span className="font-semibold text-emerald-600">{pctOnTime.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Em Atraso:</span>
          <span className="font-semibold text-red-600">{pctLate.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  // Calculate 48h expiring deadlines
  const now = new Date();

  const expiringAlerts = items.map(item => {
    const req = requests.find(r => r.id === item.requestId);
    if (!req) return null;

    const itemDeliveries = deliveries.filter(d => d.itemId === item.id);
    const delivered = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const pendingQty = Number(item.quantity || 0) - delivered;
    if (pendingQty <= 0) return null;

    if (!item.deadline) return null;
    const deadlineDate = parseCustomDateLocal(item.deadline);
    if (!deadlineDate) return null;

    const deadlineEnd = new Date(deadlineDate);
    deadlineEnd.setHours(23, 59, 59, 999);

    const diffMs = deadlineEnd.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let status: 'today' | 'within48h' | 'overdue' | 'ok' = 'ok';
    let badgeLabel = '';
    let badgeColor = '';

    if (diffHours < 0) {
      status = 'overdue';
      badgeLabel = 'Em Atraso';
      badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40';
    } else if (diffHours <= 24) {
      status = 'today';
      badgeLabel = 'Expira Hoje (< 24h)';
      badgeColor = 'bg-red-100 text-red-800 border-red-300 animate-pulse dark:bg-red-500/25 dark:text-red-300 dark:border-red-500/50';
    } else if (diffHours <= 48) {
      status = 'within48h';
      badgeLabel = 'Expira Amanhã (< 48h)';
      badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40';
    } else {
      return null;
    }

    const dd = String(deadlineDate.getDate()).padStart(2, '0');
    const mm = String(deadlineDate.getMonth() + 1).padStart(2, '0');
    const yyyy = deadlineDate.getFullYear();
    const dateFormatted = `${dd}/${mm}/${yyyy}`;

    return {
      item,
      request: req,
      pendingQty,
      delivered,
      deadlineDate,
      dateFormatted,
      diffHours,
      status,
      badgeLabel,
      badgeColor,
    };
  }).filter(Boolean) as Array<{
    item: any;
    request: any;
    pendingQty: number;
    delivered: number;
    deadlineDate: Date;
    dateFormatted: string;
    diffHours: number;
    status: 'today' | 'within48h' | 'overdue' | 'ok';
    badgeLabel: string;
    badgeColor: string;
  }>;

  expiringAlerts.sort((a, b) => {
    const priorityOrder = { today: 1, within48h: 2, overdue: 3, ok: 4 };
    if (priorityOrder[a.status] !== priorityOrder[b.status]) {
      return priorityOrder[a.status] - priorityOrder[b.status];
    }
    return a.deadlineDate.getTime() - b.deadlineDate.getTime();
  });

  const count48h = expiringAlerts.filter(a => a.status === 'today' || a.status === 'within48h').length;
  const countOverdue = expiringAlerts.filter(a => a.status === 'overdue').length;

  const filteredAlerts = expiringAlerts.filter(alert => {
    if (alertFilter === '48h') return alert.status === 'today' || alert.status === 'within48h';
    if (alertFilter === 'overdue') return alert.status === 'overdue';
    return true;
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard {type === 'tinto' && '(Fio Tinto)'}</h1>
        <p className="text-slate-500 mt-2">Visão geral do estado dos pedidos e entregas de {type === 'cru' ? 'fio' : 'fio tinto'}.</p>
      </header>

      {/* Visual Notification Alert System for <= 48h Deadlines */}
      {expiringAlerts.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-red-50/80 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 border border-amber-200/90 dark:border-amber-500/35 rounded-2xl p-5 shadow-sm transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-amber-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="relative p-3 bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl shrink-0 border border-amber-500/20 dark:border-amber-500/30">
                <BellRing className="w-6 h-6 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Notificações de Prazos Próximos
                  </h2>
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white font-bold text-xs rounded-full shadow-xs">
                    ⚡ {count48h} <span className="hidden sm:inline">a expirar nas</span> próximas 48h
                  </span>
                  {countOverdue > 0 && (
                    <span className="px-2.5 py-0.5 bg-rose-600 text-white font-bold text-xs rounded-full shadow-xs">
                      ⚠️ {countOverdue} em atraso
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Destaque automático de artigos pendentes com entregas a expirar no limite de 48 horas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
              <div className="flex items-center bg-white/80 dark:bg-slate-950/80 p-1 rounded-lg border border-amber-200/60 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setAlertFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    alertFilter === 'all'
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos ({expiringAlerts.length})
                </button>
                <button
                  onClick={() => setAlertFilter('48h')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    alertFilter === '48h'
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Próximas 48h ({count48h})
                </button>
                {countOverdue > 0 && (
                  <button
                    onClick={() => setAlertFilter('overdue')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      alertFilter === 'overdue'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Em Atraso ({countOverdue})
                  </button>
                )}
              </div>

              <button
                onClick={() => exportAlertsToExcel(filteredAlerts, `Notificacoes_Prazos_${type === 'cru' ? 'Fio_Cru' : 'Fio_Tinto'}`)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                title="Exportar Notificações de Prazos Próximos para Excel"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Excel</span>
              </button>

              <button
                onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {isAlertsOpen ? (
                  <>
                    <span>Ocultar</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Ver Detalhes</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {isAlertsOpen && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAlerts.map(alert => {
                const isLasa = alert.request.number.toLowerCase().includes('lasa');
                const isLuzmonte = alert.request.number.toLowerCase().includes('luzmonte');

                return (
                  <div
                    key={alert.item.id}
                    className="bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-amber-200/70 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/60 transition-all flex flex-col justify-between gap-3 relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          #{alert.request.number}
                        </span>
                        {type === 'tinto' && isLasa && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold text-[10px] rounded-md border border-transparent dark:border-blue-700/50">
                            LASA
                          </span>
                        )}
                        {type === 'tinto' && isLuzmonte && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold text-[10px] rounded-md border border-transparent dark:border-purple-700/50">
                            LUZMONTE
                          </span>
                        )}
                      </div>

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${alert.badgeColor}`}>
                        {alert.badgeLabel}
                      </span>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm line-clamp-2" title={alert.item.description}>
                        {alert.item.description}
                      </p>
                      {alert.item.coneColor && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Cor: <span className="font-medium text-slate-700 dark:text-slate-300">{alert.item.coneColor}</span>
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-lg text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>Falta Entregar:</span>
                        <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                          {alert.pendingQty.toLocaleString('pt-PT')} {alert.item.unit || 'Kg'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                        <span>Prazo Final:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          {alert.dateFormatted}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate?.(type === 'tinto' ? 'tinto_pedidos' : 'cru_pedidos')}
                      className="w-full flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-3 bg-slate-100 hover:bg-amber-500 hover:text-white dark:bg-slate-700/70 dark:hover:bg-amber-500 dark:hover:text-white text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700"
                    >
                      <span>Ver no Pedido</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Sem Prazos Críticos (&lt; 48 Horas)
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs">
                Todos os pedidos pendentes de {type === 'cru' ? 'fio cru' : 'fio tinto'} estão dentro do prazo normal de entrega.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold rounded-full text-xs shrink-0">
            0 alertas
          </span>
        </div>
      )}

      {type === 'cru' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Solicitado" 
            value={renderTotals('requested')} 
            icon={Package} 
            color="text-blue-600" 
            bgColor="bg-blue-100" 
          />
          <StatCard 
            title="Total Entregue" 
            value={renderTotals('delivered')} 
            icon={CheckCircle2} 
            color="text-emerald-600" 
            bgColor="bg-emerald-100" 
          />
          <StatCard 
            title="Total em Falta" 
            value={renderTotals('pending')} 
            icon={AlertCircle} 
            color="text-amber-600" 
            bgColor="bg-amber-100" 
            onClick={() => onNavigate?.(`${type}_faltas`)}
            className="cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md"
          />
          <StatCard 
            title="Linhas Pendentes" 
            value={<p className="text-2xl font-bold text-slate-900">{pendingItemsCount}</p>} 
            icon={TrendingUp} 
            color="text-indigo-600" 
            bgColor="bg-indigo-100" 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Lasa" 
            value={renderTintoTotals(lasaStats.requested, lasaStats.pending)} 
            icon={Package} 
            color="text-blue-600" 
            bgColor="bg-blue-100" 
          />
          <StatCard 
            title="Lasa - Entregas" 
            value={renderTintoDeliveries(lasaStats.delivered, lasaStats)} 
            icon={CheckCircle2} 
            color="text-emerald-600" 
            bgColor="bg-emerald-100" 
          />
          <StatCard 
            title="Luzmonte" 
            value={renderTintoTotals(luzmonteStats.requested, luzmonteStats.pending)} 
            icon={Package} 
            color="text-purple-600" 
            bgColor="bg-purple-100" 
          />
          <StatCard 
            title="Luzmonte - Entregas" 
            value={renderTintoDeliveries(luzmonteStats.delivered, luzmonteStats)} 
            icon={CheckCircle2} 
            color="text-emerald-600" 
            bgColor="bg-emerald-100" 
          />
        </div>
      )}

      {type === 'cru' && (
        <div className="space-y-8">
          {Array.from(chartDataByUnit.entries()).map(([unit, chartData]) => (
            <div key={unit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Visão Geral por Fio - {unit} (Top 15)</h2>
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      interval={0} 
                      tick={<CustomXAxisTick />}
                    />
                    <YAxis tick={{ fontSize: 12, fill: 'currentColor', className: 'text-slate-500' }} />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [`${value.toLocaleString('pt-PT')} ${props.payload.unit}`, name]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="center" 
                      wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} 
                    />
                    <Bar dataKey="Quantidade Pedida" stackId="pedido" fill="#1e3a8a" barSize={16} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Quantidade Entregue" stackId="status" fill="#22c55e" barSize={16} />
                    <Bar dataKey="Quantidade em Falta" stackId="status" fill="transparent" stroke="#22c55e" strokeWidth={1} strokeDasharray="2 2" barSize={16} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
          
          {chartDataByUnit.size === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Visão Geral por Fio</h2>
              <p className="text-slate-500 text-sm text-center py-8">Nenhum dado disponível para o gráfico.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos Pedidos</h2>
          {requests.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum pedido registado.</p>
          ) : (
            <div className="space-y-4">
              {requests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Pedido #{req.number}</p>
                    <p className="text-xs text-slate-500">Data: {req.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {items.filter(i => i.requestId === req.id).length} itens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas Entradas</h2>
          {deliveries.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma entrada registada.</p>
          ) : (
            <div className="space-y-4">
              {deliveries.slice(0, 5).map(delivery => {
                const item = items.find(i => i.id === delivery.itemId);
                return (
                  <div key={delivery.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-medium text-slate-900 truncate" title={item?.description}>
                        {item?.description || 'Item desconhecido'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Guia: {delivery.deliveryNote || 'N/A'} • Data: {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-PT') : new Date(delivery.date).toLocaleDateString('pt-PT')}
                      </p>
                      {delivery.observations && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate" title={delivery.observations}>
                          Obs: {delivery.observations}
                        </p>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-emerald-600">
                        +{delivery.quantity} {item?.unit || 'Kg'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor, onClick, className = '' }: any) {
  return (
    <div 
      className={`bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-start gap-4 ${className}`}
      onClick={onClick}
    >
      <div className={`p-4 rounded-full ${bgColor} shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        {value}
      </div>
    </div>
  );
}
