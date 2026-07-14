const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let presenterDisplayId = null;
const isDev = !app.isPackaged;

function getHymnsPath() {
  if (isDev) {
    return path.join(__dirname, 'hymns', 'hymns.json');
  }
  return path.join(process.resourcesPath, 'hymns', 'hymns.json');
}

// ── IPC Handlers ──

ipcMain.handle('get-displays', () => {
  const displays = screen.getAllDisplays();
  return displays.map((d) => ({
    id: d.id,
    isPrimary: d.isPrimary,
    size: { width: d.size.width, height: d.size.height },
    bounds: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height },
  }));
});

ipcMain.on('set-presenter-display', (_event, id) => {
  presenterDisplayId = id;
});

ipcMain.handle('get-hymns', async () => {
  try {
    const filePath = getHymnsPath();
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return { ok: true, data: JSON.parse(data) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('save-hymns', async (_event, hymns) => {
  try {
    const filePath = getHymnsPath();
    await fs.promises.writeFile(filePath, JSON.stringify(hymns, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Move window to target display ──

function moveWindowToDisplay(win) {
  if (presenterDisplayId == null) return;
  const displays = screen.getAllDisplays();
  const target = displays.find((d) => d.id === presenterDisplayId);
  if (!target) return;
  const { x, y, width, height } = target.bounds;
  const [winW, winH] = win.getSize();
  win.setBounds({
    x: x + Math.round((width - winW) / 2),
    y: y + Math.round((height - winH) / 2),
    width: winW,
    height: winH,
  });
}

// ── Main Window ──

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Baptist Console',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'presentation.html' || url === '' || url === 'about:blank') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-create-window', (win) => {
    moveWindowToDisplay(win);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
