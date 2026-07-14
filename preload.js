const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('presenterApi', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setPresenterDisplay: (id) => ipcRenderer.send('set-presenter-display', id),
  getHymns: () => ipcRenderer.invoke('get-hymns'),
  saveHymns: (hymns) => ipcRenderer.invoke('save-hymns', hymns),
});
