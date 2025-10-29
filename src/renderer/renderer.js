const titleEl = document.querySelector('#viewTitle');
const subtitleEl = document.querySelector('#viewSubtitle');
const contentEl = document.querySelector('#viewContent');

const toHexId = (value) => `0x${value.toString(16).padStart(4, '0')}`;

const enrichDevice = (device) => ({
  ...device,
  vendorIdHex: device.vendorIdHex ?? toHexId(device.vendorId),
  productIdHex: device.productIdHex ?? toHexId(device.productId),
});

const state = {
  view: 'wizard', // 'wizard' | 'dashboard'
  stepIndex: 0,
  settings: null,
  devices: [],
  selectedDevice: null,
  drawerPin: 2,
  isListing: false,
  isTesting: false,
  isCompleting: false,
  listError: null,
  testStatus: null,
  testStatusVariant: null,
  demoSucceeded: false,
  dashboardStatus: null,
  dashboardStatusVariant: null,
};

const WIZARD_STEPS = [
  {
    title: 'Welcome',
    subtitle: 'We will help you connect your receipt printer and cash drawer.',
    render: (root) => renderWelcomeStep(root),
  },
  {
    title: 'Select Printer',
    subtitle: 'Choose the USB printer that controls your cash drawer.',
    render: (root) => renderSelectDeviceStep(root),
  },
  {
    title: 'Run Demo',
    subtitle: 'Print a sample receipt and confirm the drawer opens.',
    render: (root) => renderDemoStep(root),
  },
  {
    title: 'All Set',
    subtitle: 'Your POS is ready to go.',
    render: (root) => renderFinishedStep(root),
  },
];

const createParagraph = (text, className) => {
  const p = document.createElement('p');
  if (className) {
    p.className = className;
  }
  p.textContent = text;
  return p;
};

const createButton = (label, options = {}) => {
  const button = document.createElement('button');
  button.type = options.type ?? 'button';
  button.className = 'button';
  if (options.variant === 'secondary') {
    button.classList.add('button--secondary');
  }
  button.textContent = label;
  if (options.disabled) {
    button.disabled = true;
  }
  return button;
};

const renderStepIndicator = () => {
  const indicator = document.createElement('div');
  indicator.className = 'step-bubbles';
  WIZARD_STEPS.forEach((_, index) => {
    const bubble = document.createElement('div');
    bubble.className = 'step-bubble';
    if (index <= state.stepIndex) {
      bubble.classList.add('step-bubble--active');
    }
    bubble.textContent = index + 1;
    indicator.appendChild(bubble);
  });
  return indicator;
};

const setStep = (stepIndex) => {
  state.stepIndex = stepIndex;
  if (stepIndex === 1) {
    loadDevices();
  }
  render();
};

const renderWelcomeStep = (root) => {
  root.appendChild(
    createParagraph(
      'We will walk through detecting your receipt printer, testing a demo print, and storing the configuration for everyday use.'
    )
  );
  root.appendChild(
    createParagraph(
      'Make sure the Epson TM-T20III is connected via USB and powered on before continuing.',
      'info-text'
    )
  );

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  const startButton = createButton('Start Setup');
  startButton.addEventListener('click', () => setStep(1));
  buttonRow.appendChild(startButton);
  root.appendChild(buttonRow);
};

const loadDevices = async () => {
  state.isListing = true;
  state.listError = null;
  render();
  try {
    const devices = await window.cashDrawer.listDevices();
    state.devices = devices.map(enrichDevice);

    if (state.selectedDevice) {
      const stillPresent = state.devices.find(
        (device) =>
          device.vendorId === state.selectedDevice.vendorId &&
          device.productId === state.selectedDevice.productId
      );
      if (!stillPresent) {
        state.selectedDevice = null;
      }
    }
  } catch (error) {
    state.listError = error.message || 'Unable to enumerate USB printers.';
  } finally {
    state.isListing = false;
    render();
  }
};

