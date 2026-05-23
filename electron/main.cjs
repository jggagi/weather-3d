const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;

function createWindow() {
  // Determine if the app is running in development mode
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',      // Native macOS traffic lights inset into content
    vibrancy: 'under-window',          // macOS native blur behind the window
    visualEffectState: 'active',
    transparent: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,   // Show after ready-to-show to avoid flash
  });

  // Graceful show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    // In dev, load from the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Uncomment the next line to open devtools in dev:
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS: re-create window when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow);
