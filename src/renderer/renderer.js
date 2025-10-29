const form = document.querySelector('#cashDrawerForm');
const vendorIdInput = document.querySelector('#vendorId');
const productIdInput = document.querySelector('#productId');
const drawerPinSelect = document.querySelector('#drawerPin');
const statusMessage = document.querySelector('#statusMessage');
const openButton = document.querySelector('#openDrawerButton');

const setStatus = (message, variant) => {
  statusMessage.textContent = message ?? '';
  statusMessage.classList.remove('status--success', 'status--error');
  if (variant === 'success') {
    statusMessage.classList.add('status--success');
  }
  if (variant === 'error') {
    statusMessage.classList.add('status--error');
  }
};

const sanitizeValue = (input) => {
  if (input === undefined || input === null) {
    return undefined;
  }
  const value = String(input).trim();
  return value.length > 0 ? value : undefined;
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Opening cash drawer…');
  openButton.disabled = true;

  try {
    const payload = {
      vendorId: sanitizeValue(vendorIdInput.value),
      productId: sanitizeValue(productIdInput.value),
      drawerPin: Number(drawerPinSelect.value),
    };

    await window.cashDrawer.open(payload);
    setStatus('Cash drawer opened successfully.', 'success');
  } catch (error) {
    setStatus(error.message || 'Failed to open the cash drawer.', 'error');
  } finally {
    openButton.disabled = false;
  }
});