const renderSelectDeviceStep = (root) => {
  root.appendChild(
    createParagraph(
      'Select the printer that will control your cash drawer. If you do not see it, confirm the USB cable is connected and click refresh.'
    )
  );

  const refreshRow = document.createElement('div');
  refreshRow.className = 'button-row button-row--spread';
  refreshRow.appendChild(createParagraph('Detected devices', null));

  const refreshButton = createButton('Refresh', { variant: 'secondary' });
  refreshButton.disabled = state.isListing;
  refreshButton.addEventListener('click', () => loadDevices());
  refreshRow.appendChild(refreshButton);
  root.appendChild(refreshRow);

  const list = document.createElement('div');
  list.className = 'device-list';

  if (state.isListing) {
    const loader = document.createElement('div');
    loader.className = 'loader';
    list.appendChild(loader);
  } else if (state.devices.length === 0) {
    list.appendChild(
      createParagraph(
        'No compatible USB devices found. Install the WinUSB/libusb driver with Zadig, then click refresh.',
        'info-text'
      )
    );
  } else {
    state.devices.forEach((device) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'device-card';
      if (
        state.selectedDevice &&
        state.selectedDevice.vendorId === device.vendorId &&
        state.selectedDevice.productId === device.productId
      ) {
        card.classList.add('device-card--selected');
      }
      const title = document.createElement('h3');
      title.className = 'device-card__title';
      title.textContent = `${device.vendorIdHex} • ${device.productIdHex}`;
      const meta = document.createElement('p');
      meta.className = 'device-card__meta';
      meta.textContent = `Bus ${device.busNumber ?? '-'} • Address ${
        device.deviceAddress ?? '-'
      }`;

      card.appendChild(title);
      card.appendChild(meta);
      card.addEventListener('click', () => {
        state.selectedDevice = { ...device };
        render();
      });
      list.appendChild(card);
    });
  }

  root.appendChild(list);

  if (state.listError) {
    const error = createParagraph(state.listError, 'status status--error');
    root.appendChild(error);
  }

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  const backButton = createButton('Back', { variant: 'secondary' });
  backButton.addEventListener('click', () => setStep(0));

  const nextButton = createButton('Continue');
  nextButton.disabled = !state.selectedDevice;
  nextButton.addEventListener('click', () => setStep(2));

  buttonRow.appendChild(backButton);
  buttonRow.appendChild(nextButton);
  root.appendChild(buttonRow);
};

const runDemo = async () => {
  if (!state.selectedDevice) {
    return;
  }
  state.isTesting = true;
  state.testStatus = 'Printing demo receipt and opening drawer…';
  state.testStatusVariant = null;
  state.demoSucceeded = false;
  render();

  try {
    await window.cashDrawer.demoReceipt({
      vendorId: state.selectedDevice.vendorId,
      productId: state.selectedDevice.productId,
      drawerPin: state.drawerPin,
    });
    state.testStatus = 'Success! Receipt printed and drawer opened.';
    state.testStatusVariant = 'success';
    state.demoSucceeded = true;
  } catch (error) {
    state.testStatus = error.message || 'Failed to run demo receipt.';
    state.testStatusVariant = 'error';
  } finally {
    state.isTesting = false;
    render();
  }
};

