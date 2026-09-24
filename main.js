const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
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

function ensureHymnsDir() {
  const dir = path.dirname(getHymnsPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
  if (id === null || id === undefined) {
    presenterDisplayId = null;
  } else if (typeof id === 'number' && Number.isInteger(id)) {
    presenterDisplayId = id;
  } else if (typeof id === 'string') {
    const parsed = Number(id);
    if (Number.isInteger(parsed)) {
      presenterDisplayId = parsed;
    }
  }
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
    if (!Array.isArray(hymns)) {
      return { ok: false, error: 'Invalid hymns data: expected an array' };
    }
    ensureHymnsDir();
    const filePath = getHymnsPath();
    await fs.promises.writeFile(filePath, JSON.stringify(hymns, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pick-background-image', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Background Image',
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// ── Presenter window guards ──

function debugLog(msg) {
  console.log('[presenter] ' + msg);
  try {
    fs.appendFileSync(
      path.join(process.env.TEMP || __dirname, 'presenter-debug.log'),
      new Date().toISOString() + ' [presenter] ' + msg + '\n'
    );
  } catch (err) {}
}

function isPresenterWindow(win) {
  return Boolean(win) && !win.isDestroyed() && win !== mainWindow;
}

function destroyPresenterWindow(win) {
  if (!win || win.isDestroyed()) return;
  debugLog('destroying presenter window, id=' + win.id);
  if (win.isFullScreen()) {
    // Safety net if a window somehow entered native fullscreen anyway.
    try { win.setFullScreen(false); } catch (err) {}
  }
  if (!win.isDestroyed()) win.destroy();
}

function guardPresenterWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win === mainWindow || win.__presenterGuarded) return;
  win.__presenterGuarded = true;
  debugLog('guard attached, id=' + win.id);

  if (win.webContents && typeof win.webContents.on === 'function') {
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        debugLog('ESC in presenter, id=' + win.id);
        _event.preventDefault();
        destroyPresenterWindow(win);
      }
    });
  }
  win.on('minimize', () => {
    debugLog('minimize event, id=' + win.id);
    destroyPresenterWindow(win);
  });
}

// Loose-net 1: attach guards to any popup no matter how it was created.
setInterval(() => {
  for (const w of BrowserWindow.getAllWindows()) guardPresenterWindow(w);
}, 1000);

// Loose-net 2: ESC while the MAIN window has focus also kills presenters.
function hookMainWindowEscape() {
  if (!mainWindow || mainWindow.__escHooked) return;
  mainWindow.__escHooked = true;
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || input.key !== 'Escape') return;
    const presenters = BrowserWindow.getAllWindows().filter(isPresenterWindow);
    if (presenters.length > 0) {
      e.preventDefault();
      for (const w of presenters) {
        debugLog('ESC@main destroying, id=' + w.id);
        destroyPresenterWindow(w);
      }
    }
  });
}

// Loose-net 3: watchdog — if a presenter ends up minimized/hidden for any reason, kill it.
setInterval(() => {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!isPresenterWindow(w)) continue;
    if (w.isMinimized() || !w.isVisible()) {
      debugLog('watchdog destroy minimized/hidden, id=' + w.id);
      if (!w.isDestroyed()) w.destroy();
    }
  }
}, 500);

// ── Main Window ──

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Baptist Console',
    icon: fs.existsSync(path.join(__dirname, 'icon.png')) ? path.join(__dirname, 'icon.png') : undefined,
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });
  hookMainWindowEscape();

  mainWindow.loadFile('index.html');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isPresentation = url.includes('presentation.html');
    const isEmpty = url === '' || url === 'about:blank';
    if (isPresentation || isEmpty) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          frame: false,
          fullscreenable: false,
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
    guardPresenterWindow(win);
    const placeOnDisplay = () => {
      if (win.isDestroyed()) return;
      let target = null;
      if (presenterDisplayId != null) {
        target = screen.getAllDisplays().find((d) => d.id === presenterDisplayId) || null;
      }
      const bounds = (target || screen.getPrimaryDisplay()).bounds;
      win.setBounds(bounds);
      win.focus();
    };
    if (win.webContents && typeof win.webContents.once === 'function') {
      win.webContents.once('did-finish-load', () => setTimeout(placeOnDisplay, 50));
    } else {
      placeOnDisplay();
    }
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

ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.on('presenter-close-window', (event) => {
  destroyPresenterWindow(BrowserWindow.fromWebContents(event.sender));
});

app.on('render-process-gone', (_event, win, details) => {
  console.error('Renderer process gone:', details.reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
