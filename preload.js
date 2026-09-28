const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('externalApi', {
  open: (url) => ipcRenderer.send('open-external', String(url || '')),
});

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});

contextBridge.exposeInMainWorld('presenterApi', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setPresenterDisplay: (id) => {
    if (id === null || id === undefined) {
      ipcRenderer.send('set-presenter-display', null);
    } else {
      const parsed = Number(id);
      if (Number.isInteger(parsed)) {
        ipcRenderer.send('set-presenter-display', parsed);
      }
    }
  },
  getHymns: () => ipcRenderer.invoke('get-hymns'),
  saveHymns: (hymns) => {
    if (!Array.isArray(hymns)) {
      return Promise.resolve({ ok: false, error: 'Invalid data: expected array' });
    }
    return ipcRenderer.invoke('save-hymns', hymns);
  },
  pickBackgroundImage: () => ipcRenderer.invoke('pick-background-image'),
  closeWindow: () => ipcRenderer.send('presenter-close-window'),
  onDisplaysChanged: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    ipcRenderer.on('displays-changed', handler);
    return () => {
      ipcRenderer.removeListener('displays-changed', handler);
    };
  },
});

contextBridge.exposeInMainWorld('updateApi', {
  getState: () => ipcRenderer.invoke('update:get-state'),
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  defer: () => ipcRenderer.send('update:defer'),
  restart: () => ipcRenderer.send('update:restart'),
  onStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('update:status', handler);
    return () => {
      ipcRenderer.removeListener('update:status', handler);
    };
  },
  onReady: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update:ready', handler);
    return () => {
      ipcRenderer.removeListener('update:ready', handler);
    };
  },
});