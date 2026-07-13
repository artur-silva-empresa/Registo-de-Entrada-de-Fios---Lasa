import * as XLSX from 'xlsx';
import { Request, RequestItem, Delivery } from '../store';
import { formatShortDate } from './utils';

export type ParsedRequest = {
  number: string;
  date: string;
  type?: 'cru' | 'tinto';
  items: {
    section: string;
    quantity: number;
    unit?: string;
    description: string;
    coneColor: string;
    observations: string;
    bobbins?: number;
    requestedDate?: string;
    dyeingDate?: string;
    deadline?: string;
    weightPerBobbin?: string;
    bobbin2To1?: string;
  }[];
};

export const exportToExcel = (requests: Request[], items: RequestItem[], deliveries: Delivery[], filename: string = 'Exportacao_Stock.xlsx') => {
  const exportData: any[] = [];

  items.forEach(item => {
    const request = requests.find(r => r.id === item.requestId);
    const itemDeliveries = deliveries.filter(d => d.itemId === item.id);
    
    // Sort deliveries chronologically to calculate running pending amounts
    itemDeliveries.sort((a, b) => {
      const dateA = new Date(a.deliveryDate || a.date).getTime();
      const dateB = new Date(b.deliveryDate || b.date).getTime();
      return dateA - dateB;
    });

    const deliveredTotal = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const finalPending = Number(item.quantity || 0) - deliveredTotal;
    const isTinto = request?.type === 'tinto';
    const isTramar = isTinto ? (item.bobbin2To1 && String(item.bobbin2To1).trim() !== '' && String(item.bobbin2To1).trim() !== '-') : false;
    const destinoLabel = isTinto ? (isTramar ? 'Fio para Tramar' : 'Fio para Urdir') : item.section;

    if (itemDeliveries.length === 0) {
      const row: any = {
        'Número do pedido': request?.number || 'N/A'
      };
      if (isTinto) {
        row['Cor'] = item.coneColor || '';
      }
      row['Descrição de Fio'] = item.description;
      row['Destino'] = destinoLabel;
      row['Solicitado'] = `${Number(item.quantity || 0)} ${item.unit || 'Kg'}`;
      row['Em falta'] = finalPending > 0 ? `${finalPending} ${item.unit || 'Kg'}` : '0';
      if (isTinto) {
        row['Data Pedida'] = formatShortDate(item.requestedDate);
        row['Prazo Final'] = formatShortDate(item.deadline);
      }
      row['Estado'] = 'Pendente';
      row['Quantidade entregue'] = '0';
      row['Guia de Remessa'] = '';
      row['Data da entrega'] = '';
      row['Observações'] = '';
      exportData.push(row);
    } else {
      let runningDelivered = 0;
      itemDeliveries.forEach(d => {
        runningDelivered += Number(d.quantity || 0);
        const pendingAtDelivery = Number(item.quantity || 0) - runningDelivered;
        
        let rowStatus = 'Pendente';
        if (d.status === 'nao_aprovado') rowStatus = 'Em análise';
        else if (pendingAtDelivery <= 0) rowStatus = 'Completo';
        else if (runningDelivered > 0) rowStatus = 'Parcial';

        const date = new Date(d.deliveryDate || d.date).toLocaleDateString('pt-PT');
        const row: any = {
          'Número do pedido': request?.number || 'N/A'
        };
        if (isTinto) {
          row['Cor'] = item.coneColor || '';
        }
        row['Descrição de Fio'] = item.description;
        row['Destino'] = destinoLabel;
        row['Solicitado'] = `${Number(item.quantity || 0)} ${item.unit || 'Kg'}`;
        row['Em falta'] = pendingAtDelivery > 0 ? `${pendingAtDelivery} ${item.unit || 'Kg'}` : '0';
        if (isTinto) {
          row['Data Pedida'] = formatShortDate(item.requestedDate);
          row['Prazo Final'] = formatShortDate(item.deadline);
        }
        row['Estado'] = rowStatus;
        row['Quantidade entregue'] = `${d.quantity} ${item.unit || 'Kg'}`;
        row['Guia de Remessa'] = d.deliveryNote || '';
        row['Data da entrega'] = date;
        row['Observações'] = d.observations || '';
        exportData.push(row);
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  if (exportData.length > 0) {
    const keys = Object.keys(exportData[0]);
    const wscols = keys.map(key => {
      let width = 15;
      if (key === 'Descrição de Fio' || key === 'Observações') width = 40;
      else if (key === 'Destino' || key === 'Quantidade entregue') width = 20;
      else if (key === 'Solicitado' || key === 'Em falta' || key === 'Estado') width = 12;
      return { wch: width };
    });
    worksheet['!cols'] = wscols;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
  
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const exportDeliveriesToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const wscols = [
    { wch: 15 }, // Data de Entrega
    { wch: 15 }, // Pedido
    { wch: 40 }, // Fio
    { wch: 15 }, // Secção
    { wch: 15 }, // Quantidade
    { wch: 10 }, // Unidade
    { wch: 20 }, // Guia de Remessa
    { wch: 40 }  // Observações
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const parseExcel = async (file: File): Promise<ParsedRequest> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' }) as any[][];

        let isTinto = false;
        
        // Check if it's tinto
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const rowStr = rows[i]?.join(' ').toLowerCase() || '';
          if (rowStr.includes('pedido de tingimento')) {
            isTinto = true;
            break;
          }
        }

        if (isTinto) {
          let requestNumber = '';
          let requestDate = '';
          let inTable = false;
          let currentCor = '';
          let currentDataPedida = '';
          let currentDataTingimento = '';
          let currentPrazoFinal = '';
          let currentPesoStr = '';
          const items = [];
          
          let colIdx = {
            cor: -1,
            tipo: -1,
            bobines: -1,
            dataPedida: -1,
            dataTingimento: -1,
            prazoFinal: -1,
            peso: -1,
            bobinar: -1
          };
          let globalObs = '';

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rowStr = row.join(' ').trim();
            const rowLower = rowStr.toLowerCase();

            // Try to find request number and date
            if (!requestNumber) {
              const reqMatch = rowStr.match(/Pedido n[º°]\s*(\d+)/i);
              if (reqMatch) requestNumber = reqMatch[1];
            }
            if (!requestDate) {
              const dateMatch = rowStr.match(/Data de Emissão\s*:\s*([^ ]+)/i) || rowStr.match(/Emissão\s*:\s*([^ ]+)/i);
              if (dateMatch) requestDate = dateMatch[1].trim();
            }

            if (rowLower.includes('obs:') || rowLower.includes('obs :') || rowStr.startsWith('OBS')) {
               let foundObs = false;
               for (let j = 0; j < row.length; j++) {
                 if (row[j]) {
                   const cellStr = String(row[j]).trim();
                   if (cellStr.toLowerCase().startsWith('obs')) {
                     foundObs = true;
                     const afterColon = cellStr.substring(cellStr.toLowerCase().indexOf('obs') + 3).replace(/^:/, '').trim();
                     if (afterColon) {
                       globalObs += (globalObs ? ' ' : '') + afterColon;
                     }
                   } else if (foundObs) {
                     globalObs += (globalObs ? ' ' : '') + cellStr;
                   }
                 }
               }
               continue;
            }

            if (!inTable) {
              const rowStrNoSpace = rowLower.replace(/\s+/g, ' ');
              if (rowStrNoSpace.includes('tipo de fio') && (rowStrNoSpace.includes('bobines') || rowStrNoSpace.includes('bobinas'))) {
                inTable = true;
                let firstCol = -1;
                // Detect column indices
                for (let j = 0; j < row.length; j++) {
                  if (row[j]) {
                    const h = String(row[j]).toLowerCase().replace(/\s+/g, ' ').trim();
                    if (firstCol === -1 && h !== '') firstCol = j;
                    
                    if (h.includes('cor')) colIdx.cor = j;
                    else if (h.includes('tipo de fio')) colIdx.tipo = j;
                    else if (h.includes('bobines') || h.includes('bobinas')) colIdx.bobines = j;
                    else if (h.includes('data pedida')) colIdx.dataPedida = j;
                    else if (h.includes('data tingimento') || h.includes('tingimento')) colIdx.dataTingimento = j;
                    else if (h.includes('prazo final') || h.includes('prazo')) colIdx.prazoFinal = j;
                    else if (h.includes('peso')) colIdx.peso = j;
                    else if (h.includes('bobinar')) colIdx.bobinar = j;
                  }
                }
                
                // Fallbacks if not found exactly
                if (firstCol === -1) firstCol = 0;
                if (colIdx.cor === -1) colIdx.cor = firstCol;
                if (colIdx.tipo === -1) colIdx.tipo = firstCol + 1;
                if (colIdx.bobines === -1) colIdx.bobines = firstCol + 2;
                if (colIdx.dataPedida === -1) colIdx.dataPedida = firstCol + 3;
                if (colIdx.dataTingimento === -1) colIdx.dataTingimento = firstCol + 4;
                if (colIdx.prazoFinal === -1) colIdx.prazoFinal = firstCol + 5;
                if (colIdx.peso === -1) colIdx.peso = firstCol + 6;
                if (colIdx.bobinar === -1) colIdx.bobinar = firstCol + 7;
                
                continue;
              }
            }

            if (inTable) {
              let colCor = colIdx.cor >= 0 ? row[colIdx.cor] : undefined;
              const colTipo = colIdx.tipo >= 0 ? row[colIdx.tipo] : undefined;
              const colBobines = colIdx.bobines >= 0 ? row[colIdx.bobines] : undefined;
              
              if (colCor && String(colCor).trim() !== '') {
                currentCor = String(colCor).trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              }
              
              if (colIdx.dataPedida >= 0 && row[colIdx.dataPedida] && String(row[colIdx.dataPedida]).trim() !== '') {
                currentDataPedida = String(row[colIdx.dataPedida]).trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              }
              if (colIdx.dataTingimento >= 0 && row[colIdx.dataTingimento] && String(row[colIdx.dataTingimento]).trim() !== '') {
                currentDataTingimento = String(row[colIdx.dataTingimento]).trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              }
              if (colIdx.prazoFinal >= 0 && row[colIdx.prazoFinal] && String(row[colIdx.prazoFinal]).trim() !== '') {
                currentPrazoFinal = String(row[colIdx.prazoFinal]).trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              }
              if (colIdx.peso >= 0 && row[colIdx.peso] && String(row[colIdx.peso]).trim() !== '') {
                currentPesoStr = String(row[colIdx.peso]).trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              }
              
              if (colTipo && String(colTipo).trim() !== '' && colBobines !== undefined && colBobines !== null && String(colBobines).trim() !== '') {
                const descStr = String(colTipo).trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
                const bobbins = parseFloat(String(colBobines));
                if (!isNaN(bobbins)) {
                  let pesoGramos = 0;
                  const pesoMatch = currentPesoStr.match(/([\d.,]+)\s*gr/i);
                  if (pesoMatch) {
                    pesoGramos = parseFloat(pesoMatch[1].replace(',', '.'));
                  }
                  
                  let quantity = bobbins;
                  let unit = 'Bobines';
                  
                  if (pesoGramos > 0) {
                     quantity = (bobbins * pesoGramos) / 1000;
                     unit = 'Kg';
                  }

                  items.push({
                    section: 'Tingimento',
                    quantity: quantity,
                    unit: unit,
                    description: descStr,
                    coneColor: currentCor,
                    observations: '', // populated after loop
                    bobbins: bobbins,
                    requestedDate: currentDataPedida,
                    dyeingDate: currentDataTingimento,
                    deadline: currentPrazoFinal,
                    weightPerBobbin: currentPesoStr,
                    bobbin2To1: colIdx.bobinar >= 0 && row[colIdx.bobinar] ? String(row[colIdx.bobinar]).trim() : ''
                  });
                }
              }
            }
          }
          
          if (globalObs && items.length > 0) {
            items.forEach(item => {
              item.observations = globalObs;
            });
          }

          resolve({ number: requestNumber || 'N/A', date: requestDate || 'N/A', type: 'tinto', items: items });
          return;
        }

        // --- OLD LOGIC (Cru) ---
        // Try to get request number from F1
        const f1Cell = worksheet['F1'];
        let requestNumber = f1Cell ? String(f1Cell.w || f1Cell.v).trim() : '';
        let requestDate = '';
        let currentSection = '';
        const items = [];

        let inTable = false;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Try to find request number
          if (!requestNumber) {
            const rowStr = row.join(' ').trim();
            const reqMatch = rowStr.match(/Solicitação de entrega diária de fio\s*(.+)/i);
            if (reqMatch) {
              requestNumber = reqMatch[1].trim();
            }
          }

          // Try to find date
          if (!requestDate) {
             const rowStr = row.join(' ').trim();
             const dateMatch = rowStr.match(/DATA\s*-\s*(.+)/i);
             if (dateMatch) {
               let extractedDate = dateMatch[1].trim();
               // Remove "DE:????" or similar artifacts
               extractedDate = extractedDate.replace(/DE:.*/i, '').trim();
               requestDate = extractedDate;
             } else if (rowStr.toLowerCase().includes('data')) {
               // Look for a date pattern in the same row if it contains 'data'
               const genericDateMatch = rowStr.match(/(\d{2}\/\d{2}\/\d{4})/);
               if (genericDateMatch) {
                 requestDate = genericDateMatch[1];
               }
             }
          }

          // Detect table start
          if (!inTable) {
            const rowText = row.map(c => String(c).toLowerCase()).join(' ');
            if (rowText.includes('cor de cone') || rowText.includes('descrição') || rowText.includes('fio') || rowText.includes('quantidade')) {
              inTable = true;
              continue;
            }
          }

          if (inTable) {
            const col0 = row[0];
            const col1 = row[1];
            const col2 = row[2];
            const col3 = row[3];

            // If col0 has a number, it's an item
            if (col0 !== undefined && col0 !== null && col0 !== '') {
              const quantity = parseFloat(col0);
              if (!isNaN(quantity)) {
                let description = col1 ? String(col1).trim() : '';
                let unit = 'Kg'; // Default unit
                const col0Str = String(col0).trim().toLowerCase();

                // Check if unit is in col0 (e.g., "700 Kilos")
                if (col0Str.includes('kilo') || col0Str.includes('quilo') || col0Str.includes('kg')) {
                  unit = 'Kg';
                } else if (col0Str.includes('palete')) {
                  unit = 'Paletes';
                } else if (col0Str.includes('bobine')) {
                  unit = 'Bobines';
                } else if (col0Str.includes('caixa')) {
                  unit = 'Caixas';
                } else {
                  // Extract unit from description
                  const lowerDesc = description.toLowerCase();
                  if (lowerDesc.startsWith('kilos de ') || lowerDesc.startsWith('quilos de ') || lowerDesc.startsWith('kg de ') || lowerDesc.startsWith('kilos ') || lowerDesc.startsWith('quilos ') || lowerDesc.startsWith('kg ')) {
                    unit = 'Kg';
                    description = description.replace(/^(kilos|quilos|kg)(\s+de)?\s+/i, '');
                  } else if (lowerDesc.startsWith('paletes de ') || lowerDesc.startsWith('palete de ') || lowerDesc.startsWith('paletes ') || lowerDesc.startsWith('palete ')) {
                    unit = 'Paletes';
                    description = description.replace(/^paletes?(\s+de)?\s+/i, '');
                  } else if (lowerDesc.startsWith('bobines de ') || lowerDesc.startsWith('bobine de ') || lowerDesc.startsWith('bobines ') || lowerDesc.startsWith('bobine ')) {
                    unit = 'Bobines';
                    description = description.replace(/^bobines?(\s+de)?\s+/i, '');
                  } else if (lowerDesc.startsWith('caixas de ') || lowerDesc.startsWith('caixa de ') || lowerDesc.startsWith('caixas ') || lowerDesc.startsWith('caixa ')) {
                    unit = 'Caixas';
                    description = description.replace(/^caixas?(\s+de)?\s+/i, '');
                  }
                }

                items.push({
                  section: currentSection || 'Geral',
                  quantity: quantity,
                  unit: unit,
                  description: description,
                  coneColor: col2 ? String(col2).trim() : '',
                  observations: col3 ? String(col3).trim() : '',
                });
              }
            } else if ((col0 === undefined || col0 === null || col0 === '') && col1 && typeof col1 === 'string' && col1.trim() !== '') {
              // Check if col1 is actually an item with quantity and description combined
              const col1Str = col1.trim();
              const match = col1Str.match(/^([\d.,]+)\s*(kilos?|quilos?|kg|paletes?|bobines?|caixas?)(\s+de)?\s+(.+)/i);
              if (match) {
                const quantity = parseFloat(match[1].replace(',', '.'));
                let unitStr = match[2].toLowerCase();
                let unit = 'Kg';
                if (unitStr.includes('palete')) unit = 'Paletes';
                else if (unitStr.includes('bobine')) unit = 'Bobines';
                else if (unitStr.includes('caixa')) unit = 'Caixas';
                
                items.push({
                  section: currentSection || 'Geral',
                  quantity: quantity,
                  unit: unit,
                  description: match[4].trim(),
                  coneColor: col2 ? String(col2).trim() : '',
                  observations: col3 ? String(col3).trim() : '',
                });
                continue;
              }

              // Otherwise it's a section header. Avoid common footer texts.
              const col1Lower = col1Str.toLowerCase();
              if (col1Lower.includes('total') || col1Lower.includes('visto') || col1Lower.includes('aprovado')) {
                continue; 
              }
              currentSection = col1Str;
              continue;
            }
          }
        }

        resolve({ number: requestNumber || 'N/A', date: requestDate || 'N/A', type: 'cru', items: items });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
