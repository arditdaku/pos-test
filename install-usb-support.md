# USB Printer Support Setup for Windows

## The Issue

The error `usb.on is not a function` occurs because the USB module cannot properly access USB devices on Windows without the correct drivers.

## Quick Fix

1. First, install stable versions of the packages:
   ```bash
   npm uninstall escpos escpos-usb
   npm install escpos@2.5.2 escpos-usb@2.1.1
   ```

## For Full USB Support

### Step 1: Install Zadig

1. Download Zadig from: https://zadig.akeo.ie/
2. Run Zadig as Administrator
3. Go to Options → List All Devices
4. Find your printer in the list (e.g., "Epson TM-T20III")
5. Select "WinUSB" or "libusb-win32" as the driver
6. Click "Install Driver" or "Replace Driver"

### Step 2: Rebuild Native Dependencies

```bash
cd c:\Users\ardit\Developer\pos
npm rebuild
```

### Step 3: Alternative - Use Serial/Network Connection

If USB continues to cause issues, consider using:

- **Serial Connection**: Use `escpos-serialport` instead of `escpos-usb`
- **Network Connection**: Use `escpos-network` for network-connected printers

## Testing

After setup, test the connection:

```bash
npm start
```

## Troubleshooting

- Ensure the printer is powered on and connected via USB
- Try different USB ports
- Check Windows Device Manager for driver issues
- Run the application as Administrator if needed
