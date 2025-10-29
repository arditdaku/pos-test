const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { openDrawer, listDevices, printDemoReceipt } = require('./cashDrawer');
const { getSettings, updateSettings } = require('./config');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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

ipcMain.handle('cashDrawer:listDevices', async () => {
  try {
    const devices = listDevices();
    return { ok: true, devices };
  } catch (error) {
    console.error('Failed to list devices:', error);
    return { ok: false, message: error.message };
  }
});

ipcMain.handle('cashDrawer:demoReceipt', async (_event, payload) => {
  try {
    await printDemoReceipt(payload);
    return { ok: true };
  } catch (error) {
    console.error('Failed to run demo receipt:', error);
    return { ok: false, message: error.message };
  }
});

ipcMain.handle('app:getSettings', async () => {
  try {
    const settings = getSettings();
    return { ok: true, settings };
  } catch (error) {
    console.error('Failed to read settings:', error);
    return { ok: false, message: error.message };
  }
});

ipcMain.handle('app:updateSettings', async (_event, partialSettings) => {
  try {
    const nextSettings = updateSettings(partialSettings);
    return { ok: true, settings: nextSettings };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { ok: false, message: error.message };
  }
});

app.whenReady().then(() => {
  getSettings(); // Warm cache and ensure config file exists.
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
