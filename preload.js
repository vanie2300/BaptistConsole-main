const { contextBridge, ipcRenderer } = require('electron');

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
});