const renderDemoStep = (root) => {
  if (!state.selectedDevice) {
    root.appendChild(
      createParagraph(
        'Select a printer first so we know which device to test.',
        'status status--error'
      )
    );
    const backButton = createButton('Back', { variant: 'secondary' });
    backButton.addEventListener('click', () => setStep(1));
    const row = document.createElement('div');
    row.className = 'button-row';
    row.appendChild(backButton);
    root.appendChild(row);
    return;
  }

  const details = document.createElement('div');
  details.className = 'device-card device-card--selected';
  const title = document.createElement('h3');
  title.className = 'device-card__title';
  title.textContent = `${state.selectedDevice.vendorIdHex} • ${state.selectedDevice.productIdHex}`;
  const meta = document.createElement('p');
  meta.className = 'device-card__meta';
  meta.textContent = `Bus ${state.selectedDevice.busNumber ?? '-'} • Address ${
    state.selectedDevice.deviceAddress ?? '-'
  }`;
  details.appendChild(title);
  details.appendChild(meta);
  root.appendChild(details);

  const pinLabel = document.createElement('label');
  pinLabel.textContent = 'Drawer kick pin';
  const pinSelect = document.createElement('select');
  [2, 5].forEach((pin) => {
    const option = document.createElement('option');
    option.value = String(pin);
    option.textContent = pin === 2 ? 'Pin 2 (default wiring)' : 'Pin 5';
    if (state.drawerPin === pin) {
      option.selected = true;
    }
    pinSelect.appendChild(option);
  });
  pinSelect.addEventListener('change', (event) => {
    state.drawerPin = Number(event.target.value);
  });

  const pinField = document.createElement('div');
  pinField.className = 'field';
  pinField.appendChild(pinLabel);
  pinField.appendChild(pinSelect);
  root.appendChild(pinField);

  if (state.testStatus) {
    const statusEl = createParagraph(state.testStatus, 'status');
    if (state.testStatusVariant === 'success') {
      statusEl.classList.add('status--success');
    }
    if (state.testStatusVariant === 'error') {
      statusEl.classList.add('status--error');
    }
    root.appendChild(statusEl);
  }

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';

  const backButton = createButton('Back', { variant: 'secondary' });
  backButton.addEventListener('click', () => setStep(1));
  const testButton = createButton('Print Demo & Open Drawer');
  testButton.disabled = state.isTesting;
  testButton.addEventListener('click', runDemo);
  const finishButton = createButton('Finish Setup');
  finishButton.disabled = !state.demoSucceeded || state.isCompleting;
  finishButton.addEventListener('click', () => completeSetup());

  buttonRow.appendChild(backButton);
  buttonRow.appendChild(testButton);
  buttonRow.appendChild(finishButton);
  root.appendChild(buttonRow);
};

const completeSetup = async () => {
  if (!state.selectedDevice || !state.demoSucceeded || state.isCompleting) {
    return;
  }
  state.isCompleting = true;
  render();
  try {
    const printerConfig = {
      vendorId: state.selectedDevice.vendorId,
      productId: state.selectedDevice.productId,
      vendorIdHex: state.selectedDevice.vendorIdHex,
      productIdHex: state.selectedDevice.productIdHex,
      busNumber: state.selectedDevice.busNumber,
      deviceAddress: state.selectedDevice.deviceAddress,
      drawerPin: state.drawerPin,
    };
    const settings = await window.appSettings.update({
      printer: printerConfig,
      isSetupComplete: true,
    });
    state.settings = settings;
    state.selectedDevice = enrichDevice(settings.printer);
    state.drawerPin = settings.printer?.drawerPin ?? 2;
    state.selectedDevice.drawerPin = state.drawerPin;
    setStep(3);
  } catch (error) {
    state.testStatus = error.message || 'Failed to save configuration.';
    state.testStatusVariant = 'error';
  } finally {
    state.isCompleting = false;
    render();
  }
};

const renderFinishedStep = (root) => {
  root.appendChild(
    createParagraph(
      'Setup complete! Your salon POS can now print and open the cash drawer.',
      'status status--success'
    )
  );
  root.appendChild(
    createParagraph(
      'You can access these settings again from the main dashboard if you ever replace the printer or cash drawer.'
    )
  );

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  const goButton = createButton('Go to Dashboard');
  goButton.addEventListener('click', () => {
    state.view = 'dashboard';
    state.demoSucceeded = false;
    state.testStatus = null;
    state.testStatusVariant = null;
    render();
  });
  buttonRow.appendChild(goButton);
  root.appendChild(buttonRow);
};

