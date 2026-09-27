const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let presenterDisplayId = null;
const isDev = !app.isPackaged;

function getBundledHymnsPath() {
  // __dirname points inside app.asar when packaged (Electron patches fs), so
  // this resolves the bundled library correctly in both dev and prod.
  return path.join(__dirname, 'hymns', 'hymns.json');
}

function getUserHymnsPath() {
  return path.join(app.getPath('userData'), 'hymns', 'hymns.json');
}

function getHymnsPath() {
  return isDev ? getBundledHymnsPath() : getUserHymnsPath();
}

function ensureHymnsDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureUserHymnsFile() {
  const userPath = getUserHymnsPath();
  if (fs.existsSync(userPath)) return;
  try {
    const defaultData = fs.readFileSync(getBundledHymnsPath(), 'utf-8');
    ensureHymnsDir(userPath);
    fs.writeFileSync(userPath, defaultData, 'utf-8');
  } catch (e) {
    try {
      ensureHymnsDir(userPath);
      fs.writeFileSync(userPath, '[]', 'utf-8');
    } catch {
      // If even that fails, the app keeps running; reads will report the error.
    }
  }
}

// ── IPC Handlers ──

ipcMain.handle('get-displays', () => {
  const displays = screen.getAllDisplays();
  return displays.map((d) => ({
    id: d.id,
    isPrimary: d.isPrimary,
    label: (d.label || '').trim(),
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
    if (!isDev) ensureUserHymnsFile();
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
    const filePath = getHymnsPath();
    ensureHymnsDir(filePath);
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

// ── In-app updates ──

const UPDATE_STATE_FILE = () => path.join(app.getPath('userData'), 'update-state.json');

let updaterState = {
  checking: false,
  downloading: false,
  available: false,
  version: null,
  downloaded: false,
  error: null,
  notify: false,
};

// Version "seen" so a release only notifies once — survives restarts. The
// launch banner and the "Not now" button both write this marker; a *newer*
// release always differs and gets its own notification.
let seenVersion = null;
let notifiedFor = null;

function loadSeenVersion() {
  try {
    const data = JSON.parse(fs.readFileSync(UPDATE_STATE_FILE(), 'utf-8'));
    seenVersion = data && typeof data.version === 'string' ? data.version : null;
  } catch (e) {
    seenVersion = null;
  }
}

function saveSeenVersion() {
  try {
    fs.writeFileSync(UPDATE_STATE_FILE(), JSON.stringify({ version: seenVersion }), 'utf-8');
  } catch (e) {
    /* non-fatal */
  }
}

function getUpdaterState() {
  return Object.assign({}, updaterState);
}

function broadcastUpdaterState() {
  const payload = getUpdaterState();
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed() && w.webContents && !w.webContents.isDestroyed()) {
      w.webContents.send('update:status', payload);
    }
  }
}

function setUpdaterState(patch) {
  updaterState = Object.assign({}, updaterState, patch);
  broadcastUpdaterState();
}

function broadcastUpdateReady(version) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed() && w.webContents && !w.webContents.isDestroyed()) {
      w.webContents.send('update:ready', { version: version || updaterState.version || 'latest' });
    }
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    setUpdaterState({ checking: true, error: null });
  });

  autoUpdater.on('update-available', (info) => {
    const version = info && typeof info.version === 'string' ? info.version : null;
    if (!version || version === app.getVersion()) {
      // Defensive: without a real, distinct version there is nothing to announce.
      setUpdaterState({ checking: false, available: false, version: null, downloaded: false, notify: false, error: null });
      return;
    }
    const notify = seenVersion !== version && notifiedFor !== version;
    if (notify) {
      notifiedFor = version;
      seenVersion = version;
      saveSeenVersion();
    }
    setUpdaterState({ checking: false, available: true, version, downloaded: false, notify, error: null });
    if (notify) {
      console.log('[updater] update v' + version + ' available');
    }
  });

  autoUpdater.on('update-not-available', () => {
    setUpdaterState({ checking: false, available: false, version: null, downloaded: false, notify: false, error: null });
  });

  autoUpdater.on('download-progress', () => {
    setUpdaterState({ checking: false, downloading: true, notify: false });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const version = info && info.version ? info.version : updaterState.version;
    setUpdaterState({ downloading: false, downloaded: true, notify: false });
    broadcastUpdateReady(version);
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err && err.message ? err.message : err);
    setUpdaterState({ checking: false, downloading: false, error: err && err.message ? err.message : String(err) });
  });
}

