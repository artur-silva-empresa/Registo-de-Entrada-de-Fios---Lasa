import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { get, set } from 'idb-keyval';

export type RequestItem = {
  id: string;
  requestId: string;
  section: string;
  quantity: number;
  unit?: string;
  description: string; // Tipo de fio for tinto
  coneColor: string; // Cor for tinto
  observations: string;
  bobbins?: number;
  requestedDate?: string;
  dyeingDate?: string;
  deadline?: string;
  weightPerBobbin?: string;
  bobbin2To1?: string;
};

export type Request = {
  id: string;
  type?: 'cru' | 'tinto';
  date: string;
  number: string;
  uploadDate: string;
};

export type Delivery = {
  id: string;
  itemId: string;
  quantity: number;
  date: string;
  deliveryNote?: string;
  deliveryDate?: string;
  observations?: string;
  status?: 'entregue' | 'bobinar_2_1' | 'nao_aprovado';
};

type AppState = {
  requests: Request[];
  items: RequestItem[];
  deliveries: Delivery[];
  highContrast?: boolean;
  darkMode?: boolean;
  lastInlineEditAt?: string;
};

type AppContextType = {
  state: AppState;
  addRequest: (request: Omit<Request, 'id' | 'uploadDate'>, items: Omit<RequestItem, 'id' | 'requestId'>[]) => void;
  addDelivery: (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string, status?: 'entregue' | 'bobinar_2_1' | 'nao_aprovado') => void;
  updateDelivery: (id: string, updates: Partial<Delivery>) => void;
  deleteDelivery: (id: string) => void;
  updateRequestItem: (itemId: string, updates: Partial<Omit<RequestItem, 'id' | 'requestId'>>) => void;
  deleteRequest: (id: string) => void;
  toggleHighContrast: () => void;
  toggleDarkMode: () => void;
  clearAll: () => void;
  importData: (data: AppState) => void;
  handleOpenFile: () => Promise<void>;
  handleNewFile: () => Promise<void>;
  saveToFile: () => Promise<void>;
  downloadBackup: () => void;
  closeDatabase: () => void;
  memorizeFile: () => Promise<{ success: boolean; message: string }>;
  fileHandle: any;
  storedHandle: any;
  showModal: (title: string, message: string, onConfirm?: () => void) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'fios_app_data';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ requests: [], items: [], deliveries: [], darkMode: true, highContrast: true });
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [storedHandle, setStoredHandle] = useState<any>(null);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm?: () => void}>({ isOpen: false, title: '', message: '' });

  const showModal = (title: string, message: string, onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, title, message, onConfirm });
  };

  const hideModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      get('lasa_db_handle').then(handle => {
        if (handle) {
          setStoredHandle(handle);
        }
      }).catch(e => console.warn('IndexedDB bloqueado pelo browser', e));
    } catch (e) {
      console.warn('IndexedDB bloqueado pelo browser', e);
    }
  }, []);

  // Tentativa de copiar o caminho para o clipboard na primeira interação do utilizador com a página
  useEffect(() => {
    const copyPathToClipboard = () => {
      try {
        navigator.clipboard.writeText("\\\\192.2.3.5\\nas15\\Armazém de Fio - Stocks").catch(() => {});
      } catch (err) {}
      document.removeEventListener('click', copyPathToClipboard);
    };
    document.addEventListener('click', copyPathToClipboard);
    return () => document.removeEventListener('click', copyPathToClipboard);
  }, []);

  const verifyAndRequestPermission = async (handle: any) => {
    try {
      if (!handle || typeof handle.queryPermission !== 'function') return false;
      const options = { mode: 'readwrite' };
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Erro ao verificar permissões', e);
      return false;
    }
  };

  // When state changes, save to file with Debounce to prevent file locking
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (fileHandle) {
      // Clear previous timeout if state changes rapidly
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 1.5 seconds of inactivity
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          if (!fileHandle || typeof fileHandle.queryPermission !== 'function') return;
          const hasPermission = await fileHandle.queryPermission({ mode: 'readwrite' });
          if (hasPermission === 'granted') {
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(state, null, 2));
            await writable.close();
            console.log('Auto-save concluído com sucesso.');
          }
        } catch (e) {
          console.error('Failed to auto-save to file', e);
        }
      }, 1500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, fileHandle]);

  const saveToFile = async () => {
    if (!fileHandle) {
      showModal('Erro', 'Nenhum ficheiro aberto. Use a opção de transferir backup.');
      return;
    }
    
    if ((fileHandle as any).isFallback) {
      downloadBackup();
      return;
    }

    try {
      const hasPermission = await verifyAndRequestPermission(fileHandle);
      if (!hasPermission) {
        showModal('Erro', 'Permissão de escrita negada pelo browser.');
        return;
      }
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
      showModal('Lasa Gestão de Stocks e Entradas', 'Alterações guardadas com sucesso no ficheiro!');
    } catch (e: any) {
      console.error('Failed to save to file', e);
      showModal('Erro', `Erro ao guardar: ${e.message || 'Verifique se o ficheiro não está aberto noutro programa.'}`);
    }
  };

  const fallbackDownload = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LasaBD.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal('Lasa Gestão de Stocks e Entradas', 'Backup transferido com sucesso (pasta de transferências do navegador)!');
  };

  const downloadBackup = async () => {
    try {
      // Fazemos a cópia de forma assíncrona sem await, para que o JS continue imediatamente
      navigator.clipboard.writeText("\\\\192.2.3.5\\nas15\\Armazém de Fio - Stocks").catch(() => {});

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            id: 'lasa_stocks_dir',
            suggestedName: 'LasaBD.json',
            types: [{
              description: 'Ficheiro de Base de Dados JSON',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(state, null, 2));
          await writable.close();
          
          showModal('Lasa Gestão de Stocks e Entradas', 'Backup guardado com sucesso!');
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn('API bloqueada, a usar transferência tradicional', err);
          if (err.name === 'SecurityError') {
             showModal('Lasa Gestão de Stocks e Entradas', 'A janela de escolha foi bloqueada pelo navegador.\nSe estiver na pré-visualização, abra a aplicação num Novo Separador (↗ no topo direito).\n\nO download será feito para a pasta de Transferências.');
          }
          fallbackDownload(state);
        }
      } else {
        showModal('Lasa Gestão de Stocks e Entradas', 'O seu navegador não suporta a janela de escolha de destino. O download será feito para a pasta de Transferências.');
        fallbackDownload(state);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Erro ao transferir backup', e);
        showModal('Erro', 'Erro ao transferir o ficheiro de backup.');
      }
    }
  };

  const closeDatabase = () => {
    // Force any pending saves to clear
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Release the file handle and clear state
    setFileHandle(null);
    setState(prev => ({ ...prev, requests: [], items: [], deliveries: [] }));
    
    // Attempt to close the browser tab
    try {
      window.open('', '_self', '');
      window.close();
    } catch (e) {
      console.error('Não foi possível fechar a aba automaticamente', e);
    }
  };

  const memorizeFile = async () => {
    try {
      navigator.clipboard.writeText("\\\\192.2.3.5\\nas15\\Armazém de Fio - Stocks").catch(() => {});

      if (!('showOpenFilePicker' in window)) {
        return { success: false, message: 'O seu browser não suporta acesso direto a ficheiros para memorização.' };
      }

      const [handle] = await (window as any).showOpenFilePicker({
        id: 'lasa_stocks_dir',
        types: [{
          description: 'Ficheiro de Base de Dados JSON',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      try {
        await set('lasa_db_handle', handle);
        setStoredHandle(handle);
        return { success: true, message: `Ficheiro "${handle.name}" memorizado com sucesso! Será sugerido ao abrir a aplicação.` };
      } catch (idbError) {
        return { success: false, message: 'O seu browser está a bloquear a memorização de ficheiros (IndexedDB desativado para ficheiros locais). Terá de abrir o ficheiro manualmente sempre que iniciar a aplicação.' };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { success: false, message: 'Operação cancelada.' };
      }
      return { success: false, message: 'O acesso direto a ficheiros está bloqueado neste ambiente (possivelmente devido a estar num iFrame ou falta de permissões). A memorização automática não funcionará.' };
    }
  };

  const handleOpenStoredFile = async () => {
    if (!storedHandle) return;
    try {
      const hasPermission = await verifyAndRequestPermission(storedHandle);
      if (!hasPermission) {
        showModal('Aviso', 'Aviso: Sem permissão de escrita. A gravação automática poderá não funcionar. Tente usar "Abrir Ficheiro Existente".');
      }
      const file = await storedHandle.getFile();
      const contents = await file.text();
      
      let parsed: any = { requests: [], items: [], deliveries: [] };
      if (contents.trim()) {
        parsed = JSON.parse(contents);
      }
      
      setState({
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
        darkMode: parsed.darkMode !== undefined ? parsed.darkMode : true,
        highContrast: parsed.highContrast !== undefined ? parsed.highContrast : true
      });
      setFileHandle(storedHandle);
    } catch (e: any) {
      console.error('Erro ao abrir ficheiro guardado', e);
      showModal('Erro', 'Erro ao abrir a base de dados recente. O ficheiro pode ter sido movido, apagado, ou o browser bloqueou o acesso. Por favor, abra o ficheiro manualmente.');
      setStoredHandle(null);
      try { await set('lasa_db_handle', null); } catch(err) {}
    }
  };

  const fallbackOpenFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) resolve(file);
        else reject(new Error('Nenhum ficheiro selecionado'));
      };
      input.oncancel = () => reject(new Error('Cancelado pelo utilizador'));
      input.click();
    });
  };

  const handleOpenFile = async () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(`Error attempting to enable fullscreen: ${err.message}`));
      }
      navigator.clipboard.writeText("\\\\192.2.3.5\\nas15\\Armazém de Fio - Stocks").catch(() => {});

      let handle: any = null;
      let contents = '';
      let isFallback = false;

      try {
        if ('showOpenFilePicker' in window) {
          [handle] = await (window as any).showOpenFilePicker({
            id: 'lasa_stocks_dir',
            types: [{
              description: 'Ficheiro de Base de Dados JSON',
              accept: { 'application/json': ['.json'] },
            }],
          });

          // Request write permission immediately so auto-save works
          const hasPermission = await verifyAndRequestPermission(handle);
          if (!hasPermission) {
            console.warn('Permissão de escrita negada');
          }

          const file = await handle.getFile();
          contents = await file.text();
        } else {
          throw new Error('Not supported');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        
        console.warn('File System Access API failed or blocked, falling back...', err);
        const file = await fallbackOpenFile();
        contents = await file.text();
        handle = { isFallback: true, name: file.name };
        isFallback = true;
        console.warn('Acesso direto a ficheiros bloqueado, gravação automática inativa');
      }
      
      let parsed: any = { requests: [], items: [], deliveries: [] };
      if (contents.trim()) {
        try {
          parsed = JSON.parse(contents);
        } catch (err) {
          showModal('Erro', 'O ficheiro selecionado não é um JSON válido.');
          return;
        }
      }
      
      setState({
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
        darkMode: parsed.darkMode !== undefined ? parsed.darkMode : true,
        highContrast: parsed.highContrast !== undefined ? parsed.highContrast : true
      });
      setFileHandle(handle);

      if (!isFallback) {
        setStoredHandle(handle);
        try {
          await set('lasa_db_handle', handle);
        } catch (idbError) {
          console.warn('IndexedDB bloqueado, não será possível memorizar o ficheiro', idbError);
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError' && e.message !== 'Cancelado pelo utilizador') {
        console.error('Erro ao abrir ficheiro', e);
        showModal('Erro', 'Erro ao abrir ficheiro: ' + e.message);
      }
    }
  };

  const handleNewFile = async () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(`Error attempting to enable fullscreen: ${err.message}`));
      }
      navigator.clipboard.writeText("\\\\192.2.3.5\\nas15\\Armazém de Fio - Stocks").catch(() => {});

      let handle: any = null;
      let isFallback = false;
      const initialState = { requests: [], items: [], deliveries: [], darkMode: true, highContrast: true };

      try {
        if ('showSaveFilePicker' in window) {
          handle = await (window as any).showSaveFilePicker({
            id: 'lasa_stocks_dir',
            suggestedName: 'base_de_dados_lasa.json',
            types: [{
              description: 'Ficheiro de Base de Dados JSON',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(initialState, null, 2));
          await writable.close();
        } else {
          throw new Error('Not supported');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        
        console.warn('File System Access API failed or blocked, falling back to memory...', err);
        handle = { isFallback: true, name: 'base_de_dados_lasa.json' };
        isFallback = true;
        showModal('Aviso', 'Aviso: O seu navegador não suporta criação direta de ficheiros. A base de dados foi criada na memória. Por favor, transfira o backup no fim!');
      }
      
      setState(initialState);
      setFileHandle(handle);
      
      if (!isFallback) {
        setStoredHandle(handle);
        try {
          await set('lasa_db_handle', handle);
        } catch (idbError) {
          console.warn('IndexedDB bloqueado', idbError);
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Erro ao criar ficheiro', e);
        showModal('Erro', 'Erro ao criar ficheiro: ' + e.message);
      }
    }
  };

  const addRequest = async (req: Omit<Request, 'id' | 'uploadDate'>, newItems: Omit<RequestItem, 'id' | 'requestId'>[]) => {
    setState(prev => {
      // Find existing request by number and type
      const existingRequest = prev.requests.find(r => r.number === req.number && r.type === req.type);

      if (existingRequest) {
        // Merge items
        let updatedItems = [...prev.items];
        
        newItems.forEach(newItem => {
          // Try to find matching item by description and coneColor
          const existingItemIndex = updatedItems.findIndex(
            i => i.requestId === existingRequest.id && 
                 i.description === newItem.description && 
                 i.coneColor === newItem.coneColor &&
                 i.section === newItem.section
          );

          if (existingItemIndex >= 0) {
            // Update existing item with new data (e.g. deadline, dyeingDate)
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              ...newItem,
              id: updatedItems[existingItemIndex].id, // keep original id
              requestId: existingRequest.id, // keep original requestId
            };
          } else {
            // Add as new item
            updatedItems.push({
              ...newItem,
              id: crypto.randomUUID(),
              requestId: existingRequest.id,
            });
          }
        });

        // Optionally update the request's uploadDate or other fields if needed
        const updatedRequests = prev.requests.map(r => 
          r.id === existingRequest.id ? { ...r, date: req.date } : r
        );

        return {
          ...prev,
          requests: updatedRequests,
          items: updatedItems,
        };
      }

      // If no existing request, create new
      const requestId = crypto.randomUUID();
      const request: Request = {
        ...req,
        id: requestId,
        uploadDate: new Date().toISOString(),
      };

      const items: RequestItem[] = newItems.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        requestId,
      }));

      return {
        ...prev,
        requests: [request, ...prev.requests],
        items: [...prev.items, ...items],
      };
    });
  };

  const addDelivery = async (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string, status?: 'entregue' | 'bobinar_2_1' | 'nao_aprovado') => {
    const delivery: Delivery = {
      id: crypto.randomUUID(),
      itemId,
      quantity,
      date: new Date().toISOString(),
      deliveryNote,
      deliveryDate,
      observations,
      status,
    };

    setState(prev => ({
      ...prev,
      deliveries: [delivery, ...prev.deliveries],
    }));
  };

  const updateDelivery = (id: string, updates: Partial<Delivery>) => {
    setState(prev => ({
      ...prev,
      deliveries: prev.deliveries.map(d => 
        d.id === id ? { ...d, ...updates } : d
      )
    }));
  };

  const deleteDelivery = (id: string) => {
    setState(prev => ({
      ...prev,
      deliveries: prev.deliveries.filter(d => d.id !== id)
    }));
  };

  const updateRequestItem = (itemId: string, updates: Partial<Omit<RequestItem, 'id' | 'requestId'>>) => {
    setState(prev => ({
      ...prev,
      lastInlineEditAt: new Date().toISOString(),
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const deleteRequest = async (id: string) => {
    setState(prev => ({
      ...prev,
      requests: prev.requests.filter(r => r.id !== id),
      items: prev.items.filter(i => i.requestId !== id),
      deliveries: prev.deliveries.filter(d => {
        const item = prev.items.find(i => i.id === d.itemId);
        return item?.requestId !== id;
      }),
    }));
  };

  const toggleHighContrast = () => {
    setState(prev => ({
      ...prev,
      highContrast: !prev.highContrast
    }));
  };

  const toggleDarkMode = () => {
    setState(prev => ({
      ...prev,
      darkMode: !prev.darkMode
    }));
  };

  const clearAll = async () => {
    setState(prev => ({ ...prev, requests: [], items: [], deliveries: [] }));
  };

  const importData = (data: AppState) => {
    setState(data);
  };

  if (!fileHandle) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-6 text-slate-900">LASA - Gestão de Fios</h1>
            <p className="text-slate-600 mb-8">
              Para começar, por favor selecione a base de dados (ficheiro .json) ou crie uma nova.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleOpenFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Abrir Ficheiro Existente (.json)
              </button>
              <button 
                onClick={handleNewFile}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer border border-slate-300 mt-2"
              >
                Criar Nova Base de Dados
              </button>
            </div>
          </div>
        </div>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-zinc-800 text-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
              <h3 className="text-lg font-medium mb-3">{modalConfig.title}</h3>
              <p className="text-zinc-300 mb-6 whitespace-pre-wrap">{modalConfig.message}</p>
              <div className="flex justify-center gap-3">
                {modalConfig.onConfirm && (
                  <button onClick={hideModal} className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors">
                    Cancelar
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    hideModal();
                  }} 
                  className="px-6 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <AppContext.Provider value={{ state, addRequest, addDelivery, updateDelivery, deleteDelivery, updateRequestItem, deleteRequest, toggleHighContrast, toggleDarkMode, clearAll, importData, handleOpenFile, handleNewFile, saveToFile, downloadBackup, closeDatabase, memorizeFile, fileHandle, storedHandle, showModal }}>
      {children}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-zinc-800 text-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-medium mb-3">{modalConfig.title}</h3>
            <p className="text-zinc-300 mb-6 whitespace-pre-wrap">{modalConfig.message}</p>
            <div className="flex justify-center gap-3">
              {modalConfig.onConfirm && (
                <button onClick={hideModal} className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors">
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                  hideModal();
                }} 
                className="px-6 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
