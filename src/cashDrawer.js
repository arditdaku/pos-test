const escpos = require('escpos');
// Bind escpos to USB transport.
escpos.USB = require('escpos-usb');

/**
 * Normalize vendor/product IDs coming in from the renderer.
 * Accepts decimal numbers or hexadecimal strings (e.g. "0x0416").
 */
const normalizeUsbId = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.startsWith('0x')) {
      return parseInt(trimmed, 16);
    }
    return Number(trimmed);
  }

  throw new TypeError(`Unsupported USB id type: ${typeof value}`);
};

/**
 * Attempt to open the cash drawer connected via ESC/POS printer.
 * @param {object} options
 * @param {number|string} [options.vendorId] Optional USB vendor id.
 * @param {number|string} [options.productId] Optional USB product id.
 * @returns {Promise<void>}
 */
async function openDrawer(options = {}) {
  const vendorId = normalizeUsbId(options.vendorId);
  const productId = normalizeUsbId(options.productId);

  const device = vendorId !== undefined && productId !== undefined
    ? new escpos.USB(vendorId, productId)
    : new escpos.USB();

  const printer = new escpos.Printer(device);
  // ESC/POS cash drawer pin 2 (Kick-out connector).
  const CASH_DRAWER_PIN = options.drawerPin === 5 ? 5 : 2;

  return new Promise((resolve, reject) => {
    device.open((deviceErr) => {
      if (deviceErr) {
        reject(new Error(`Unable to open printer device: ${deviceErr.message}`));
        return;
      }

      try {
        printer.cashdraw(CASH_DRAWER_PIN);
        printer.close();
        resolve();
      } catch (err) {
        reject(new Error(`Failed to trigger cash drawer: ${err.message}`));
      }
    });
  });
}

module.exports = {
  openDrawer,
};
