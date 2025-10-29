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

const withPrinter = (options = {}, handler) => {
  const vendorId = normalizeUsbId(options.vendorId);
  const productId = normalizeUsbId(options.productId);

  const device = vendorId !== undefined && productId !== undefined
    ? new escpos.USB(vendorId, productId)
    : new escpos.USB();

  return new Promise((resolve, reject) => {
    device.open((deviceErr) => {
      if (deviceErr) {
        reject(new Error(`Unable to open printer device: ${deviceErr.message}`));
        return;
      }

      const printer = new escpos.Printer(device);
      const finalize = (finalErr) => {
        try {
          printer.close();
        } catch (_) {
          // Ignore close errors, nothing else to do.
        }
        if (finalErr) {
          reject(finalErr);
        } else {
          resolve();
        }
      };

      try {
        Promise.resolve(handler(printer))
          .then(() => finalize())
          .catch((err) => finalize(new Error(err.message || String(err))));
      } catch (err) {
        finalize(new Error(err.message || String(err)));
      }
    });
  });
};

/**
 * Attempt to open the cash drawer connected via ESC/POS printer.
 * @param {object} options
 * @param {number|string} [options.vendorId] Optional USB vendor id.
 * @param {number|string} [options.productId] Optional USB product id.
 * @returns {Promise<void>}
 */
async function openDrawer(options = {}) {
  // ESC/POS cash drawer pin 2 (Kick-out connector).
  const CASH_DRAWER_PIN = options.drawerPin === 5 ? 5 : 2;

  return withPrinter(options, (printer) => {
    printer.cashdraw(CASH_DRAWER_PIN);
  });
}

const toHexId = (value) => `0x${value.toString(16).padStart(4, '0')}`;

const listDevices = () => {
  try {
    const finder = typeof escpos.USB.findPrinter === 'function'
      ? escpos.USB.findPrinter
      : typeof escpos.USB.findPrinters === 'function'
        ? escpos.USB.findPrinters
        : null;

    let devices = [];
    if (finder) {
      const result = finder.call(escpos.USB);
      if (Array.isArray(result)) {
        devices = result;
      }
    }
    return devices.map((device) => {
      const { idVendor, idProduct } = device.deviceDescriptor;
      return {
        vendorId: idVendor,
        productId: idProduct,
        vendorIdHex: toHexId(idVendor),
        productIdHex: toHexId(idProduct),
        busNumber: device.busNumber,
        deviceAddress: device.deviceAddress,
      };
    });
  } catch (error) {
    throw new Error(`Unable to enumerate USB printers: ${error.message}`);
  }
};

const printDemoReceipt = async (options = {}) => {
  const now = new Date();
  return withPrinter(options, (printer) => {
    printer.align('ct');
    printer.text('Salon POS Demo');
    printer.text('----------------');
    printer.align('lt');
    printer.text(`Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    printer.text('Stylist: Demo User');
    printer.text(' ');
    printer.text('Service             Price');
    printer.text('------------------------');
    printer.text('Haircut             $25.00');
    printer.text('Shampoo             $10.00');
    printer.text(' ');
    printer.text('Subtotal:           $35.00');
    printer.text('Tax (10%):          $3.50');
    printer.text('Total:              $38.50');
    printer.feed(2);
    printer.align('ct');
    printer.text('Thank you for visiting!');
    printer.feed(3);
    printer.cut();
    printer.cashdraw(options.drawerPin === 5 ? 5 : 2);
  });
};

module.exports = {
  openDrawer,
  listDevices,
  printDemoReceipt,
};
