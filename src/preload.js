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
});