const renderDashboard = () => {
  titleEl.textContent = 'Salon POS';
  subtitleEl.textContent = 'Your printer and cash drawer are ready.';
  contentEl.innerHTML = '';

  if (!state.selectedDevice) {
    contentEl.appendChild(
      createParagraph(
        'No printer configuration found. Let’s run the setup wizard.',
        'status status--error'
      )
    );
    const row = document.createElement('div');
    row.className = 'button-row';
    const setupButton = createButton('Start Setup');
    setupButton.addEventListener('click', () => {
      state.view = 'wizard';
      setStep(0);
    });
    row.appendChild(setupButton);
    contentEl.appendChild(row);
    return;
  }

  const summary = document.createElement('div');
  summary.className = 'device-card device-card--selected';
  const title = document.createElement('h3');
  title.className = 'device-card__title';
  title.textContent = `${state.selectedDevice.vendorIdHex} • ${state.selectedDevice.productIdHex}`;
  const meta = document.createElement('p');
  meta.className = 'device-card__meta';
  meta.textContent = `Drawer pin ${state.selectedDevice.drawerPin ?? 2} • Bus ${
    state.selectedDevice.busNumber ?? '-'
  } • Address ${state.selectedDevice.deviceAddress ?? '-'}`;
  summary.appendChild(title);
  summary.appendChild(meta);
  contentEl.appendChild(summary);

  if (state.dashboardStatus) {
    const statusEl = createParagraph(state.dashboardStatus, 'status');
    if (state.dashboardStatusVariant === 'success') {
      statusEl.classList.add('status--success');
    }
    if (state.dashboardStatusVariant === 'error') {
      statusEl.classList.add('status--error');
    }
    contentEl.appendChild(statusEl);
  }

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  const openDrawerButton = createButton('Open Cash Drawer');
  openDrawerButton.addEventListener('click', () =>
    handleDashboardAction('openDrawer')
  );
  const demoButton = createButton('Print Demo');
  demoButton.addEventListener('click', () =>
    handleDashboardAction('demoReceipt')
  );
  const rerunButton = createButton('Re-run Setup', { variant: 'secondary' });
  rerunButton.addEventListener('click', () => {
    state.view = 'wizard';
    state.demoSucceeded = false;
    state.testStatus = null;
    state.testStatusVariant = null;
    state.listError = null;
    setStep(1);
  });

  buttonRow.appendChild(openDrawerButton);
  buttonRow.appendChild(demoButton);
  buttonRow.appendChild(rerunButton);
  contentEl.appendChild(buttonRow);
};

const handleDashboardAction = async (actionType) => {
  if (!state.selectedDevice) {
    return;
  }

  const payload = {
    vendorId: state.selectedDevice.vendorId,
    productId: state.selectedDevice.productId,
    drawerPin: state.selectedDevice.drawerPin ?? 2,
  };

  try {
    if (actionType === 'openDrawer') {
      state.dashboardStatus = 'Opening cash drawer…';
      state.dashboardStatusVariant = null;
      render();
      await window.cashDrawer.open(payload);
      state.dashboardStatus = 'Cash drawer opened successfully.';
      state.dashboardStatusVariant = 'success';
    } else if (actionType === 'demoReceipt') {
      state.dashboardStatus = 'Printing demo receipt…';
      state.dashboardStatusVariant = null;
      render();
      await window.cashDrawer.demoReceipt(payload);
      state.dashboardStatus = 'Demo receipt printed and drawer opened.';
      state.dashboardStatusVariant = 'success';
    }
  } catch (error) {
    state.dashboardStatus = error.message || 'Operation failed.';
    state.dashboardStatusVariant = 'error';
  } finally {
    render();
  }
};

const render = () => {
  if (state.view === 'dashboard') {
    renderDashboard();
    return;
  }

  const currentStep = WIZARD_STEPS[state.stepIndex];
  titleEl.textContent = currentStep.title;
  subtitleEl.textContent = currentStep.subtitle;

  contentEl.innerHTML = '';
  contentEl.appendChild(renderStepIndicator());
  const stepContent = document.createElement('div');
  currentStep.render(stepContent);
  contentEl.appendChild(stepContent);
};

const initialize = async () => {
  try {
    const settings = await window.appSettings.get();
    state.settings = settings;
    if (settings.isSetupComplete && settings.printer) {
      state.selectedDevice = enrichDevice(settings.printer);
      state.drawerPin = settings.printer.drawerPin ?? 2;
      state.selectedDevice.drawerPin = state.drawerPin;
      state.view = 'dashboard';
    } else {
      state.view = 'wizard';
      state.stepIndex = 0;
    }
  } catch (error) {
    state.view = 'wizard';
    state.stepIndex = 0;
    state.listError =
      error.message || 'Unable to load existing configuration.';
  } finally {
    render();
    if (state.view === 'wizard' && state.stepIndex === 1) {
      loadDevices();
    }
  }
};

initialize();
