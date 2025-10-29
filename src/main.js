const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { openDrawer } = require('./cashDrawer');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    win.loadURL(startUrl);
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }
}

ipcMain.handle('cashDrawer:open', async (_event, payload) => {
  try {
    await openDrawer(payload);
    return { ok: true };
  } catch (error) {
    console.error('Failed to open cash drawer:', error);
    return { ok: false, message: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
