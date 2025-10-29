const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cashDrawer', {
  /**
   * Trigger the cash drawer to open.
   * @param {object} [options]
   * @param {number|string} [options.vendorId]
   * @param {number|string} [options.productId]
   * @param {number} [options.drawerPin] Defaults to pin 2, pass 5 for the alternate wiring.
   */
  open: async (options) => {
    const response = await ipcRenderer.invoke('cashDrawer:open', options);
    if (!response.ok) {
      throw new Error(response.message ?? 'Unable to open the cash drawer');
    }
    return response;
  },
  listDevices: async () => {
    const response = await ipcRenderer.invoke('cashDrawer:listDevices');
    if (!response.ok) {
      throw new Error(response.message ?? 'Unable to list USB devices');
    }
    return response.devices;
  },
  demoReceipt: async (options) => {
    const response = await ipcRenderer.invoke('cashDrawer:demoReceipt', options);
    if (!response.ok) {
      throw new Error(response.message ?? 'Unable to run demo receipt');
    }
    return response;
  },
});

contextBridge.exposeInMainWorld('appSettings', {
  get: async () => {
    const response = await ipcRenderer.invoke('app:getSettings');
    if (!response.ok) {
      throw new Error(response.message ?? 'Unable to read application settings');
    }
    return response.settings;
  },
  update: async (partial) => {
    const response = await ipcRenderer.invoke('app:updateSettings', partial);
    if (!response.ok) {
      throw new Error(response.message ?? 'Unable to update application settings');
    }
    return response.settings;
  },
});