ipcMain.handle('update:get-state', () => getUpdaterState());

ipcMain.handle('update:check', async () => {
  if (isDev) {
    setUpdaterState({ checking: false, available: false, error: 'Updates are disabled in development mode.' });
    return getUpdaterState();
  }
  try {
    loadSeenVersion();
    setUpdaterState({ checking: true, error: null });
    await autoUpdater.checkForUpdates();
  } catch (e) {
    setUpdaterState({ checking: false, error: e && e.message ? e.message : String(e) });
  }
  return getUpdaterState();
});

ipcMain.handle('update:download', async () => {
  if (isDev) {
    return { ok: false, error: 'Updates are disabled in development mode.' };
  }
  if (!updaterState.available) {
    return { ok: false, error: 'No update available.' };
  }
  if (updaterState.downloaded || updaterState.downloading) {
    return { ok: true, alreadyStarted: true };
  }
  try {
    setUpdaterState({ downloading: true, notify: false });
    const result = await autoUpdater.downloadUpdate();
    if (result) {
      setUpdaterState({ downloading: false, downloaded: true, notify: false });
    }
    return { ok: true };
  } catch (e) {
    setUpdaterState({ downloading: false, error: e && e.message ? e.message : String(e) });
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.on('update:defer', () => {
  if (updaterState.version) {
    seenVersion = updaterState.version;
    saveSeenVersion();
  }
  setUpdaterState({ notify: false });
});

ipcMain.on('update:restart', () => {
  if (isDev) return;
  if (updaterState.downloaded) {
    autoUpdater.quitAndInstall(false, true);
  } else {
    app.relaunch();
    app.quit();
  }
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

  mainWindow.webContents.on('did-create-window', (win, details) => {
    guardPresenterWindow(win);
    const findWindowDisplay = () => {
      try {
        const frameName = (details && details.frameName) || '';
        const nameMatch = frameName.match(/^(?:bible-presenter|HymnPresentation)-d(\d+)$/);
        if (nameMatch) {
          const byName = screen.getAllDisplays().find((d) => d.id === Number(nameMatch[1]));
          if (byName) return byName;
        }
        let url = '';
        try {
          url = win.webContents && win.webContents.getURL ? win.webContents.getURL() : '';
        } catch (_e) { url = ''; }
        const urlMatch = url.match(/[?&]display=(\d+)/);
        if (urlMatch) {
          const byUrl = screen.getAllDisplays().find((d) => d.id === Number(urlMatch[1]));
          if (byUrl) return byUrl;
        }
      } catch (_e) { /* fall through to global + primary */ }
      if (presenterDisplayId != null) {
        return screen.getAllDisplays().find((d) => d.id === presenterDisplayId) || null;
      }
      return null;
    };
    const placeOnDisplay = () => {
      if (win.isDestroyed()) return;
      const target = findWindowDisplay();
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
  if (!isDev) ensureUserHymnsFile();
  loadSeenVersion();
  createMainWindow();
  setupAutoUpdater();

  if (!isDev) {
    // Check for updates shortly after launch, then again later in quiet periods.
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => {
        console.error('[updater] initial check failed:', e && e.message ? e.message : e);
      });
    }, 2000);
  }

  let displaysChangeTimer = null;
  const broadcastDisplaysChanged = () => {
    clearTimeout(displaysChangeTimer);
    displaysChangeTimer = setTimeout(() => {
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed() && w.webContents && !w.webContents.isDestroyed()) {
          w.webContents.send('displays-changed');
        }
      }
    }, 200);
  };
  screen.on('display-added', broadcastDisplaysChanged);
  screen.on('display-removed', broadcastDisplaysChanged);

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